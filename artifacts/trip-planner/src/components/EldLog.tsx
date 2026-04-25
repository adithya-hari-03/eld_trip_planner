import { useMemo, type ReactElement } from "react";
import { DailyLog } from "@workspace/api-client-react";

interface EldLogProps {
  log: DailyLog;
}

const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 28;
const GRID_WIDTH = 1080;
const LABEL_WIDTH = 150;
const TOTALS_WIDTH = 70;
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

const ROW_COLORS = [
  "#fde68a", // off_duty - soft amber
  "#bfdbfe", // sleeper_berth - soft blue
  "#bbf7d0", // driving - soft green
  "#fecaca", // on_duty_not_driving - soft rose
];

function formatTime(isoString: string) {
  const date = new Date(isoString);
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? "0" + minutes : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
}

export function EldLog({ log }: EldLogProps) {
  const events = log.events || [];

  const getX = (timeStr: string) => {
    const date = new Date(timeStr);
    const startOfDay = new Date(log.date + "T00:00:00");
    const diffMs = date.getTime() - startOfDay.getTime();
    let hours = diffMs / (1000 * 60 * 60);
    if (hours < 0) hours = 0;
    if (hours > 24) hours = 24;
    return LABEL_WIDTH + hours * (GRID_WIDTH / 24);
  };

  const { lines, jumps } = useMemo(() => {
    const ls: ReactElement[] = [];
    const js: ReactElement[] = [];
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const rowIdx = STATUS_ROW_MAP[event.status];
      if (rowIdx === undefined) continue;
      const y = HEADER_HEIGHT + rowIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
      const x1 = getX(event.startTime);
      const x2 = getX(event.endTime);

      ls.push(
        <line
          key={`line-${i}`}
          x1={x1}
          y1={y}
          x2={x2}
          y2={y}
          stroke="#0f172a"
          strokeWidth={4}
          strokeLinecap="square"
        />
      );

      if (i < events.length - 1) {
        const nextEvent = events[i + 1];
        const nextRowIdx = STATUS_ROW_MAP[nextEvent.status];
        if (nextRowIdx === undefined) continue;
        const nextY = HEADER_HEIGHT + nextRowIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
        if (y !== nextY) {
          js.push(
            <line
              key={`jump-${i}`}
              x1={x2}
              y1={y}
              x2={x2}
              y2={nextY}
              stroke="#0f172a"
              strokeWidth={4}
              strokeLinecap="square"
            />
          );
        }
      }
    }
    return { lines: ls, jumps: js };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, log.date]);

  const totals = [
    log.totals.offDuty,
    log.totals.sleeperBerth,
    log.totals.driving,
    log.totals.onDutyNotDriving,
  ];
  const totalAll = totals.reduce((a, b) => a + b, 0);

  const remarks = events.filter((e) => e.remarks || e.location);

  // FMCSA header fields with sensible placeholders if not supplied.
  const driverName = (log as any).driverName || "—";
  const coDriverName = (log as any).coDriverName || "—";
  const carrierName = (log as any).carrierName || "—";
  const homeTerminal = (log as any).homeTerminal || "—";
  const vehicleNumber = (log as any).vehicleNumber || "—";
  const trailerNumber = (log as any).trailerNumber || "—";
  const shippingDocNumber = (log as any).shippingDocNumber || "—";

  return (
    <div className="bg-white text-slate-900 p-6 print-break-inside-avoid print-page-break max-w-5xl mx-auto">
      {/* Title block */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight uppercase">Driver's Daily Log</h2>
          <div className="text-xs text-slate-600 mt-0.5 font-mono">
            One Calendar Day &nbsp;·&nbsp; 24 hours &nbsp;·&nbsp; FMCSA 49 CFR §395
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-mono font-bold">{log.date}</div>
          <div className="text-xs text-slate-600 uppercase tracking-wider">Day {log.dayNumber}</div>
        </div>
      </div>

      {/* Driver / carrier / vehicle block */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs mb-4">
        <Field label="Driver" value={driverName} />
        <Field label="Co-Driver" value={coDriverName} />
        <Field label="Carrier" value={carrierName} />
        <Field label="Home Terminal" value={homeTerminal} />
        <Field label="Truck / Tractor #" value={vehicleNumber} />
        <Field label="Trailer #" value={trailerNumber} />
        <Field label="From" value={log.fromLocation} />
        <Field label="To" value={log.toLocation} />
        <Field label="BOL / Manifest #" value={shippingDocNumber} />
        <Field label="Total Miles Driving" value={String(log.totalMilesDriving)} />
        <Field label="Start Odometer" value={String(log.startOdometer)} />
        <Field label="End Odometer" value={String(log.endOdometer)} />
      </div>

      {/* The 24-hour grid */}
      <div className="overflow-x-auto pb-2 border border-slate-900">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-auto"
          style={{ minWidth: "900px" }}
        >
          {/* Row backgrounds */}
          {STATUS_LABELS.map((_, i) => (
            <rect
              key={`bg-${i}`}
              x={LABEL_WIDTH}
              y={HEADER_HEIGHT + i * ROW_HEIGHT}
              width={GRID_WIDTH}
              height={ROW_HEIGHT}
              fill={ROW_COLORS[i]}
              opacity={0.35}
            />
          ))}

          {/* Header row labels (hours) */}
          <g className="font-mono" style={{ fontSize: 11, fill: "#0f172a" }}>
            {Array.from({ length: 25 }).map((_, i) => {
              const x = LABEL_WIDTH + i * (GRID_WIDTH / 24);
              let label = "";
              if (i === 0 || i === 24) label = "Mid";
              else if (i === 12) label = "Noon";
              else label = String(i % 12 || 12);
              return (
                <text key={`h-${i}`} x={x} y={HEADER_HEIGHT - 8} textAnchor="middle" fontWeight={i % 6 === 0 ? 700 : 400}>
                  {label}
                </text>
              );
            })}
            <text
              x={SVG_WIDTH - TOTALS_WIDTH / 2}
              y={HEADER_HEIGHT - 8}
              textAnchor="middle"
              fontWeight={700}
            >
              TOTAL
            </text>
          </g>

          {/* Quarter-hour subdivisions */}
          {Array.from({ length: 24 }).map((_, h) =>
            Array.from({ length: 3 }).map((_, q) => {
              const x = LABEL_WIDTH + h * (GRID_WIDTH / 24) + (q + 1) * (GRID_WIDTH / 24 / 4);
              return (
                <line
                  key={`sub-${h}-${q}`}
                  x1={x}
                  y1={HEADER_HEIGHT}
                  x2={x}
                  y2={SVG_HEIGHT}
                  stroke="#94a3b8"
                  strokeWidth={0.5}
                />
              );
            })
          )}

          {/* Hour vertical dividers */}
          {Array.from({ length: 25 }).map((_, i) => {
            const x = LABEL_WIDTH + i * (GRID_WIDTH / 24);
            const isMajor = i === 0 || i === 6 || i === 12 || i === 18 || i === 24;
            return (
              <line
                key={`vline-${i}`}
                x1={x}
                y1={HEADER_HEIGHT}
                x2={x}
                y2={SVG_HEIGHT}
                stroke="#0f172a"
                strokeWidth={isMajor ? 1.5 : 0.8}
              />
            );
          })}

          {/* Horizontal row dividers */}
          {Array.from({ length: 5 }).map((_, i) => {
            const y = HEADER_HEIGHT + i * ROW_HEIGHT;
            return (
              <line
                key={`hline-${i}`}
                x1={0}
                y1={y}
                x2={SVG_WIDTH}
                y2={y}
                stroke="#0f172a"
                strokeWidth={1}
              />
            );
          })}

          {/* Label column divider */}
          <line
            x1={LABEL_WIDTH}
            y1={0}
            x2={LABEL_WIDTH}
            y2={SVG_HEIGHT}
            stroke="#0f172a"
            strokeWidth={1.5}
          />
          <line
            x1={SVG_WIDTH - TOTALS_WIDTH}
            y1={0}
            x2={SVG_WIDTH - TOTALS_WIDTH}
            y2={SVG_HEIGHT}
            stroke="#0f172a"
            strokeWidth={1.5}
          />

          {/* Status row labels and totals */}
          {STATUS_LABELS.map((label, i) => {
            const y = HEADER_HEIGHT + i * ROW_HEIGHT + ROW_HEIGHT / 2 + 4;
            return (
              <g key={`row-${i}`}>
                <text x={8} y={y} fontSize={11} fontWeight={700} fill="#0f172a">
                  {label}
                </text>
                <text
                  x={SVG_WIDTH - TOTALS_WIDTH / 2}
                  y={y}
                  textAnchor="middle"
                  fontFamily="monospace"
                  fontSize={13}
                  fontWeight={700}
                  fill="#0f172a"
                >
                  {totals[i].toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Step lines */}
          {lines}
          {jumps}
        </svg>
      </div>

      {/* Total line */}
      <div className="flex justify-end items-center gap-3 border-b-2 border-slate-900 py-2 text-xs">
        <span className="font-bold uppercase tracking-wider">Total Hours</span>
        <span className="font-mono font-bold text-base">{totalAll.toFixed(2)} / 24.00</span>
      </div>

      {/* Remarks */}
      <div className="mt-3">
        <h3 className="font-bold text-sm mb-1.5 uppercase tracking-wider">Remarks</h3>
        {remarks.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No remarks for this day.</p>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-400 text-slate-600 text-left">
                <th className="py-1 font-medium w-20">Time</th>
                <th className="py-1 font-medium w-48">Location</th>
                <th className="py-1 font-medium">Remark</th>
              </tr>
            </thead>
            <tbody>
              {remarks.map((event, i) => (
                <tr key={i} className="border-b border-slate-200 last:border-0">
                  <td className="py-1 font-mono text-slate-700 align-top">
                    {formatTime(event.startTime)}
                  </td>
                  <td className="py-1 align-top font-medium">{event.location}</td>
                  <td className="py-1 align-top text-slate-700">
                    {event.remarks ||
                      STATUS_LABELS[STATUS_ROW_MAP[event.status]]?.replace(/^\d+\.\s*/, "")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Signature line */}
      <div className="mt-6 grid grid-cols-2 gap-8 text-xs">
        <div>
          <div className="border-b border-slate-900 pb-6"></div>
          <div className="text-slate-600 mt-1">Driver's Signature</div>
        </div>
        <div>
          <div className="border-b border-slate-900 pb-6"></div>
          <div className="text-slate-600 mt-1">Date</div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-slate-300 pb-1">
      <span className="text-slate-500 uppercase tracking-wider text-[10px] shrink-0">{label}:</span>
      <span className="font-medium truncate" title={value}>
        {value}
      </span>
    </div>
  );
}
