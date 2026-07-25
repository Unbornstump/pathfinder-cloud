from django.contrib import admin

from .models import Match, Move, Notification, Opportunity, SignalLog, UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "location", "auth_provider", "onboarding_complete")
    list_filter = ("auth_provider", "onboarding_complete")
    search_fields = ("name", "user__username", "user__email", "location")


@admin.register(Opportunity)
class OpportunityAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "category",
        "intent",
        "location",
        "deadline",
        "status",
        "source_type",
    )
    list_filter = ("category", "intent", "status", "source_type")
    search_fields = ("title", "location", "organization", "source_id", "tags")


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = (
        "profile",
        "opportunity",
        "state",
        "eligibility_pass",
        "roi_score",
        "surfaced_as",
        "updated_at",
    )
    list_filter = ("state", "eligibility_pass", "surfaced_as")


@admin.register(SignalLog)
class SignalLogAdmin(admin.ModelAdmin):
    list_display = ("profile", "action", "opportunity", "timestamp")
    list_filter = ("action",)


@admin.register(Move)
class MoveAdmin(admin.ModelAdmin):
    list_display = ("profile", "move_type", "target_person_or_org", "created_at")
    list_filter = ("move_type",)
    search_fields = ("target_person_or_org", "suggested_action_text")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("profile", "message", "is_read", "created_at")
    list_filter = ("is_read",)
