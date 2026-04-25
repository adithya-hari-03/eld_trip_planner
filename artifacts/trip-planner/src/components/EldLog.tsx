import React, { useMemo } from "react";
import { DailyLog, DutyEvent } from "@workspace/api-client-react";

interface EldLogProps {
  log: DailyLog;
}

const ROW_HEIGHT = 28;
const HEADER_HEIGHT = 24;
const GRID_WIDTH = 960; // 24 hours * 40 pixels
const LABEL_WIDTH = 120;
const TOTALS_WIDTH = 60;
const SVG_WIDTH = LABEL_WIDTH + GRID_WIDTH + TOTALS_WIDTH;
const SVG_HEIGHT = HEADER_HEIGHT + ROW_HEIGHT * 4;

const STATUS_ROW_MAP: Record<string, number> = {
  off_duty: 0,
  sleeper_berth: 1,
  driving: 2,
  on_duty_not_driving: 3,
};

const STATUS_LABELS = [
  "1. OFF DUTY",
  "2. SLEEPER BERTH",
  "3. DRIVING",
  "4. ON DUTY (NOT DRIVING)",
];

function formatTime(isoString: string) {
  const date = new Date(isoString);
  let hours = date.getHours();
  let minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
}

export function EldLog({ log }: EldLogProps) {
  const events = log.events || [];

  // Parse time to X coordinate
  const getX = (timeStr: string) => {
    const date = new Date(timeStr);
    // Extract hours, minutes and seconds relative to the log's date in local time
    // But since the API returns ISO strings, let's assume they are absolute times
    // For ELD logs, the start of the day is 00:00. We need to find the offset from midnight.
    // A simpler way: we know it's a 24h period.
    const startOfDay = new Date(log.date + "T00:00:00");
    const diffMs = date.getTime() - startOfDay.getTime();
    let hours = diffMs / (1000 * 60 * 60);
    if (hours < 0) hours = 0;
    if (hours > 24) hours = 24;
    return LABEL_WIDTH + hours * (GRID_WIDTH / 24);
  };

  const lines = [];
  const jumps = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const rowIdx = STATUS_ROW_MAP[event.status];
    const y = HEADER_HEIGHT + rowIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
    const x1 = getX(event.startTime);
    const x2 = getX(event.endTime);

    lines.push(
      <line
        key={`line-${i}`}
        x1={x1}
        y1={y}
        x2={x2}
        y2={y}
        stroke="currentColor"
        strokeWidth="3"
        className="text-primary"
      />
    );

    if (i < events.length - 1) {
      const nextEvent = events[i + 1];
      const nextRowIdx = STATUS_ROW_MAP[nextEvent.status];
      const nextY = HEADER_HEIGHT + nextRowIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
      const nextX = getX(nextEvent.startTime);

      if (y !== nextY) {
        jumps.push(
          <line
            key={`jump-${i}`}
            x1={x2}
            y1={y}
            x2={nextX}
            y2={nextY}
            stroke="currentColor"
            strokeWidth="3"
            className="text-primary"
          />
        );
      }
    }
  }

  const totals = [
    log.totals.offDuty,
    log.totals.sleeperBerth,
    log.totals.driving,
    log.totals.onDutyNotDriving,
  ];

  const remarks = events.filter(e => e.remarks || e.location);

  return (
    <div className="bg-card text-card-foreground border border-border shadow-sm p-6 mb-8 print-break-inside-avoid print-page-break max-w-5xl mx-auto rounded-lg">
      <div className="mb-4 flex justify-between items-start border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Driver's Daily Log</h2>
          <div className="text-muted-foreground text-sm font-mono mt-1">One Calendar Day 24/hr</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold font-mono">{log.date}</div>
          <div className="text-sm text-muted-foreground">Day {log.dayNumber}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6 text-sm">
        <div className="space-y-2">
          <div className="flex justify-between border-b border-border/50 border-dotted pb-1">
            <span className="text-muted-foreground">Total Miles Driving Today:</span>
            <span className="font-mono font-medium">{log.totalMilesDriving}</span>
          </div>
          <div className="flex justify-between border-b border-border/50 border-dotted pb-1">
            <span className="text-muted-foreground">Start Odometer:</span>
            <span className="font-mono font-medium">{log.startOdometer}</span>
          </div>
          <div className="flex justify-between border-b border-border/50 border-dotted pb-1">
            <span className="text-muted-foreground">End Odometer:</span>
            <span className="font-mono font-medium">{log.endOdometer}</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between border-b border-border/50 border-dotted pb-1">
            <span className="text-muted-foreground">From:</span>
            <span className="font-medium truncate ml-2" title={log.fromLocation}>{log.fromLocation}</span>
          </div>
          <div className="flex justify-between border-b border-border/50 border-dotted pb-1">
            <span className="text-muted-foreground">To:</span>
            <span className="font-medium truncate ml-2" title={log.toLocation}>{log.toLocation}</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-auto text-foreground"
          style={{ minWidth: '800px' }}
        >
          {/* Header row */}
          <g className="text-[10px] fill-muted-foreground font-mono">
            {Array.from({ length: 25 }).map((_, i) => {
              const x = LABEL_WIDTH + i * (GRID_WIDTH / 24);
              let label = "";
              if (i === 0) label = "MIDNIGHT";
              else if (i === 12) label = "NOON";
              else if (i === 24) label = "";
              else label = String(i % 12);
              
              return (
                <text key={`h-${i}`} x={x} y={HEADER_HEIGHT - 6} textAnchor="middle">
                  {label}
                </text>
              );
            })}
            <text x={SVG_WIDTH - TOTALS_WIDTH / 2} y={HEADER_HEIGHT - 6} textAnchor="middle" className="font-bold">
              TOTALS
            </text>
          </g>

          {/* Grid lines */}
          {Array.from({ length: 5 }).map((_, i) => {
            const y = HEADER_HEIGHT + i * ROW_HEIGHT;
            return (
              <line key={`hline-${i}`} x1={0} y1={y} x2={SVG_WIDTH} y2={y} stroke="currentColor" strokeWidth="1" className="text-border" />
            );
          })}
          
          {/* Vertical dividers */}
          {Array.from({ length: 25 }).map((_, i) => {
            const x = LABEL_WIDTH + i * (GRID_WIDTH / 24);
            return (
              <line key={`vline-${i}`} x1={x} y1={HEADER_HEIGHT} x2={x} y2={SVG_HEIGHT} stroke="currentColor" strokeWidth={i === 0 || i === 12 || i === 24 ? 2 : 1} className="text-border" />
            );
          })}

          {/* Quarter-hour subdivisions */}
          {Array.from({ length: 24 }).map((_, h) => {
            return Array.from({ length: 3 }).map((_, q) => {
              const x = LABEL_WIDTH + h * (GRID_WIDTH / 24) + (q + 1) * (GRID_WIDTH / 24 / 4);
              return (
                <line key={`sub-${h}-${q}`} x1={x} y1={HEADER_HEIGHT} x2={x} y2={SVG_HEIGHT} stroke="currentColor" strokeWidth="0.5" className="text-border/50" />
              );
            });
          })}

          <line x1={LABEL_WIDTH} y1={HEADER_HEIGHT} x2={LABEL_WIDTH} y2={SVG_HEIGHT} stroke="currentColor" strokeWidth="2" className="text-border" />
          <line x1={SVG_WIDTH - TOTALS_WIDTH} y1={HEADER_HEIGHT} x2={SVG_WIDTH - TOTALS_WIDTH} y2={SVG_HEIGHT} stroke="currentColor" strokeWidth="2" className="text-border" />

          {/* Row Labels and Totals */}
          {STATUS_LABELS.map((label, i) => {
            const y = HEADER_HEIGHT + i * ROW_HEIGHT + ROW_HEIGHT / 2 + 4;
            return (
              <g key={`row-${i}`}>
                <text x={8} y={y} className="text-[11px] font-bold fill-foreground">{label}</text>
                <text x={SVG_WIDTH - TOTALS_WIDTH / 2} y={y} textAnchor="middle" className="text-[12px] font-mono font-bold fill-foreground">
                  {totals[i].toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Render the lines and jumps */}
          {lines}
          {jumps}
        </svg>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <h3 className="font-bold mb-2">Remarks</h3>
        {remarks.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No remarks.</p>
        ) : (
          <div className="space-y-1">
            {remarks.map((event, i) => (
              <div key={i} className="text-sm flex gap-4 border-b border-border/30 pb-1 last:border-0">
                <span className="font-mono text-muted-foreground w-20 shrink-0">
                  {formatTime(event.startTime)}
                </span>
                <span className="w-40 shrink-0 font-medium">
                  {event.location}
                </span>
                <span className="text-foreground">
                  {event.remarks || STATUS_LABELS[STATUS_ROW_MAP[event.status]]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
