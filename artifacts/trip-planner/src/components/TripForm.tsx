import { useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, MapPin, Navigation, Flag, Clock, Sparkles } from "lucide-react";

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
});

export function TripForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const planTrip = usePlanTrip();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentLocation: "",
      pickupLocation: "",
      dropoffLocation: "",
      currentCycleUsed: 0,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const tripPlan = await planTrip.mutateAsync({
        data: values
      });
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
      <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
      <CardHeader className="relative">
        <CardTitle className="text-2xl flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Plan a New Trip
        </CardTitle>
        <CardDescription>
          Enter the trip details to calculate the route and generate ELD logs.
        </CardDescription>
      </CardHeader>
      <CardContent className="relative">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
              <FormField
                control={form.control}
                name="currentLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-emerald-400" />Current Location</FormLabel>
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
                      <FormLabel className="flex items-center gap-2"><Navigation className="h-3.5 w-3.5 text-sky-400" />Pickup Location</FormLabel>
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
                      <FormLabel className="flex items-center gap-2"><Flag className="h-3.5 w-3.5 text-rose-400" />Dropoff Location</FormLabel>
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
                    <FormLabel className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-amber-400" />Hours Used in Current Cycle</FormLabel>
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
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-gradient-amber text-black hover:opacity-90 transition-opacity shadow-[0_0_30px_-5px_hsl(36_100%_50%/0.6)]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Calculating Route & Logs...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Plan Trip & Generate Logs
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
