import { useState } from "react";
import {
  useListTrips,
  getListTripsQueryKey,
  useDeleteTrip,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, Route, Calendar, ArrowRight, Trash2, Loader2, User } from "lucide-react";

export default function TripList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: trips, isLoading } = useListTrips({
    query: { queryKey: getListTripsQueryKey() },
  });
  const deleteTrip = useDeleteTrip();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete;
    try {
      await deleteTrip.mutateAsync({ id });
      await queryClient.invalidateQueries({ queryKey: getListTripsQueryKey() });
      toast({
        title: "Trip deleted",
        description: `Trip ${id.slice(0, 8)} has been removed.`,
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "Failed to delete trip",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-gradient-aurora">All Trips</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Every planned route, rest schedule, and ELD log saved in your account.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gradient-amber text-black hover:opacity-90 h-10 px-4 py-2 shadow-[0_0_20px_-5px_hsl(36_100%_55%/0.6)]"
          >
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
          <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed border-2 bg-gradient-card">
            <Route className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No trips found</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              You haven't planned any trips yet. Head back to the dashboard to plan
              your first route and generate ELD logs.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gradient-amber text-black hover:opacity-90 h-10 px-4 py-2"
            >
              Plan First Trip
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {trips.map((trip) => (
              <Card
                key={trip.id}
                className="group relative bg-gradient-card border-card-border hover:border-primary/60 transition-colors overflow-hidden"
              >
                <div className="absolute left-0 top-0 h-full w-1 bg-gradient-amber opacity-60 group-hover:opacity-100 transition-opacity" />
                <CardContent className="p-6 flex flex-col md:flex-row gap-4 md:items-center justify-between">
                  <Link href={`/trips/${trip.id}`} className="flex-1 space-y-3 block">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="font-mono">
                          {new Date(trip.createdAt).toLocaleString()}
                        </span>
                      </span>
                      {trip.driverName ? (
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-cyan-400" />
                          {trip.driverName}
                        </span>
                      ) : null}
                      {trip.carrierName ? (
                        <span className="text-cyan-400/80 font-medium">
                          {trip.carrierName}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3 text-base md:text-lg font-medium">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <MapPin className="h-5 w-5 text-cyan-400 shrink-0" />
                        <span className="truncate" title={trip.pickupLabel}>
                          {trip.pickupLabel}
                        </span>
                      </div>
                      <ArrowRight className="h-5 w-5 text-primary shrink-0" />
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <MapPin className="h-5 w-5 text-rose-400 shrink-0" />
                        <span className="truncate" title={trip.dropoffLabel}>
                          {trip.dropoffLabel}
                        </span>
                      </div>
                    </div>
                  </Link>

                  <div className="flex items-center gap-6 md:border-l md:border-border md:pl-6 pt-4 md:pt-0 border-t border-border mt-4 md:mt-0">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Distance
                      </span>
                      <span className="font-mono font-bold text-lg text-amber-400">
                        {Math.round(trip.totalDistanceMiles)} mi
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Duration
                      </span>
                      <span className="font-mono font-bold text-lg text-cyan-400">
                        {trip.totalDays} {trip.totalDays === 1 ? "day" : "days"}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                      title="Delete trip"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPendingDelete(trip.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this trip?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the trip plan and all its daily ELD logs.
              You cannot undo this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteTrip.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTrip.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete trip
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
