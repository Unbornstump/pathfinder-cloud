from django.conf import settings
from django.contrib.auth.models import User
from django.db.models import Count
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from matching_engine.engine import promote_match_state, recompute_matches_for_profile
from surface.feed import build_match_feed, serialize_move
from user_vector.signal_processor import record_signal

from .auth_cookies import clear_refresh_cookie, set_refresh_cookie, tokens_for_user
from .dust import suggest_from_message
from .models import (
    AuthProvider,
    Match,
    MatchState,
    Move,
    Notification,
    Opportunity,
    SignalAction,
    UserProfile,
)
from .serializers import (
    NotificationSerializer,
    OpportunitySerializer,
    RegisterSerializer,
    UserProfileSerializer,
)


def get_profile(user) -> UserProfile:
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile


class CookieTokenObtainPairView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200 and "refresh" in response.data:
            refresh = response.data.pop("refresh")
            set_refresh_cookie(response, refresh)
        return response


class CookieTokenRefreshView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        data = request.data.copy() if hasattr(request.data, "copy") else {}
        if not data.get("refresh"):
            cookie = request.COOKIES.get(settings.REFRESH_TOKEN_COOKIE)
            if cookie:
                data["refresh"] = cookie
        serializer = self.get_serializer(data=data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as exc:
            raise InvalidToken(exc.args[0]) from exc

        response = Response(serializer.validated_data, status=status.HTTP_200_OK)
        if "refresh" in response.data:
            refresh = response.data.pop("refresh")
            set_refresh_cookie(response, refresh)
        elif data.get("refresh"):
            set_refresh_cookie(response, data["refresh"])
        return response


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        cookie = request.COOKIES.get(settings.REFRESH_TOKEN_COOKIE)
        if cookie:
            try:
                token = RefreshToken(cookie)
                token.blacklist()
            except TokenError:
                pass
        response = Response({"detail": "Logged out."})
        clear_refresh_cookie(response)
        return response


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        access, refresh = tokens_for_user(user)
        response = Response(
            {
                "access": access,
                "user": {
                    "username": user.username,
                    "email": user.email,
                },
            },
            status=status.HTTP_201_CREATED,
        )
        set_refresh_cookie(response, refresh)
        return response


class GoogleAuthView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        if not settings.GOOGLE_CLIENT_ID:
            return Response(
                {
                    "detail": (
                        "Google sign-in is not configured. "
                        "Set GOOGLE_CLIENT_ID in the backend environment."
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        credential = request.data.get("credential")
        if not credential:
            return Response(
                {"detail": "Missing Google credential."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            info = google_id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )
        except ValueError:
            return Response(
                {"detail": "Invalid Google credential."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = info.get("email")
        if not email:
            return Response(
                {"detail": "Google account did not provide an email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        google_sub = info.get("sub")
        username = f"google_{google_sub}" if google_sub else email.split("@")[0]
        user = User.objects.filter(email__iexact=email).first()
        created = False
        if not user:
            base = username
            n = 0
            while User.objects.filter(username=username).exists():
                n += 1
                username = f"{base}_{n}"
            user = User.objects.create_user(
                username=username,
                email=email,
                password=User.objects.make_random_password(),
            )
            created = True

        profile = get_profile(user)
        profile.auth_provider = AuthProvider.GOOGLE
        if not profile.name and info.get("name"):
            profile.name = info["name"]
        profile.save()

        access, refresh = tokens_for_user(user)
        response = Response(
            {
                "access": access,
                "user": {"username": user.username, "email": user.email},
                "created": created,
            }
        )
        set_refresh_cookie(response, refresh)
        return response


class ConfigView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {
                "google_client_id": settings.GOOGLE_CLIENT_ID or None,
                "google_enabled": bool(settings.GOOGLE_CLIENT_ID),
            }
        )


class ProfileView(APIView):
    def get(self, request):
        profile = get_profile(request.user)
        return Response(UserProfileSerializer(profile).data)

    def put(self, request):
        profile = get_profile(request.user)
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class DustView(APIView):
    """Conversational profile assistant — returns suggestions only; never writes the profile."""

    def post(self, request):
        message = (request.data.get("message") or "").strip()
        if not message:
            return Response(
                {"detail": "Message is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        profile = get_profile(request.user)
        result = suggest_from_message(message, profile)
        return Response(result)


class OpportunityListView(generics.ListAPIView):
    """Ops browse — not the primary product feed (use /opportunities/matched/)."""

    serializer_class = OpportunitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Opportunity.objects.exclude(status="expired")
        category = self.request.query_params.get("category") or self.request.query_params.get(
            "type"
        )
        field = self.request.query_params.get("field")
        location = self.request.query_params.get("location")
        if category:
            qs = qs.filter(category=category)
        if location:
            qs = qs.filter(location__icontains=location)
        if field:
            matching_ids = [
                o.id
                for o in qs
                if field.lower() in {str(t).lower() for t in (o.tags or [])}
            ]
            qs = qs.filter(id__in=matching_ids)
        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        profile = get_profile(self.request.user)
        qs = self.filter_queryset(self.get_queryset())
        match_map = {
            m.opportunity_id: m
            for m in Match.objects.filter(profile=profile, opportunity__in=qs)
        }
        interest_counts = dict(
            Match.objects.filter(opportunity__in=qs)
            .exclude(profile=profile)
            .values("opportunity")
            .annotate(c=Count("id"))
            .values_list("opportunity", "c")
        )
        ctx.update(
            {
                "profile": profile,
                "match_map": match_map,
                "interest_counts": interest_counts,
            }
        )
        return ctx


class MatchedOpportunitiesView(APIView):
    """Surface layer — Match-backed feed only (eligibility + ROI + why_summary)."""

    def get(self, request):
        profile = get_profile(request.user)
        return Response(build_match_feed(profile))


class MovesListView(APIView):
    """Surface layer — relationship Moves (not Opportunity rows)."""

    def get(self, request):
        profile = get_profile(request.user)
        # Ensure research moves exist for current matches
        recompute_matches_for_profile(profile)
        moves = Move.objects.filter(profile=profile).select_related("trigger_opportunity")
        return Response([serialize_move(m) for m in moves])


class SaveOpportunityView(APIView):
    def post(self, request, pk):
        profile = get_profile(request.user)
        try:
            opportunity = Opportunity.objects.get(pk=pk)
        except Opportunity.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        match, created = Match.objects.get_or_create(
            profile=profile,
            opportunity=opportunity,
            defaults={"state": MatchState.SAVED},
        )
        if not created:
            match.state = promote_match_state(match.state, MatchState.SAVED)
            match.save(update_fields=["state", "updated_at"])
        record_signal(profile, opportunity, SignalAction.BOOKMARK)
        return Response({"state": match.state})


class ApplyOpportunityView(APIView):
    def post(self, request, pk):
        profile = get_profile(request.user)
        try:
            opportunity = Opportunity.objects.get(pk=pk)
        except Opportunity.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        match, created = Match.objects.get_or_create(
            profile=profile,
            opportunity=opportunity,
            defaults={"state": MatchState.APPLIED},
        )
        if not created:
            match.state = promote_match_state(match.state, MatchState.APPLIED)
            match.save(update_fields=["state", "updated_at"])
        record_signal(profile, opportunity, SignalAction.APPLY)
        return Response({"state": match.state})


class DismissOpportunityView(APIView):
    def post(self, request, pk):
        profile = get_profile(request.user)
        try:
            opportunity = Opportunity.objects.get(pk=pk)
        except Opportunity.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        match, _ = Match.objects.get_or_create(
            profile=profile,
            opportunity=opportunity,
            defaults={"state": MatchState.DISMISSED},
        )
        match.state = MatchState.DISMISSED
        match.save(update_fields=["state", "updated_at"])
        record_signal(profile, opportunity, SignalAction.DISMISS)
        return Response({"state": match.state})


class InterestCountView(APIView):
    def get(self, request, pk):
        profile = get_profile(request.user)
        count = (
            Match.objects.filter(opportunity_id=pk)
            .exclude(profile=profile)
            .count()
        )
        return Response({"count": count})


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        profile = get_profile(self.request.user)
        return Notification.objects.filter(profile=profile)


class MarkNotificationReadView(APIView):
    def post(self, request, pk):
        profile = get_profile(request.user)
        try:
            notification = Notification.objects.get(pk=pk, profile=profile)
        except Notification.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(NotificationSerializer(notification).data)
