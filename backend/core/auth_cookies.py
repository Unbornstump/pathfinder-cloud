from django.conf import settings
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken


def set_refresh_cookie(response: Response, refresh: RefreshToken | str) -> Response:
    token = str(refresh)
    response.set_cookie(
        key=settings.REFRESH_TOKEN_COOKIE,
        value=token,
        max_age=settings.REFRESH_TOKEN_COOKIE_MAX_AGE,
        httponly=True,
        secure=settings.REFRESH_TOKEN_COOKIE_SECURE,
        samesite=settings.REFRESH_TOKEN_COOKIE_SAMESITE,
        path=settings.REFRESH_TOKEN_COOKIE_PATH,
    )
    return response


def clear_refresh_cookie(response: Response) -> Response:
    response.delete_cookie(
        key=settings.REFRESH_TOKEN_COOKIE,
        path=settings.REFRESH_TOKEN_COOKIE_PATH,
        samesite=settings.REFRESH_TOKEN_COOKIE_SAMESITE,
    )
    return response


def tokens_for_user(user) -> tuple[str, RefreshToken]:
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token), refresh
