"""HTTP views for the ELD Trip Planner API."""
from __future__ import annotations

import logging

from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from .models import Trip
from .services import plan_trip as run_plan_trip

logger = logging.getLogger(__name__)


def _trip_to_plan(trip: Trip) -> dict:
    plan = dict(trip.plan)
    plan["id"] = trip.id
    plan["createdAt"] = trip.created_at.isoformat()
    plan["request"] = {
        "currentLocation": trip.current_location,
        "pickupLocation": trip.pickup_location,
        "dropoffLocation": trip.dropoff_location,
        "currentCycleUsed": trip.current_cycle_used,
    }
    return plan


@api_view(["GET"])
def health_check(_request: Request) -> Response:
    return Response({"status": "ok"})


@api_view(["POST"])
def plan_trip(request: Request) -> Response:
    body = request.data or {}
    try:
        current_location = str(body["currentLocation"]).strip()
        pickup_location = str(body["pickupLocation"]).strip()
        dropoff_location = str(body["dropoffLocation"]).strip()
        current_cycle_used = float(body["currentCycleUsed"])
    except (KeyError, TypeError, ValueError):
        return Response(
            {"error": "currentLocation, pickupLocation, dropoffLocation and currentCycleUsed are required."},
            status=400,
        )

    if not current_location or not pickup_location or not dropoff_location:
        return Response({"error": "Locations cannot be empty."}, status=400)
    if current_cycle_used < 0 or current_cycle_used > 70:
        return Response({"error": "currentCycleUsed must be between 0 and 70."}, status=400)

    try:
        plan = run_plan_trip(
            current_location=current_location,
            pickup_location=pickup_location,
            dropoff_location=dropoff_location,
            current_cycle_used=current_cycle_used,
        )
    except ValueError as e:
        logger.warning("Trip planning failed: %s", e)
        return Response({"error": str(e)}, status=400)
    except Exception as e:  # pragma: no cover - safety net for upstream API errors
        logger.exception("Unexpected error while planning trip")
        return Response({"error": f"Trip planning failed: {e}"}, status=500)

    trip = Trip.objects.create(
        current_location=current_location,
        pickup_location=pickup_location,
        dropoff_location=dropoff_location,
        current_cycle_used=current_cycle_used,
        total_distance_miles=plan["totalDistanceMiles"],
        total_driving_hours=plan["totalDrivingHours"],
        total_rest_hours=plan.get("totalRestHours", 0.0),
        total_fuel_stops=plan.get("totalFuelStops", 0),
        total_days=plan["totalDays"],
        plan=plan,
    )
    return Response(_trip_to_plan(trip))


@api_view(["GET"])
def list_trips(_request: Request) -> Response:
    trips = Trip.objects.all()[:50]
    payload = [
        {
            "id": t.id,
            "createdAt": t.created_at.isoformat(),
            "currentLabel": (t.plan.get("currentPoint") or {}).get("label", t.current_location),
            "pickupLabel": (t.plan.get("pickupPoint") or {}).get("label", t.pickup_location),
            "dropoffLabel": (t.plan.get("dropoffPoint") or {}).get("label", t.dropoff_location),
            "totalDistanceMiles": t.total_distance_miles,
            "totalDays": t.total_days,
        }
        for t in trips
    ]
    return Response(payload)


@api_view(["GET"])
def get_trip(_request: Request, trip_id: str) -> Response:
    try:
        trip = Trip.objects.get(pk=trip_id)
    except Trip.DoesNotExist:
        return Response({"error": "Trip not found."}, status=404)
    return Response(_trip_to_plan(trip))


@api_view(["GET"])
def trip_stats(_request: Request) -> Response:
    from django.db.models import Sum, Count

    agg = Trip.objects.aggregate(
        totalTrips=Count("id"),
        totalMiles=Sum("total_distance_miles"),
        totalDrivingHours=Sum("total_driving_hours"),
        totalRestHours=Sum("total_rest_hours"),
        totalFuelStops=Sum("total_fuel_stops"),
    )
    return Response(
        {
            "totalTrips": agg["totalTrips"] or 0,
            "totalMiles": round(agg["totalMiles"] or 0.0, 1),
            "totalDrivingHours": round(agg["totalDrivingHours"] or 0.0, 2),
            "totalRestHours": round(agg["totalRestHours"] or 0.0, 2),
            "totalFuelStops": agg["totalFuelStops"] or 0,
        }
    )
