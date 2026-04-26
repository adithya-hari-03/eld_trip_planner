import { useGetTripStats, getGetTripStatsQueryKey, useListTrips, getListTripsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Header } from "@/components/layout/Header";
import { TripForm } from "@/components/TripForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Map as MapIcon, Clock, Fuel, Route, History, TrendingUp } from "lucide-react";

const statTiles = [
  { key: "totalTrips", label: "Total Trips", icon: Route, color: "from-pink-500 to-fuchsia-600", glow: "shadow-pink-500/25" },
  { key: "totalMiles", label: "Total Miles", icon: MapIcon, color: "from-violet-500 to-indigo-600", glow: "shadow-violet-500/25" },
  { key: "totalDrivingHours", label: "Drive Hours", icon: Clock, color: "from-emerald-500 to-teal-600", glow: "shadow-emerald-500/25" },
  { key: "totalFuelStops", label: "Fuel Stops", icon: Fuel, color: "from-orange-400 to-rose-500", glow: "shadow-orange-500/25" },
] as const;

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useGetTripStats({
    query: { queryKey: getGetTripStatsQueryKey() }
  });
  const { data: trips, isLoading: tripsLoading } = useListTrips({
    query: { queryKey: getListTripsQueryKey() }
  });

  const formatStat = (key: string, value: number) => {
    if (key === "totalMiles") return Math.round(value).toLocaleString();
    if (key === "totalDrivingHours") return Math.round(value).toString();
    return value.toString();
  };

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            <span className="text-gradient-amber">Plan</span>{" "}
            <span className="text-foreground">your next haul</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Compute the route, rest stops, fueling and FMCSA-compliant ELD logs in one shot.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <TripForm />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <Card className="bg-gradient-card border-card-border ring-amber-soft">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Aggregate Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="grid grid-cols-2 gap-3 animate-pulse">
                    {[0,1,2,3].map(i => <div key={i} className="h-20 bg-muted/40 rounded-lg"></div>)}
                  </div>
                ) : stats ? (
                  <div className="grid grid-cols-2 gap-3">
                    {statTiles.map(tile => {
                      const Icon = tile.icon;
                      const value = (stats as unknown as Record<string, number>)[tile.key] ?? 0;
                      return (
                        <div
                          key={tile.key}
                          className={`relative overflow-hidden rounded-lg border border-white/5 bg-black/30 p-3 shadow-lg ${tile.glow}`}
                        >
                          <div className={`absolute -top-6 -right-6 h-16 w-16 rounded-full bg-gradient-to-br ${tile.color} opacity-30 blur-xl`} />
                          <Icon className="h-4 w-4 text-foreground/70 mb-2" />
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{tile.label}</div>
                          <div className="text-2xl font-mono font-bold text-foreground mt-0.5">
                            {formatStat(tile.key, value)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Recent Trips
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tripsLoading ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-16 bg-muted rounded w-full"></div>
                    <div className="h-16 bg-muted rounded w-full"></div>
                  </div>
                ) : trips && trips.length > 0 ? (
                  <div className="space-y-3">
                    {trips.slice(0, 5).map((trip) => (
                      <Link key={trip.id} href={`/trips/${trip.id}`} className="group block relative overflow-hidden rounded-lg border border-white/5 bg-black/30 p-3 transition-all hover:border-primary/60 hover:bg-black/50">
                        <div className="absolute left-0 top-0 h-full w-0.5 bg-gradient-amber opacity-60 group-hover:opacity-100 transition-opacity" />
                        <div className="flex justify-between items-start mb-1 pl-1">
                          <div className="text-xs font-mono text-muted-foreground">
                            {new Date(trip.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs font-mono font-bold text-primary">
                            {Math.round(trip.totalDistanceMiles)} mi
                          </div>
                        </div>
                        <div className="text-sm font-medium truncate flex items-center gap-2 pl-1">
                           <span className="truncate w-full max-w-[150px]">{trip.pickupLabel}</span>
                           <span className="text-primary">→</span>
                           <span className="truncate w-full max-w-[150px]">{trip.dropoffLabel}</span>
                        </div>
                      </Link>
                    ))}
                    {trips.length > 5 && (
                      <Link href="/trips" className="block text-center text-sm text-primary hover:underline pt-2">
                        View all {trips.length} trips
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <p className="text-sm">No trips planned yet.</p>
                    <p className="text-xs mt-1">Fill out the form to get started.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
