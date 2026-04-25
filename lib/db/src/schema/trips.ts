import { pgTable, text, timestamp, jsonb, doublePrecision, integer } from "drizzle-orm/pg-core";

export const tripsTable = pgTable("trips", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  currentLocation: text("current_location").notNull(),
  pickupLocation: text("pickup_location").notNull(),
  dropoffLocation: text("dropoff_location").notNull(),
  currentCycleUsed: doublePrecision("current_cycle_used").notNull(),
  totalDistanceMiles: doublePrecision("total_distance_miles").notNull(),
  totalDrivingHours: doublePrecision("total_driving_hours").notNull(),
  totalRestHours: doublePrecision("total_rest_hours").notNull(),
  totalFuelStops: integer("total_fuel_stops").notNull(),
  totalDays: integer("total_days").notNull(),
  plan: jsonb("plan").notNull(),
});

export type TripRow = typeof tripsTable.$inferSelect;
export type InsertTrip = typeof tripsTable.$inferInsert;
