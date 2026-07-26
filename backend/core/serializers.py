from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from matching_engine.why_summary import overlapping_tags
from .models import (
    Match,
    Move,
    Notification,
    Opportunity,
    OpportunityCategory,
    UserProfile,
)


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", required=False, allow_blank=True)
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = UserProfile
        fields = (
            "username",
            "email",
            "name",
            "bio",
            "photo_data",
            "gender",
            "age",
            "location",
            "education_level",
            "qualifications",
            "interest_tags",
            "desired_types",
            "hard_constraints",
            "readiness_vector",
            "ambition_vector",
            "auth_provider",
            "onboarding_complete",
        )
        read_only_fields = ("auth_provider", "ambition_vector")

    def validate_desired_types(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Must be a list.")
        valid = {c.value for c in OpportunityCategory}
        for item in value:
            if item not in valid:
                raise serializers.ValidationError(f"Invalid opportunity category: {item}")
        return value

    def validate_interest_tags(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Must be a list.")
        return [str(t).strip() for t in value if str(t).strip()]

    def validate_bio(self, value):
        text = (value or "").strip()
        if len(text) > 500:
            raise serializers.ValidationError("Bio must be 500 characters or fewer.")
        return text

    def validate_gender(self, value):
        raw = (value or "").strip().lower()
        if not raw:
            return ""
        if raw in ("male", "female"):
            return raw
        raise serializers.ValidationError("Choose Male or Female.")

    def validate_photo_data(self, value):
        if not value:
            return ""
        raw = str(value)
        if not raw.startswith("data:image/"):
            raise serializers.ValidationError("Photo must be an image data URL.")
        # ~180KB text budget keeps payloads light for private thumbnails
        if len(raw) > 180_000:
            raise serializers.ValidationError("Photo is too large — try a smaller image.")
        return raw

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        if "email" in user_data:
            instance.user.email = user_data["email"]
            instance.user.save(update_fields=["email"])
        return super().update(instance, validated_data)


class OpportunitySerializer(serializers.ModelSerializer):
    """Ops/admin list serializer — main feed uses surface.feed instead."""

    overlapping_tags = serializers.SerializerMethodField()
    match_state = serializers.SerializerMethodField()
    interest_count = serializers.SerializerMethodField()
    type = serializers.CharField(source="category", read_only=True)

    class Meta:
        model = Opportunity
        fields = (
            "id",
            "title",
            "description",
            "category",
            "type",
            "intent",
            "tags",
            "location",
            "organization",
            "requirements",
            "why_summary",
            "deadline",
            "deadline_tz",
            "source_type",
            "source_id",
            "status",
            "verified",
            "created_at",
            "overlapping_tags",
            "match_state",
            "interest_count",
        )

    def get_overlapping_tags(self, obj):
        profile = self.context.get("profile")
        if not profile:
            return []
        return overlapping_tags(profile, obj)

    def get_match_state(self, obj):
        match_map = self.context.get("match_map") or {}
        match = match_map.get(obj.id)
        return match.state if match else None

    def get_interest_count(self, obj):
        counts = self.context.get("interest_counts")
        if counts is not None:
            return counts.get(obj.id, 0)
        profile = self.context.get("profile")
        qs = Match.objects.filter(opportunity=obj)
        if profile:
            qs = qs.exclude(profile=profile)
        return qs.count()


class MoveSerializer(serializers.ModelSerializer):
    trigger_opportunity_title = serializers.CharField(
        source="trigger_opportunity.title",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Move
        fields = (
            "id",
            "move_type",
            "target_person_or_org",
            "suggested_action_text",
            "trigger_opportunity",
            "trigger_opportunity_title",
            "created_at",
        )


class NotificationSerializer(serializers.ModelSerializer):
    opportunity_title = serializers.CharField(
        source="opportunity.title",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Notification
        fields = (
            "id",
            "message",
            "is_read",
            "created_at",
            "opportunity",
            "opportunity_title",
        )
