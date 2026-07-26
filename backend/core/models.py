from django.conf import settings
from django.db import models
from django.utils import timezone


class OpportunityCategory(models.TextChoices):
    ACADEMIC = "academic", "academic & educational"
    EMPLOYMENT = "employment", "employment & career"
    RESEARCH = "research", "research & innovation"
    PROFESSIONAL_DEV = "professional_dev", "professional development"
    EXPERIENTIAL = "experiential", "experiential learning"
    SOCIAL_IMPACT = "social_impact", "social impact"
    ENTREPRENEURSHIP = "entrepreneurship", "entrepreneurship"
    CULTURAL_EXCHANGE = "cultural_exchange", "cultural & creative exchange"


# Backward-compatible alias used across seed / dust / older imports
OpportunityType = OpportunityCategory


class IntentBucket(models.TextChoices):
    ADVANCEMENT = "advancement", "advancement"
    FUNDING = "funding", "funding"
    KNOWLEDGE = "knowledge", "knowledge"
    NETWORKING = "networking", "networking"


CATEGORY_DEFAULT_INTENT = {
    OpportunityCategory.ACADEMIC: IntentBucket.KNOWLEDGE,
    OpportunityCategory.EMPLOYMENT: IntentBucket.ADVANCEMENT,
    OpportunityCategory.RESEARCH: IntentBucket.FUNDING,
    OpportunityCategory.PROFESSIONAL_DEV: IntentBucket.NETWORKING,
    OpportunityCategory.EXPERIENTIAL: IntentBucket.ADVANCEMENT,
    OpportunityCategory.SOCIAL_IMPACT: IntentBucket.NETWORKING,
    OpportunityCategory.ENTREPRENEURSHIP: IntentBucket.FUNDING,
    OpportunityCategory.CULTURAL_EXCHANGE: IntentBucket.KNOWLEDGE,
}
TYPE_DEFAULT_INTENT = CATEGORY_DEFAULT_INTENT


class AuthProvider(models.TextChoices):
    LOCAL = "local", "local"
    GOOGLE = "google", "google"


class OpportunitySourceType(models.TextChoices):
    API = "api", "api"
    SCRAPE = "scrape", "scrape"
    PDF_PARSE = "pdf_parse", "pdf_parse"
    SOCIAL_SIGNAL = "social_signal", "social_signal"
    MANUAL = "manual", "manual"


# Legacy name kept for seed/admin transitions
OpportunitySource = OpportunitySourceType


class OpportunityStatus(models.TextChoices):
    LIVE = "live", "live"
    EXPIRED = "expired", "expired"
    UNVERIFIED = "unverified", "unverified"


class MatchState(models.TextChoices):
    SEEN = "seen", "seen"
    SAVED = "saved", "saved"
    APPLIED = "applied", "applied"
    DISMISSED = "dismissed", "dismissed"


class SurfacedAs(models.TextChoices):
    LISTING = "listing", "listing"
    MOVE = "move", "move"


class SignalAction(models.TextChoices):
    BOOKMARK = "bookmark", "bookmark"
    DISMISS = "dismiss", "dismiss"
    LINGER = "linger", "linger"
    APPLY = "apply", "apply"


class MoveType(models.TextChoices):
    INTRO_MESSAGE = "intro_message", "intro_message"
    FOLLOW_UP = "follow_up", "follow_up"
    COLD_OUTREACH_DRAFT = "cold_outreach_draft", "cold_outreach_draft"
    NETWORKING_TARGET = "networking_target", "networking_target"


class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    name = models.CharField(max_length=255, blank=True)
    bio = models.TextField(
        blank=True,
        help_text="Short self-description in the user's own words.",
    )
    photo_data = models.TextField(
        blank=True,
        help_text="Optional profile photo as a compressed data URL (private).",
    )
    gender = models.CharField(
        max_length=32,
        blank=True,
        help_text="Optional: male | female. Blank until the user chooses; never inferred.",
    )
    age = models.PositiveSmallIntegerField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True)
    education_level = models.CharField(max_length=255, blank=True)
    qualifications = models.TextField(blank=True)
    interest_tags = models.JSONField(default=list, blank=True)
    desired_types = models.JSONField(default=list, blank=True)
    hard_constraints = models.JSONField(
        default=dict,
        blank=True,
        help_text="{citizenship, location, budget, visa_status}",
    )
    readiness_vector = models.JSONField(
        default=dict,
        blank=True,
        help_text="{career_stage, time_availability, course_load}",
    )
    ambition_vector = models.JSONField(
        default=dict,
        blank=True,
        help_text="{inferred_categories: [], confidence_scores: {}}",
    )
    auth_provider = models.CharField(
        max_length=20,
        choices=AuthProvider.choices,
        default=AuthProvider.LOCAL,
    )
    onboarding_complete = models.BooleanField(default=False)

    def __str__(self):
        return self.name or self.user.username


class Opportunity(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=32, choices=OpportunityCategory.choices)
    intent = models.CharField(
        max_length=20,
        choices=IntentBucket.choices,
        default=IntentBucket.ADVANCEMENT,
        help_text="Four-bucket intent: advancement, funding, knowledge, networking",
    )
    tags = models.JSONField(default=list, blank=True)
    location = models.CharField(max_length=255, blank=True)
    organization = models.CharField(max_length=255, blank=True)
    requirements = models.TextField(blank=True)
    why_summary = models.TextField(
        blank=True,
        help_text="Canonical opportunity-level why blurb; Match.why_summary is per-user",
    )
    deadline = models.DateField(null=True, blank=True)
    deadline_tz = models.CharField(max_length=64, default="Africa/Nairobi", blank=True)
    source_type = models.CharField(
        max_length=20,
        choices=OpportunitySourceType.choices,
        default=OpportunitySourceType.MANUAL,
    )
    source_id = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        help_text="platform + original listing id for dedup",
    )
    eligibility_rules = models.JSONField(
        default=dict,
        blank=True,
        help_text="{citizenship[], location[], deadline, budget_required}",
    )
    roi_inputs = models.JSONField(
        default=dict,
        blank=True,
        help_text="{effort_estimate, value_estimate} — formula varies by category",
    )
    status = models.CharField(
        max_length=20,
        choices=OpportunityStatus.choices,
        default=OpportunityStatus.UNVERIFIED,
        db_index=True,
    )
    last_verified_at = models.DateTimeField(null=True, blank=True)
    verified = models.BooleanField(
        default=False,
        help_text="Legacy flag; prefer status=live for surfacing",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "opportunities"

    def __str__(self):
        return self.title

    @property
    def type(self):
        """API/compat alias for category."""
        return self.category

    def mark_verified_now(self):
        self.last_verified_at = timezone.now()
        if self.status != OpportunityStatus.EXPIRED:
            self.status = OpportunityStatus.LIVE
            self.verified = True


class Match(models.Model):
    profile = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="matches",
    )
    opportunity = models.ForeignKey(
        Opportunity,
        on_delete=models.CASCADE,
        related_name="matches",
    )
    state = models.CharField(
        max_length=20,
        choices=MatchState.choices,
        default=MatchState.SEEN,
    )
    eligibility_pass = models.BooleanField(default=True)
    roi_score = models.FloatField(default=0.0)
    why_summary = models.TextField(blank=True)
    surfaced_as = models.CharField(
        max_length=20,
        choices=SurfacedAs.choices,
        default=SurfacedAs.LISTING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("profile", "opportunity")
        ordering = ["-roi_score", "-updated_at"]

    def __str__(self):
        return f"{self.profile} → {self.opportunity} ({self.state})"


class SignalLog(models.Model):
    profile = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="signal_logs",
    )
    opportunity = models.ForeignKey(
        Opportunity,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="signal_logs",
    )
    action = models.CharField(max_length=20, choices=SignalAction.choices)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.profile} {self.action} @ {self.timestamp}"


class Move(models.Model):
    profile = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="moves",
    )
    trigger_opportunity = models.ForeignKey(
        Opportunity,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="moves",
    )
    move_type = models.CharField(max_length=32, choices=MoveType.choices)
    target_person_or_org = models.CharField(max_length=255)
    suggested_action_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.move_type}: {self.target_person_or_org}"


class Notification(models.Model):
    profile = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    opportunity = models.ForeignKey(
        Opportunity,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )
    message = models.CharField(max_length=500)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.message[:60]
