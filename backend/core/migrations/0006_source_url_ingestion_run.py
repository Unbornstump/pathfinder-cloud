# Generated manually for source_url + IngestionRun

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0005_profile_gender_field"),
    ]

    operations = [
        migrations.AddField(
            model_name="opportunity",
            name="source_url",
            field=models.URLField(
                blank=True,
                help_text="Canonical listing / apply URL from the source",
                max_length=500,
            ),
        ),
        migrations.CreateModel(
            name="IngestionRun",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("source_id", models.CharField(db_index=True, max_length=64)),
                ("started_at", models.DateTimeField()),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                ("ok", models.BooleanField(default=True)),
                ("rows_fetched", models.PositiveIntegerField(default=0)),
                ("error", models.TextField(blank=True)),
            ],
            options={
                "ordering": ["-started_at"],
            },
        ),
    ]
