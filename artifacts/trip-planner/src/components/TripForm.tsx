import { useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Loader2,
  MapPin,
  Navigation,
  Flag,
  Clock,
  Sparkles,
  ChevronDown,
  User,
  Building2,
  Truck,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { usePlanTrip } from "@workspace/api-client-react";

const formSchema = z.object({
  currentLocation: z.string().min(2, {
    message: "Current location must be at least 2 characters.",
  }),
  pickupLocation: z.string().min(2, {
    message: "Pickup location must be at least 2 characters.",
  }),
  dropoffLocation: z.string().min(2, {
    message: "Dropoff location must be at least 2 characters.",
  }),
  currentCycleUsed: z.coerce.number().min(0).max(70, {
    message: "Cycle hours must be between 0 and 70.",
  }),
  driverName: z.string().optional(),
  coDriverName: z.string().optional(),
  carrierName: z.string().optional(),
  homeTerminal: z.string().optional(),
  vehicleNumber: z.string().optional(),
  trailerNumber: z.string().optional(),
  shippingDocNumber: z.string().optional(),
});

export function TripForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const planTrip = usePlanTrip();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [driverInfoOpen, setDriverInfoOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentLocation: "",
      pickupLocation: "",
      dropoffLocation: "",
      currentCycleUsed: 0,
      driverName: "",
      coDriverName: "",
      carrierName: "",
      homeTerminal: "",
      vehicleNumber: "",
      trailerNumber: "",
      shippingDocNumber: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const tripPlan = await planTrip.mutateAsync({ data: values });
      toast({
        title: "Trip planned successfully",
        description: "Your ELD logs have been generated.",
      });
      setLocation(`/trips/${tripPlan.id}`);
    } catch (error) {
      console.error(error);
      toast({
        title: "Failed to plan trip",
        description: "An error occurred while generating the trip plan.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full bg-gradient-card border-card-border ring-amber-soft relative overflow-hidden">
      <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />
      <CardHeader className="relative">
        <CardTitle className="text-2xl flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Plan a New Trip
        </CardTitle>
        <CardDescription>
          Enter your trip details to compute the route, rest stops and FMCSA-compliant logs.
        </CardDescription>
      </CardHeader>
      <CardContent className="relative">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="currentLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                    Current Location
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Chicago, IL" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="pickupLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Navigation className="h-3.5 w-3.5 text-cyan-400" />
                      Pickup Location
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Gary, IN" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dropoffLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Flag className="h-3.5 w-3.5 text-rose-400" />
                      Dropoff Location
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Dallas, TX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="currentCycleUsed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                    Hours Used in Current Cycle
                  </FormLabel>
                  <FormControl>
                    <Input type="number" min="0" max="70" step="0.5" {...field} />
                  </FormControl>
                  <FormDescription>
                    Hours already used in your current 70-hour / 8-day cycle.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Collapsible open={driverInfoOpen} onOpenChange={setDriverInfoOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between text-left rounded-md border border-dashed border-border bg-background/30 px-4 py-3 text-sm font-medium hover:border-primary/60 hover:bg-background/50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-cyan-400" />
                    Driver &amp; Vehicle Info
                    <span className="text-xs font-normal text-muted-foreground">
                      (optional, prints on each log sheet)
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      driverInfoOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="driverName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-xs">
                          <User className="h-3 w-3 text-cyan-400" /> Driver Name
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="John Smith" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="coDriverName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-xs">
                          <User className="h-3 w-3 text-cyan-400" /> Co-Driver Name
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="(optional)" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="carrierName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-xs">
                          <Building2 className="h-3 w-3 text-cyan-400" /> Motor Carrier
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Logistics LLC" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="homeTerminal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-xs">
                          <MapPin className="h-3 w-3 text-cyan-400" /> Home Terminal
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Home terminal city" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vehicleNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-xs">
                          <Truck className="h-3 w-3 text-cyan-400" /> Truck / Tractor #
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="T-1042" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="trailerNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-xs">
                          <Truck className="h-3 w-3 text-cyan-400" /> Trailer #
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="TR-882" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="shippingDocNumber"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="flex items-center gap-2 text-xs">
                          <FileText className="h-3 w-3 text-cyan-400" /> BOL / Manifest #
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Shipping document number" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-gradient-amber text-black hover:opacity-90 transition-opacity shadow-[0_0_30px_-5px_hsl(36_100%_55%/0.6)]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Calculating Route &amp; Logs...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Plan Trip &amp; Generate Logs
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
