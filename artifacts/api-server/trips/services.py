"""
Trip planning service — geocoding, OSRM routing, and Hours-of-Service scheduling.

Implements the FMCSA property-carrier 70hr/8day rules without adverse-driving
exception:

* 11-hour driving limit per shift
* 14-hour on-duty driving window
* 30-minute rest break required after 8 cumulative hours of driving
* 10 consecutive hours off duty resets the daily driving and 14-hour window
* 34-hour off-duty reset is applied automatically when the cycle is exhausted
* 1 hour for pickup, 1 hour for dropoff (on-duty not driving)
* Fueling stop inserted at least every 1000 miles (30 min on-duty not driving)
"""

from __future__ import annotations

import datetime as dt
import math
from dataclasses import dataclass, field
from typing import List, Tuple

import requests

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OSRM_URL = "https://router.project-osrm.org/route/v1/driving"
USER_AGENT = "ELDTripPlanner/1.0 (https://replit.com)"

METERS_PER_MILE = 1609.344
AVG_SPEED_MPH = 55.0  # Conservative interstate average used for HOS scheduling

# HOS constants (property-carrying drivers, 70hr/8day schedule)
MAX_DRIVING_PER_SHIFT = 11.0
MAX_WINDOW_HOURS = 14.0
DRIVING_BEFORE_BREAK = 8.0
BREAK_DURATION = 0.5
OFF_DUTY_RESET_HOURS = 10.0
RESET_34_HOURS = 34.0
PICKUP_DROPOFF_HOURS = 1.0
FUEL_INTERVAL_MILES = 1000.0
FUEL_DURATION_HOURS = 0.5
CYCLE_LIMIT_HOURS = 70.0


# --------------------------------------------------------------------------
# Geocoding + routing
# --------------------------------------------------------------------------
def geocode(query: str) -> dict:
    resp = requests.get(
        NOMINATIM_URL,
        params={"q": query, "format": "json", "limit": 1, "addressdetails": 1},
        headers={"User-Agent": USER_AGENT, "Accept-Language": "en"},
        timeout=20,
    )
    resp.raise_for_status()
    data = resp.json()
    if not data:
        raise ValueError(f"Could not find a location matching '{query}'.")
    item = data[0]
    full = item.get("display_name", query)
    short = full.split(",")[0].strip() or query
    return {
        "label": short,
        "address": full,
        "lat": float(item["lat"]),
        "lon": float(item["lon"]),
    }


def osrm_route(points: List[Tuple[float, float]]) -> Tuple[float, float, list]:
    """Get a driving route. Points are (lon, lat). Returns (meters, seconds, coords)."""
    coord_str = ";".join(f"{lon:.6f},{lat:.6f}" for lon, lat in points)
    resp = requests.get(
        f"{OSRM_URL}/{coord_str}",
        params={"overview": "full", "geometries": "geojson", "steps": "false"},
        headers={"User-Agent": USER_AGENT},
        timeout=45,
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != "Ok" or not data.get("routes"):
        raise ValueError(
            data.get("message", "Routing service could not find a driving route.")
        )
    route = data["routes"][0]
    return route["distance"], route["duration"], route["geometry"]["coordinates"]


# --------------------------------------------------------------------------
# Geometry helpers
# --------------------------------------------------------------------------
def haversine_miles(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    lon1, lat1 = a
    lon2, lat2 = b
    earth_mi = 3958.7613
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    h = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    )
    return 2 * earth_mi * math.asin(math.sqrt(h))


def cumulative_segment_lengths(coords: List[List[float]]) -> List[float]:
    """Return per-vertex cumulative miles along the polyline."""
    cum = [0.0]
    for i in range(1, len(coords)):
        cum.append(cum[-1] + haversine_miles(coords[i - 1], coords[i]))
    return cum


def interpolate_along(
    coords: List[List[float]],
    cum: List[float],
    miles_from_start: float,
) -> List[float]:
    if not coords:
        return [0.0, 0.0]
    if miles_from_start <= 0:
        return coords[0]
    total = cum[-1]
    if miles_from_start >= total:
        return coords[-1]
    # Binary-ish linear scan; routes have a few thousand vertices at most.
    for i in range(1, len(cum)):
        if cum[i] >= miles_from_start:
            seg = cum[i] - cum[i - 1]
            t = (miles_from_start - cum[i - 1]) / seg if seg > 0 else 0.0
            lon = coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * t
            lat = coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * t
            return [lon, lat]
    return coords[-1]


# --------------------------------------------------------------------------
# HOS planner state machine
# --------------------------------------------------------------------------
@dataclass
class PlannerState:
    now: dt.datetime
    cycle_used: float  # cumulative on-duty hours toward 70hr/8day limit
    drive_today: float = 0.0  # hours of driving since last 10hr+ off-duty
    drive_since_break: float = 0.0  # hours of driving since last >=30min off
    window_used: float = 0.0  # hours since the start of the 14-hour window
    miles_done: float = 0.0  # cumulative trip miles
    events: List[dict] = field(default_factory=list)
    stops: List[dict] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


def _add_event(state: PlannerState, status: str, hours: float, location: str, remarks: str = "") -> None:
    if hours <= 0:
        return
    end = state.now + dt.timedelta(hours=hours)
    state.events.append(
        {
            "status": status,
            "startTime": state.now.isoformat(),
            "endTime": end.isoformat(),
            "location": location,
            "remarks": remarks,
        }
    )
    if status == "driving":
        state.drive_today += hours
        state.drive_since_break += hours
        state.window_used += hours
        state.cycle_used += hours
    elif status == "on_duty_not_driving":
        state.window_used += hours
        state.cycle_used += hours
        # Short on-duty time also counts toward the 30-min-break clock?
        # No — only driving time counts toward the 8hr break requirement.
    elif status in ("off_duty", "sleeper_berth"):
        if hours >= OFF_DUTY_RESET_HOURS:
            state.drive_today = 0.0
            state.drive_since_break = 0.0
            state.window_used = 0.0
        elif hours >= BREAK_DURATION:
            state.drive_since_break = 0.0
        # Window does NOT reset for short breaks; it pauses driving but
        # the 14-hour window keeps elapsing per FMCSA rules.
        state.window_used += hours
    state.now = end


def _add_stop(state: PlannerState, kind: str, label: str, lat: float, lon: float, duration: float, notes: str = "") -> None:
    arrival = state.now
    departure = state.now + dt.timedelta(hours=duration)
    state.stops.append(
        {
            "kind": kind,
            "label": label,
            "lat": lat,
            "lon": lon,
            "arrivalTime": arrival.isoformat(),
            "departureTime": departure.isoformat(),
            "durationHours": duration,
            "mileMarker": round(state.miles_done, 1),
            "notes": notes,
        }
    )


def _remaining_drive_capacity(state: PlannerState) -> float:
    """Hours of driving allowed before a stop is mandatory."""
    return min(
        MAX_DRIVING_PER_SHIFT - state.drive_today,
        MAX_WINDOW_HOURS - state.window_used,
        DRIVING_BEFORE_BREAK - state.drive_since_break,
        CYCLE_LIMIT_HOURS - state.cycle_used,
        100.0,  # cap
    )


def _take_off_duty(state: PlannerState, location: str, kind: str = "rest_10hr") -> None:
    duration = OFF_DUTY_RESET_HOURS if kind == "rest_10hr" else RESET_34_HOURS
    label = "10-hour off-duty rest" if kind == "rest_10hr" else "34-hour cycle reset"
    lat, lon = _last_position(state)
    _add_stop(state, kind, label, lat, lon, duration, notes="Required HOS reset")
    _add_event(state, "sleeper_berth", duration, location, remarks=label)


def _take_short_break(state: PlannerState, location: str) -> None:
    lat, lon = _last_position(state)
    _add_stop(state, "rest_30min", "30-minute break", lat, lon, BREAK_DURATION,
              notes="Required after 8 cumulative hours of driving")
    _add_event(state, "off_duty", BREAK_DURATION, location, remarks="30-minute break")


def _last_position(state: PlannerState) -> Tuple[float, float]:
    if state.stops:
        last = state.stops[-1]
        return last["lat"], last["lon"]
    return 0.0, 0.0


def _drive_leg(
    state: PlannerState,
    coords: List[List[float]],
    cum: List[float],
    leg_total_mi: float,
    leg_start_miles: float,
    destination_label: str,
) -> None:
    """
    Drive along a routed leg from leg_start_miles=state.miles_done to
    leg_start_miles + leg_total_mi, inserting fueling, breaks, and rests
    along the way.
    """
    leg_end_total = leg_start_miles + leg_total_mi

    while state.miles_done < leg_end_total:
        # Decide if we MUST stop before driving more
        if state.cycle_used >= CYCLE_LIMIT_HOURS - 0.001:
            state.warnings.append(
                "Driver exhausted the 70-hour/8-day cycle; a 34-hour reset was inserted."
            )
            _take_off_duty(state, destination_label, kind="reset_34hr")
            continue

        cap_hours = _remaining_drive_capacity(state)
        if cap_hours <= 0.001:
            # Why are we out? Pick the right stop type.
            if state.drive_since_break >= DRIVING_BEFORE_BREAK - 0.001 and state.drive_today < MAX_DRIVING_PER_SHIFT - 0.001 and state.window_used < MAX_WINDOW_HOURS - 0.001:
                _take_short_break(state, destination_label)
            else:
                _take_off_duty(state, destination_label)
            continue

        cap_miles_by_hours = cap_hours * AVG_SPEED_MPH

        # Distance to the next fueling boundary (1000mi multiples from trip start)
        miles_until_fuel = FUEL_INTERVAL_MILES - (
            state.miles_done % FUEL_INTERVAL_MILES
        )
        if miles_until_fuel < 0.5:
            miles_until_fuel += FUEL_INTERVAL_MILES

        miles_until_leg_end = leg_end_total - state.miles_done

        next_chunk = min(cap_miles_by_hours, miles_until_fuel, miles_until_leg_end)
        if next_chunk <= 0:
            break

        chunk_hours = next_chunk / AVG_SPEED_MPH
        # Drive
        # Use destination_label for in-progress driving; remarks blank for cleaner log
        _add_event(state, "driving", chunk_hours, _city_along(coords, cum, state.miles_done + next_chunk - leg_start_miles, destination_label), remarks=f"Driving toward {destination_label}")
        state.miles_done += next_chunk

        # Update last_position based on current point along the route
        local_offset = state.miles_done - leg_start_miles
        lon, lat = interpolate_along(coords, cum, local_offset)
        # Save a synthetic "in-progress" point in stops? Only when something happens.

        # Now decide if a stop event is needed AT this position
        reached_leg_end = state.miles_done >= leg_end_total - 0.001
        reached_fuel = (
            state.miles_done >= FUEL_INTERVAL_MILES
            and abs(state.miles_done % FUEL_INTERVAL_MILES) < 0.5
            and not reached_leg_end
        )

        if reached_fuel:
            _add_stop(state, "fuel", f"Fueling stop @ mile {int(round(state.miles_done))}",
                      lat, lon, FUEL_DURATION_HOURS,
                      notes="Refueling — at least every 1000 miles")
            _add_event(state, "on_duty_not_driving", FUEL_DURATION_HOURS,
                       f"Mile {int(round(state.miles_done))}", remarks="Refueling")


def _city_along(coords: List[List[float]], cum: List[float], local_miles: float, destination_label: str) -> str:
    """Coarse human label for an in-progress driving event."""
    return f"En route to {destination_label}"


# --------------------------------------------------------------------------
# Daily-log assembly
# --------------------------------------------------------------------------
def _split_event_at_midnight(event: dict, tz: dt.timezone) -> List[dict]:
    """Split an event so it does not cross midnight in the given timezone."""
    start = dt.datetime.fromisoformat(event["startTime"]).astimezone(tz)
    end = dt.datetime.fromisoformat(event["endTime"]).astimezone(tz)
    pieces: List[dict] = []
    cur_start = start
    while True:
        next_midnight = (cur_start + dt.timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        if next_midnight >= end:
            pieces.append(
                {
                    **event,
                    "startTime": cur_start.isoformat(),
                    "endTime": end.isoformat(),
                }
            )
            return pieces
        pieces.append(
            {
                **event,
                "startTime": cur_start.isoformat(),
                "endTime": next_midnight.isoformat(),
            }
        )
        cur_start = next_midnight


def _build_daily_logs(
    events: List[dict],
    start_label: str,
    end_label: str,
    tz: dt.timezone,
) -> List[dict]:
    by_date: dict = {}
    for ev in events:
        for piece in _split_event_at_midnight(ev, tz):
            d = dt.datetime.fromisoformat(piece["startTime"]).astimezone(tz).date()
            by_date.setdefault(d, []).append(piece)

    days = sorted(by_date.keys())
    logs = []
    cumulative_odo = 0.0
    for idx, day in enumerate(days):
        day_events = by_date[day]
        totals = {"offDuty": 0.0, "sleeperBerth": 0.0, "driving": 0.0, "onDutyNotDriving": 0.0}
        miles_today = 0.0
        for ev in day_events:
            s = dt.datetime.fromisoformat(ev["startTime"])
            e = dt.datetime.fromisoformat(ev["endTime"])
            hrs = (e - s).total_seconds() / 3600.0
            if ev["status"] == "off_duty":
                totals["offDuty"] += hrs
            elif ev["status"] == "sleeper_berth":
                totals["sleeperBerth"] += hrs
            elif ev["status"] == "driving":
                totals["driving"] += hrs
                miles_today += hrs * AVG_SPEED_MPH
            elif ev["status"] == "on_duty_not_driving":
                totals["onDutyNotDriving"] += hrs

        for k in totals:
            totals[k] = round(totals[k], 2)
        miles_today = round(miles_today, 1)

        start_odo = cumulative_odo
        end_odo = cumulative_odo + miles_today
        cumulative_odo = end_odo

        logs.append(
            {
                "date": day.isoformat(),
                "dayNumber": idx + 1,
                "startOdometer": round(start_odo, 1),
                "endOdometer": round(end_odo, 1),
                "totalMilesDriving": miles_today,
                "events": day_events,
                "totals": totals,
                "fromLocation": start_label if idx == 0 else "Continued",
                "toLocation": end_label if idx == len(days) - 1 else "Continued",
            }
        )
    return logs


# --------------------------------------------------------------------------
# Public entrypoint
# --------------------------------------------------------------------------
def plan_trip(
    current_location: str,
    pickup_location: str,
    dropoff_location: str,
    current_cycle_used: float,
) -> dict:
    current_pt = geocode(current_location)
    pickup_pt = geocode(pickup_location)
    dropoff_pt = geocode(dropoff_location)

    leg1_dist_m, leg1_dur_s, leg1_coords = osrm_route(
        [(current_pt["lon"], current_pt["lat"]), (pickup_pt["lon"], pickup_pt["lat"])]
    )
    leg2_dist_m, leg2_dur_s, leg2_coords = osrm_route(
        [(pickup_pt["lon"], pickup_pt["lat"]), (dropoff_pt["lon"], dropoff_pt["lat"])]
    )

    leg1_miles = leg1_dist_m / METERS_PER_MILE
    leg2_miles = leg2_dist_m / METERS_PER_MILE
    total_miles = leg1_miles + leg2_miles

    leg1_cum = cumulative_segment_lengths(leg1_coords)
    leg2_cum = cumulative_segment_lengths(leg2_coords)

    start_time = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
    state = PlannerState(now=start_time, cycle_used=current_cycle_used)

    if current_cycle_used >= CYCLE_LIMIT_HOURS:
        state.warnings.append(
            "Current cycle hours already at the 70-hour limit; a 34-hour reset is required first."
        )
        _take_off_duty(state, current_pt["label"], kind="reset_34hr")

    # Start stop
    _add_stop(state, "start", f"Start: {current_pt['label']}",
              current_pt["lat"], current_pt["lon"], 0.0,
              notes=current_pt["address"])

    # Drive current -> pickup
    _drive_leg(state, leg1_coords, leg1_cum, leg1_miles, 0.0, pickup_pt["label"])

    # Pickup (1 hour on-duty not driving)
    _add_stop(state, "pickup", f"Pickup: {pickup_pt['label']}",
              pickup_pt["lat"], pickup_pt["lon"], PICKUP_DROPOFF_HOURS,
              notes=pickup_pt["address"])
    _add_event(state, "on_duty_not_driving", PICKUP_DROPOFF_HOURS,
               pickup_pt["label"], remarks="Pickup loading")

    # Drive pickup -> dropoff
    _drive_leg(state, leg2_coords, leg2_cum, leg2_miles, leg1_miles, dropoff_pt["label"])

    # Dropoff (1 hour on-duty not driving)
    _add_stop(state, "dropoff", f"Dropoff: {dropoff_pt['label']}",
              dropoff_pt["lat"], dropoff_pt["lon"], PICKUP_DROPOFF_HOURS,
              notes=dropoff_pt["address"])
    _add_event(state, "on_duty_not_driving", PICKUP_DROPOFF_HOURS,
               dropoff_pt["label"], remarks="Dropoff unloading")

    # Build combined geometry (skip duplicate pickup point)
    geometry_coords = list(leg1_coords)
    if leg2_coords:
        geometry_coords.extend(leg2_coords[1:])

    # Insert end_of_day markers between consecutive log days at the rest stop
    daily_logs = _build_daily_logs(
        state.events,
        start_label=current_pt["label"],
        end_label=dropoff_pt["label"],
        tz=dt.timezone.utc,
    )

    total_driving_hours = round(
        sum(
            (
                dt.datetime.fromisoformat(e["endTime"])
                - dt.datetime.fromisoformat(e["startTime"])
            ).total_seconds()
            / 3600.0
            for e in state.events
            if e["status"] == "driving"
        ),
        2,
    )
    total_rest_hours = round(
        sum(
            (
                dt.datetime.fromisoformat(e["endTime"])
                - dt.datetime.fromisoformat(e["startTime"])
            ).total_seconds()
            / 3600.0
            for e in state.events
            if e["status"] in ("off_duty", "sleeper_berth")
        ),
        2,
    )
    total_trip_hours = round(
        (state.now - start_time).total_seconds() / 3600.0, 2
    )
    total_fuel_stops = sum(1 for s in state.stops if s["kind"] == "fuel")

    return {
        "currentPoint": current_pt,
        "pickupPoint": pickup_pt,
        "dropoffPoint": dropoff_pt,
        "totalDistanceMiles": round(total_miles, 1),
        "totalDrivingHours": total_driving_hours,
        "totalRestHours": total_rest_hours,
        "totalTripHours": total_trip_hours,
        "totalDays": len(daily_logs),
        "totalFuelStops": total_fuel_stops,
        "geometry": {"type": "LineString", "coordinates": geometry_coords},
        "stops": state.stops,
        "dailyLogs": daily_logs,
        "warnings": state.warnings,
    }
