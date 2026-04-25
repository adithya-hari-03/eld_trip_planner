import trips.models
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Trip",
            fields=[
                (
                    "id",
                    models.CharField(
                        default=trips.models._new_id,
                        editable=False,
                        max_length=32,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("current_location", models.TextField()),
                ("pickup_location", models.TextField()),
                ("dropoff_location", models.TextField()),
                ("current_cycle_used", models.FloatField()),
                ("total_distance_miles", models.FloatField()),
                ("total_driving_hours", models.FloatField()),
                ("total_rest_hours", models.FloatField(default=0)),
                ("total_fuel_stops", models.IntegerField(default=0)),
                ("total_days", models.IntegerField(default=1)),
                ("plan", models.JSONField()),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
