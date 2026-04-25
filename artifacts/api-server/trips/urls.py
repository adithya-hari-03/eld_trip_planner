from django.urls import path

from . import views

urlpatterns = [
    path("healthz", views.health_check, name="health-check"),
    path("trips/plan", views.plan_trip, name="plan-trip"),
    path("trips/stats", views.trip_stats, name="trip-stats"),
    path("trips", views.list_trips, name="list-trips"),
    path("trips/<str:trip_id>", views.trip_detail, name="trip-detail"),
]
