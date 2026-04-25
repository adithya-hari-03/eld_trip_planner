import { useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetTrip,
  getGetTripQueryKey,
  useDeleteTrip,
  getListTripsQueryKey,
  getGetTripStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { TripMap } from "@/components/TripMap";
import { EldLog } from "@/components/EldLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import {
  MapPin,
  Clock,
  CalendarDays,
  AlertTriangle,
  Printer,
  Navigation,
  Fuel,
  Coffee,
  Moon,
  PowerOff,
  Download,
  Loader2,
  Trash2,
  User,
  Building2,
  Truck,
  FileText,
} from "lucide-react";

export default function TripDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { data: trip, isLoading, error } = useGetTrip(id!, {
    query: { enabled: !!id, queryKey: getGetTripQueryKey(id!) },
  });
  const deleteTrip = useDeleteTrip();
  const logsRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { toast } = useToast();

  const handleDownloadPdf = async () => {
    if (!logsRef.current || !trip) return;
    setIsDownloading(true);
    try {
      const [{ default: jsPDF }, html2canvasMod] = await Promise.all([
        import("jspdf"),
        import("html2canvas-pro"),
      ]);
      const html2canvas = html2canvasMod.default;

      const logCards = Array.from(
        logsRef.current.querySelectorAll<HTMLElement>("[data-eld-log]")
      );
      if (logCards.length === 0) throw new Error("No log sheets to export");

      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 24;

      for (let i = 0; i < logCards.length; i++) {
        const canvas = await html2canvas(logCards[i], {
          backgroundColor: "#ffffff",
          scale: 2,
          useCORS: true,
        } as any);
        const imgData = canvas.toDataURL("image/png");
        const availW = pageWidth - margin * 2;
        const availH = pageHeight - margin * 2;
        const ratio = Math.min(availW / canvas.width, availH / canvas.height);
        const w = canvas.width * ratio;
        const h = canvas.height * ratio;
        const x = (pageWidth - w) / 2;
        const y = (pageHeight - h) / 2;
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", x, y, w, h);
      }

      const filename = `eld-logs-${trip.id.substring(0, 8)}.pdf`;
      pdf.save(filename);
      toast({
        title: "PDF downloaded",
        description: `${logCards.length} daily log sheet${logCards.length === 1 ? "" : "s"} saved as ${filename}.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Failed to generate PDF",
        description: "Please try again or use the Print option.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!trip) return;
    try {
      await deleteTrip.mutateAsync({ id: trip.id });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListTripsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetTripStatsQueryKey() }),
      ]);
      toast({
        title: "Trip deleted",
        description: `Trip ${trip.id.slice(0, 8)} has been removed.`,
      });
      navigate("/trips");
    } catch (e) {
      console.error(e);
      toast({
        title: "Failed to delete trip",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setConfirmOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-muted-foreground font-medium animate-pulse">
              Loading trip details...
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto border-destructive/50 mt-12">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Trip Not Found</h2>
              <p className="text-muted-foreground mb-6">
                We couldn't load this trip. It may have been deleted or the link is invalid.
              </p>
              <Button onClick={() => navigate("/trips")} variant="outline">
                Back to All Trips
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const fuelStopsCount = trip.stops.filter((s) => s.kind === "fuel").length;

  const handlePrint = () => {
    window.print();
  };

  const getStopIcon = (kind: string) => {
    switch (kind) {
      case "start":
        return <PowerOff className="h-4 w-4" />;
      case "pickup":
        return <MapPin className="h-4 w-4" />;
      case "dropoff":
        return <MapPin className="h-4 w-4" />;
      case "fuel":
        return <Fuel className="h-4 w-4" />;
      case "rest_30min":
        return <Coffee className="h-4 w-4" />;
      case "rest_10hr":
        return <Moon className="h-4 w-4" />;
      case "reset_34hr":
        return <Moon className="h-4 w-4" />;
      case "end_of_day":
        return <PowerOff className="h-4 w-4" />;
      default:
        return <Navigation className="h-4 w-4" />;
    }
  };

  const driverFields: Array<{ label: string; value?: string; icon: any }> = [
    { label: "Driver", value: (trip as any).driverName, icon: User },
    { label: "Carrier", value: (trip as any).carrierName, icon: Building2 },
    { label: "Truck #", value: (trip as any).vehicleNumber, icon: Truck },
    { label: "Trailer #", value: (trip as any).trailerNumber, icon: Truck },
    { label: "BOL #", value: (trip as any).shippingDocNumber, icon: FileText },
  ];
  const filledDriverFields = driverFields.filter((f) => f.value);

  return (
    <div className="min-h-screen flex flex-col print:bg-white">
      <div className="no-print">
        <Header />
      </div>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 no-print">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-gradient-aurora">Trip Details</span>
            </h1>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <span>Created {new Date(trip.createdAt).toLocaleString()}</span>
              <span>•</span>
              <span className="font-mono">ID: {trip.id.substring(0, 8)}</span>
            </div>
          </div>
          <div className="flex gap-2 self-start md:self-auto">
            <Button onClick={handlePrint} variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="gap-2 bg-gradient-amber text-black hover:opacity-90 shadow-[0_0_20px_-5px_hsl(36_100%_55%/0.6)]"
            >
              {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isDownloading ? "Generating PDF..." : "Download PDF"}
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              variant="outline"
              className="gap-2 border-rose-500/40 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 no-print">
          <Badge variant="secondary" className="bg-card text-foreground border-border px-3 py-1">
            <MapPin className="h-3 w-3 mr-1" /> Current: {trip.request.currentLocation}
          </Badge>
          <Badge variant="secondary" className="bg-card text-foreground border-border px-3 py-1">
            <Navigation className="h-3 w-3 mr-1 text-cyan-400" /> Pickup: {trip.request.pickupLocation}
          </Badge>
          <Badge variant="secondary" className="bg-card text-foreground border-border px-3 py-1">
            <Navigation className="h-3 w-3 mr-1 text-rose-400" /> Dropoff: {trip.request.dropoffLocation}
          </Badge>
          <Badge variant="secondary" className="bg-card text-foreground border-border px-3 py-1">
            <Clock className="h-3 w-3 mr-1 text-amber-400" /> Cycle Used: {trip.request.currentCycleUsed} hrs
          </Badge>
        </div>

        {filledDriverFields.length > 0 && (
          <Card className="mb-6 bg-gradient-card border-card-border ring-teal-soft no-print">
            <CardContent className="py-4 flex flex-wrap gap-x-6 gap-y-2">
              {filledDriverFields.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.label} className="flex items-center gap-2 text-sm">
                    <Icon className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="text-muted-foreground text-xs uppercase tracking-wider">
                      {f.label}:
                    </span>
                    <span className="font-medium">{f.value}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 no-print">
          <div className="lg:col-span-2 space-y-8">
            <Card className="overflow-hidden">
              <div className="h-[450px]">
                <TripMap geometry={trip.geometry} stops={trip.stops} />
              </div>
            </Card>

            {trip.warnings && trip.warnings.length > 0 && (
              <Card className="border-amber-500/40 bg-amber-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-amber-400 flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5" />
                    Trip Warnings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-amber-200/90 font-medium">
                    {trip.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="bg-gradient-card border-card-border ring-amber-soft">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Trip Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <SummaryRow icon={<Navigation className="h-4 w-4" />} label="Total Distance" value={`${Math.round(trip.totalDistanceMiles)} mi`} />
                <Separator />
                <SummaryRow icon={<Clock className="h-4 w-4" />} label="Drive Time" value={`${trip.totalDrivingHours.toFixed(1)} hrs`} />
                <Separator />
                <SummaryRow icon={<Clock className="h-4 w-4" />} label="Total Duration" value={`${trip.totalTripHours.toFixed(1)} hrs`} />
                <Separator />
                <SummaryRow icon={<CalendarDays className="h-4 w-4" />} label="Days Required" value={String(trip.totalDays)} />
                <Separator />
                <SummaryRow icon={<Fuel className="h-4 w-4" />} label="Fuel Stops" value={String(fuelStopsCount)} />
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-card-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Itinerary Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative pl-6 border-l-2 border-muted space-y-6">
                  {trip.stops.map((stop, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[35px] top-1 bg-card rounded-full p-1 border-2 border-primary text-primary">
                        {getStopIcon(stop.kind)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm capitalize">
                          {stop.kind.replace(/_/g, " ")}
                        </h4>
                        <p className="text-sm font-medium">{stop.label}</p>
                        <div className="text-xs text-muted-foreground mt-1 flex flex-col gap-1">
                          <span>
                            {new Date(stop.arrivalTime).toLocaleString([], {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span>Mile {Math.round(stop.mileMarker)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="print:block print:w-full">
          <div className="no-print mb-6">
            <h2 className="text-2xl font-bold">Driver's Daily Logs</h2>
            <p className="text-muted-foreground">
              FMCSA-compliant Hours of Service records generated for this trip.
            </p>
          </div>

          <div ref={logsRef} className="space-y-8 print:space-y-0">
            {trip.dailyLogs.map((log, idx) => (
              <div
                key={idx}
                data-eld-log
                className="bg-white text-slate-900 rounded-lg overflow-hidden shadow-2xl"
              >
                <EldLog log={log} />
              </div>
            ))}
          </div>
        </div>
      </main>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this trip?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the trip plan and all its daily ELD logs. You
              cannot undo this action.
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

function SummaryRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground flex items-center gap-2">{icon} {label}</span>
      <span className="font-bold font-mono text-lg">{value}</span>
    </div>
  );
}
