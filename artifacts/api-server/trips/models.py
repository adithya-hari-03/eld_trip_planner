import uuid

from django.db import models


def _new_id() -> str:
    return uuid.uuid4().hex[:12]


class Trip(models.Model):
    id = models.CharField(primary_key=True, max_length=32, default=_new_id, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    current_location = models.TextField()
    pickup_location = models.TextField()
    dropoff_location = models.TextField()
    current_cycle_used = models.FloatField()
    total_distance_miles = models.FloatField()
    total_driving_hours = models.FloatField()
    total_rest_hours = models.FloatField(default=0)
    total_fuel_stops = models.IntegerField(default=0)
    total_days = models.IntegerField(default=1)
    plan = models.JSONField()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:  # pragma: no cover - debug only
        return f"Trip {self.id}: {self.current_location} -> {self.dropoff_location}"
