# Soft-import Celery so manage.py works even before `pip install celery`.
try:
    from .celery import app as celery_app
except ImportError:  # pragma: no cover
    celery_app = None

__all__ = ("celery_app",)
