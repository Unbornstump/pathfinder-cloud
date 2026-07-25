from django.db import migrations, models


LEGACY_TYPE_MAP = {
    "job": "employment",
    "internship": "experiential",
    "attachment": "experiential",
    "study_abroad": "academic",
}

LEGACY_DESIRED_MAP = LEGACY_TYPE_MAP

TYPE_DEFAULT_INTENT = {
    "academic": "knowledge",
    "employment": "advancement",
    "research": "funding",
    "professional_dev": "networking",
    "experiential": "advancement",
    "social_impact": "networking",
    "entrepreneurship": "funding",
    "cultural_exchange": "knowledge",
}


def forwards_remap(apps, schema_editor):
    Opportunity = apps.get_model("core", "Opportunity")
    UserProfile = apps.get_model("core", "UserProfile")

    for opp in Opportunity.objects.all():
        new_type = LEGACY_TYPE_MAP.get(opp.type, opp.type)
        updates = {}
        if new_type != opp.type:
            updates["type"] = new_type
        if not getattr(opp, "intent", None):
            updates["intent"] = TYPE_DEFAULT_INTENT.get(new_type, "advancement")
        elif new_type in TYPE_DEFAULT_INTENT and opp.intent == "advancement":
            # freshly added default; set from type if still blank-ish default
            updates["intent"] = TYPE_DEFAULT_INTENT[new_type]
        if updates:
            for k, v in updates.items():
                setattr(opp, k, v)
            opp.save(update_fields=list(updates.keys()))

    # Also handle after intent field exists — set intent from type for all
    for opp in Opportunity.objects.all():
        intent = TYPE_DEFAULT_INTENT.get(opp.type)
        if intent and opp.intent != intent:
            # only overwrite if still the migration default for remapped rows
            pass
        if not opp.intent:
            opp.intent = TYPE_DEFAULT_INTENT.get(opp.type, "advancement")
            opp.save(update_fields=["intent"])

    for profile in UserProfile.objects.all():
        desired = profile.desired_types or []
        remapped = []
        for t in desired:
            remapped.append(LEGACY_DESIRED_MAP.get(t, t))
        # dedupe preserve order
        seen = set()
        clean = []
        for t in remapped:
            if t not in seen:
                seen.add(t)
                clean.append(t)
        if clean != desired:
            profile.desired_types = clean
            profile.save(update_fields=["desired_types"])


def backwards_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="opportunity",
            name="intent",
            field=models.CharField(
                choices=[
                    ("advancement", "advancement"),
                    ("funding", "funding"),
                    ("knowledge", "knowledge"),
                    ("networking", "networking"),
                ],
                default="advancement",
                help_text="Four-bucket intent: advancement, funding, knowledge, networking",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="opportunity",
            name="why_summary",
            field=models.TextField(
                blank=True,
                help_text="Short 'why this matters' blurb for the matched user (phase 2 matching)",
            ),
        ),
        migrations.AlterField(
            model_name="opportunity",
            name="type",
            field=models.CharField(
                choices=[
                    ("academic", "academic & educational"),
                    ("employment", "employment & career"),
                    ("research", "research & innovation"),
                    ("professional_dev", "professional development"),
                    ("experiential", "experiential learning"),
                    ("social_impact", "social impact"),
                    ("entrepreneurship", "entrepreneurship"),
                    ("cultural_exchange", "cultural & creative exchange"),
                    # keep legacy during remap
                    ("job", "job"),
                    ("internship", "internship"),
                    ("attachment", "attachment"),
                    ("study_abroad", "study abroad"),
                ],
                max_length=32,
            ),
        ),
        migrations.RunPython(forwards_remap, backwards_noop),
        migrations.AlterField(
            model_name="opportunity",
            name="type",
            field=models.CharField(
                choices=[
                    ("academic", "academic & educational"),
                    ("employment", "employment & career"),
                    ("research", "research & innovation"),
                    ("professional_dev", "professional development"),
                    ("experiential", "experiential learning"),
                    ("social_impact", "social impact"),
                    ("entrepreneurship", "entrepreneurship"),
                    ("cultural_exchange", "cultural & creative exchange"),
                ],
                max_length=32,
            ),
        ),
    ]
