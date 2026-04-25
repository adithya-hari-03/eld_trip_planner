import { useListTrips, getListTripsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Route, Calendar, ArrowRight } from "lucide-react";

export default function TripList() {
  const { data: trips, isLoading } = useListTrips({
    query: { queryKey: getListTripsQueryKey() }
  });

  return (
    <div className="min-h-[100dvh] flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">All Trips</h1>
            <p className="text-muted-foreground mt-1">History of all planned routes and ELD logs</p>
          </div>
          <Link href="/" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            Plan New Trip
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 h-24 bg-muted/50"></CardContent>
              </Card>
            ))}
          </div>
        ) : !trips || trips.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed border-2">
            <Route className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No trips found</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              You haven't planned any trips yet. Head back to the dashboard to plan your first route and generate ELD logs.
            </p>
            <Link href="/" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
              Plan First Trip
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {trips.map((trip) => (
              <Link key={trip.id} href={`/trips/${trip.id}`} className="block group">
                <Card className="hover:border-primary transition-colors hover-elevate">
                  <CardContent className="p-6 flex flex-col md:flex-row gap-4 md:items-center justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span className="font-mono">{new Date(trip.createdAt).toLocaleString()}</span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-lg font-medium">
                        <div className="flex items-center gap-2 flex-1">
                          <MapPin className="h-5 w-5 text-blue-500 shrink-0" />
                          <span className="truncate" title={trip.pickupLabel}>{trip.pickupLabel}</span>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="flex items-center gap-2 flex-1">
                          <MapPin className="h-5 w-5 text-red-500 shrink-0" />
                          <span className="truncate" title={trip.dropoffLabel}>{trip.dropoffLabel}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 md:border-l md:border-border md:pl-6 pt-4 md:pt-0 border-t border-border mt-4 md:mt-0">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground uppercase">Distance</span>
                        <span className="font-mono font-bold text-lg">{Math.round(trip.totalDistanceMiles)} mi</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground uppercase">Duration</span>
                        <span className="font-mono font-bold text-lg">{trip.totalDays} {trip.totalDays === 1 ? 'day' : 'days'}</span>
                      </div>
                      <div className="text-primary hidden sm:block">
                        <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
