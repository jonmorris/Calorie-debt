import { useState } from 'react';
import {
  Flame,
  Calendar,
  Utensils,
  Footprints,
  Activity,
  AlertTriangle,
  Target,
  TrendingDown,
  TrendingUp,
  PartyPopper,
  X,
  Maximize2,
  Info,
  Plus,
  Lightbulb,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { formatCal, CALORIES_PER_POUND } from '../utils/calculations';

function MetricCard({ icon: Icon, label, value, subtext, accent = 'emerald' }) {
  const colors = {
    emerald: 'text-emerald-400',
    rose: 'text-rose-400',
    amber: 'text-amber-400',
    indigo: 'text-indigo-400',
    zinc: 'text-zinc-300',
  };
  const textColor = colors[accent] || colors.emerald;

  return (
    <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800/60">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${textColor}`} />
        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className={`text-xl font-bold ${textColor}`}>{value}</div>
      {subtext && (
        <div className="text-[11px] text-zinc-500 mt-1">{subtext}</div>
      )}
    </div>
  );
}

// --- Data generators ---

function generateSchedule(currentWeight, targetWeight, lbsPerWeek, targetDate, isLosing) {
  const schedule = [];
  const now = new Date();
  let weight = currentWeight;
  const lbsPerMonth = lbsPerWeek * 4.345;
  const cursor = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const end = new Date(targetDate + 'T00:00:00');

  while (cursor <= end && schedule.length < 18) {
    weight += isLosing ? -lbsPerMonth : lbsPerMonth;
    const clampedWeight = isLosing
      ? Math.max(targetWeight, weight)
      : Math.min(targetWeight, weight);
    schedule.push({
      label: cursor.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      weight: Math.round(clampedWeight * 10) / 10,
      isTarget: Math.abs(clampedWeight - targetWeight) < 0.5,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return schedule;
}

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtLabel(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtTick(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function generateWeightChartData(currentWeight, targetWeight, lbsPerWeek, targetDate, isLosing, entries) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(targetDate + 'T00:00:00');
  const lbsPerDay = lbsPerWeek / 7;

  const getProjected = (date) => {
    const days = (date - now) / (1000 * 60 * 60 * 24);
    const w = currentWeight + (isLosing ? -1 : 1) * lbsPerDay * days;
    return isLosing ? Math.max(targetWeight, w) : Math.min(targetWeight, w);
  };

  const dateMap = new Map();
  const cursor = new Date(now);
  while (cursor <= end) {
    dateMap.set(toDateStr(cursor), new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  if (!dateMap.has(toDateStr(end))) dateMap.set(toDateStr(end), new Date(end));

  const actualMap = new Map();
  for (const entry of entries) {
    actualMap.set(entry.date, entry.weight);
    if (!dateMap.has(entry.date)) dateMap.set(entry.date, new Date(entry.date + 'T00:00:00'));
  }

  const sorted = [...dateMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  // Compute dot colors: one green (lowest), red (higher than prev), blue (default)
  const actualEntries = sorted
    .filter(([ds]) => actualMap.has(ds))
    .map(([ds]) => ({ date: ds, weight: actualMap.get(ds) }));

  const dotColors = new Map();
  if (actualEntries.length > 0) {
    // Find the single lowest weight — last occurrence if tied
    let lowestVal = Infinity;
    let lowestDate = null;
    for (const entry of actualEntries) {
      if (entry.weight <= lowestVal) {
        lowestVal = entry.weight;
        lowestDate = entry.date;
      }
    }

    // Assign colors
    let prevWeight = null;
    for (const entry of actualEntries) {
      let color = '#60a5fa'; // blue default
      if (prevWeight !== null && entry.weight > prevWeight) {
        color = '#f87171'; // red - higher than previous
      }
      if (entry.date === lowestDate) {
        color = '#34d399'; // green - the single lowest
      }
      prevWeight = entry.weight;
      dotColors.set(entry.date, color);
    }
  }

  // Build base data with ±8% range band
  const RANGE = 0.08;
  const data = sorted.map(([ds, date]) => {
    const proj = Math.round(getProjected(date) * 10) / 10;
    const loss = currentWeight - proj;
    return {
      label: fmtLabel(date),
      ts: date.getTime(),
      dateStr: ds,
      projected: proj,
      planHigh: Math.round((proj + loss * RANGE) * 10) / 10,
      planLow: Math.round((proj - loss * RANGE) * 10) / 10,
      actual: actualMap.has(ds) ? actualMap.get(ds) : null,
      revised: null,
      dotColor: dotColors.get(ds) || '#60a5fa',
    };
  });

  // Revised projection: from latest actual entry forward at same rate
  if (actualEntries.length > 0) {
    const latest = actualEntries[actualEntries.length - 1];
    const latestDate = new Date(latest.date + 'T00:00:00');
    for (const point of data) {
      const pointDate = new Date(point.dateStr + 'T00:00:00');
      if (pointDate >= latestDate) {
        const daysSinceLast = (pointDate - latestDate) / (1000 * 60 * 60 * 24);
        const w = latest.weight + (isLosing ? -1 : 1) * lbsPerDay * daysSinceLast;
        const clamped = isLosing ? Math.max(targetWeight, w) : Math.min(targetWeight, w);
        point.revised = Math.round(clamped * 10) / 10;
      }
    }
  }

  return data;
}

function generateDeficitChartData(targetWeight, totalDeficit, days, targetDate, isLosing, entries) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(targetDate + 'T00:00:00');

  const dateMap = new Map();
  const cursor = new Date(now);
  while (cursor <= end) {
    dateMap.set(toDateStr(cursor), new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  if (!dateMap.has(toDateStr(end))) dateMap.set(toDateStr(end), new Date(end));

  const actualMap = new Map();
  for (const entry of entries) {
    actualMap.set(entry.date, entry.weight);
    if (!dateMap.has(entry.date)) dateMap.set(entry.date, new Date(entry.date + 'T00:00:00'));
  }

  const sorted = [...dateMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  // Build raw data first
  const rawData = sorted.map(([ds, date]) => {
    const daysSinceStart = Math.max(0, (date - now) / (1000 * 60 * 60 * 24));
    const planned = Math.max(0, Math.round(totalDeficit * (1 - daysSinceStart / days)));

    let actual = null;
    if (actualMap.has(ds)) {
      actual = Math.max(0, Math.round(
        Math.abs(actualMap.get(ds) - targetWeight) * CALORIES_PER_POUND
      ));
    }

    const progress = totalDeficit - planned;
    return {
      label: fmtLabel(date), ts: date.getTime(), dateStr: ds, planned, actual, revised: null,
      planHigh: Math.round(planned + progress * 0.08),
      planLow: Math.max(0, Math.round(planned - progress * 0.08)),
    };
  });

  // Compute dot colors: one green (lowest balance), red (higher than prev), blue (default)
  const actualPoints = rawData.filter((d) => d.actual != null);
  if (actualPoints.length > 0) {
    // Find the single lowest balance — last occurrence if tied
    let lowestVal = Infinity;
    let lowestIdx = 0;
    for (let i = 0; i < actualPoints.length; i++) {
      if (actualPoints[i].actual <= lowestVal) {
        lowestVal = actualPoints[i].actual;
        lowestIdx = i;
      }
    }

    let prevBalance = null;
    for (let i = 0; i < actualPoints.length; i++) {
      let color = '#60a5fa';
      if (prevBalance !== null && actualPoints[i].actual > prevBalance) {
        color = '#f87171';
      }
      if (i === lowestIdx) {
        color = '#34d399';
      }
      prevBalance = actualPoints[i].actual;
      actualPoints[i].dotColor = color;
    }
  }

  // Merge colors back
  const colorMap = new Map();
  for (const p of actualPoints) colorMap.set(p.dateStr, p.dotColor);
  for (const d of rawData) d.dotColor = colorMap.get(d.dateStr) || '#60a5fa';

  // Revised projection: from latest actual balance forward at same daily rate
  const dailyDeficit = totalDeficit / days;
  if (actualPoints.length > 0) {
    const latest = actualPoints[actualPoints.length - 1];
    const latestDate = new Date(latest.dateStr + 'T00:00:00');
    for (const point of rawData) {
      const pointDate = new Date(point.dateStr + 'T00:00:00');
      if (pointDate >= latestDate) {
        const daysSinceLast = (pointDate - latestDate) / (1000 * 60 * 60 * 24);
        point.revised = Math.max(0, Math.round(latest.actual - dailyDeficit * daysSinceLast));
      }
    }
  }

  return rawData;
}

// --- Custom dot renderer ---

function ColoredDot({ cx, cy, payload }) {
  if (cx == null || cy == null || payload?.actual == null) return null;
  const color = payload.dotColor || '#60a5fa';
  return (
    <circle cx={cx} cy={cy} r={4} fill={color} stroke="#18181b" strokeWidth={2} />
  );
}

// --- Trend line (linear regression) ---

function addTrendLine(data) {
  const points = data
    .filter((d) => d.actual != null)
    .map((d) => ({ x: new Date(d.dateStr + 'T00:00:00').getTime(), y: d.actual, ds: d.dateStr }));
  if (points.length < 2) return data;

  const n = points.length;
  let sx = 0, sy = 0, sxy = 0, sx2 = 0;
  for (const p of points) { sx += p.x; sy += p.y; sxy += p.x * p.y; sx2 += p.x * p.x; }
  const denom = n * sx2 - sx * sx;
  if (denom === 0) return data;
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;

  const firstX = points[0].x;
  const lastX = points[points.length - 1].x;
  const ext = (lastX - firstX) * 0.15;

  return data.map((d) => {
    const t = new Date(d.dateStr + 'T00:00:00').getTime();
    if (t >= firstX && t <= lastX + ext) {
      return { ...d, trend: Math.round((intercept + slope * t) * 10) / 10 };
    }
    return { ...d, trend: null };
  });
}

// --- Full-screen chart modal ---

function ChartModal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <button onClick={onClose} className="text-zinc-400 p-2 -mr-2">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 p-4 overflow-hidden">{children}</div>
    </div>
  );
}

// --- Tooltips ---

function WeightTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[11px] text-zinc-400 mb-1">{data?.label}</p>
      {data?.projected != null && (
        <p className="text-xs font-semibold text-emerald-400 font-mono">Plan: {data.projected} lbs</p>
      )}
      {data?.actual != null && (
        <p className="text-xs font-semibold text-blue-400 font-mono">Actual: {data.actual} lbs</p>
      )}
      {data?.revised != null && data?.actual == null && (
        <p className="text-xs font-semibold text-amber-400 font-mono">Revised: {data.revised} lbs</p>
      )}
      {data?.trend != null && data?.actual == null && (
        <p className="text-xs font-semibold text-violet-400 font-mono">Trend: {data.trend} lbs</p>
      )}
    </div>
  );
}

function DeficitTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[11px] text-zinc-400 mb-1">{data?.label}</p>
      {data?.planned != null && (
        <p className="text-xs font-semibold text-rose-400 font-mono">
          Plan: {data.planned.toLocaleString()} cal remaining
        </p>
      )}
      {data?.actual != null && (
        <p className="text-xs font-semibold text-blue-400 font-mono">
          Actual: {data.actual.toLocaleString()} cal remaining
        </p>
      )}
      {data?.revised != null && data?.actual == null && (
        <p className="text-xs font-semibold text-amber-400 font-mono">
          Revised: {data.revised.toLocaleString()} cal remaining
        </p>
      )}
      {data?.trend != null && data?.actual == null && (
        <p className="text-xs font-semibold text-violet-400 font-mono">
          Trend: {data.trend.toLocaleString()} cal remaining
        </p>
      )}
    </div>
  );
}

// --- Track Modal ---

function TrackModal({ entries, onAdd, onDelete, onClose }) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState('');

  const handleAdd = () => {
    const w = parseFloat(weight);
    if (!date || isNaN(w) || w <= 0) return;
    onAdd({ date, weight: w });
    setWeight('');
  };

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-white">Log Weight</h2>
        <button onClick={onClose} className="text-zinc-400 p-2 -mr-2">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="flex gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={today}
            className="flex-1 bg-zinc-800/80 border border-zinc-700/50 rounded-xl px-3 py-3 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-w-0"
          />
          <div className="relative flex-1">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Weight"
              className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-xl px-3 py-3 text-white text-lg font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none">lbs</span>
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={!weight || !date}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          + Log Entry
        </button>
        {sorted.length > 0 && (
          <div className="space-y-0.5 pt-2">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              History <span className="text-zinc-600">({sorted.length})</span>
            </h3>
            {sorted.map((entry) => (
              <div key={entry.date} className="flex items-center justify-between py-2.5 border-b border-zinc-800/40 last:border-0">
                <span className="text-sm text-zinc-400">
                  {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-white font-mono">{entry.weight} lbs</span>
                  {onDelete && (
                    <button onClick={() => onDelete(entry.date)} className="text-zinc-700 hover:text-rose-400 transition-colors p-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Tips ---

const TIPS = [
  'Drinking water before meals can reduce hunger and help you eat less.',
  'Protein keeps you fuller longer — aim for 25-30g per meal.',
  'Sleep 7-9 hours. Poor sleep increases hunger hormones.',
  'A 10-minute walk after meals helps regulate blood sugar.',
  'Track consistently, not perfectly. Trends matter more than single days.',
  'Muscle burns more calories at rest. Strength training boosts your TDEE.',
  'Eating slowly gives your brain time to register fullness (~20 min).',
  'Fiber-rich foods (vegetables, beans, oats) increase satiety.',
  'Weighing yourself at the same time daily reduces water weight noise.',
  'A 500 cal/day deficit = ~1 lb/week. Small, consistent cuts add up.',
  'Stress raises cortisol, which can increase appetite. Find ways to decompress.',
  'Planning meals ahead removes decision fatigue and impulsive eating.',
];

// --- Main Component ---

export default function Dashboard({ metrics, entries = [], onAddEntry, onDeleteEntry }) {
  const [expandedChart, setExpandedChart] = useState(null);
  const [chartView, setChartView] = useState('full');
  const [showTrack, setShowTrack] = useState(false);
  const [showTdeeInfo, setShowTdeeInfo] = useState(false);
  const [tipIndex] = useState(() => Math.floor(Math.random() * TIPS.length));

  if (!metrics) return null;

  const {
    isLosing,
    totalDeficit,
    days,
    dailyRequired,
    tdee,
    exerciseCalories,
    dietDeficit: dietDef,
    targetIntake,
    weightDiff,
    lbsPerWeek,
    dailyStepGoal,
    currentWeight,
    targetWeight,
    sex,
    targetDate,
  } = metrics;

  // Progress from logged entries
  const latestEntry =
    entries.length > 0
      ? [...entries].sort((a, b) => b.date.localeCompare(a.date))[0]
      : null;

  const remainingDeficit = latestEntry
    ? Math.abs(latestEntry.weight - targetWeight) * CALORIES_PER_POUND
    : totalDeficit;
  const completed = Math.max(0, totalDeficit - remainingDeficit);
  const progressPercent = totalDeficit > 0 ? (completed / totalDeficit) * 100 : 0;
  const hasProgress = latestEntry && completed > 0;

  // Actual rate from logged entries
  let actualLbsPerWeek = null;
  if (entries.length >= 2) {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const daysBetween = (new Date(last.date + 'T00:00:00') - new Date(first.date + 'T00:00:00')) / (1000 * 60 * 60 * 24);
    if (daysBetween >= 1) {
      actualLbsPerWeek = ((first.weight - last.weight) / daysBetween) * 7;
    }
  }

  // At goal state
  if (weightDiff < 0.1 || (latestEntry && Math.abs(latestEntry.weight - targetWeight) < 0.1)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <PartyPopper className="w-16 h-16 text-emerald-400 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Goal Reached!</h2>
        <p className="text-zinc-400">You've hit your target weight. Congratulations!</p>
      </div>
    );
  }

  const formattedDate = new Date(targetDate + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  const weeks = Math.round(days / 7);

  // Rate classification
  let rateLabel, rateColor;
  if (lbsPerWeek <= 0.5) { rateLabel = 'Conservative'; rateColor = 'text-emerald-400'; }
  else if (lbsPerWeek <= 1) { rateLabel = 'Moderate'; rateColor = 'text-emerald-400'; }
  else if (lbsPerWeek <= 2) { rateLabel = 'Aggressive'; rateColor = 'text-amber-400'; }
  else { rateLabel = 'Extreme'; rateColor = 'text-rose-400'; }

  // TDEE bar percentages
  const clampedIntake = Math.max(0, targetIntake);
  const totalBar = tdee + exerciseCalories;
  const intakePct = totalBar > 0 ? (clampedIntake / totalBar) * 100 : 0;
  const dietPct = totalBar > 0 ? (dietDef / totalBar) * 100 : 0;
  const walkPct = totalBar > 0 ? (exerciseCalories / totalBar) * 100 : 0;
  const tdeePct = totalBar > 0 ? (tdee / totalBar) * 100 : 0;

  // Monthly schedule
  const schedule = generateSchedule(currentWeight, targetWeight, lbsPerWeek, targetDate, isLosing);

  // Safety thresholds
  const minSafeIntake = sex === 'male' ? 1500 : 1200;
  const hasWarnings = lbsPerWeek > 2 || (isLosing && targetIntake < minSafeIntake);

  // Deficit progress chart data
  const deficitChartData = addTrendLine(generateDeficitChartData(
    targetWeight, totalDeficit, days, targetDate, isLosing, entries
  ));
  const hasActualDeficit = deficitChartData.some((d) => d.actual != null);

  return (
    <div className="space-y-3 pb-4">
      {/* ── Hero: Total / Remaining Deficit ── */}
      <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800/60 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Flame className="w-5 h-5 text-rose-400" />
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {hasProgress ? 'Remaining' : 'Total'} Balance
          </span>
        </div>
        <div className="text-4xl sm:text-5xl font-extrabold text-rose-400 tracking-tight font-mono">
          {formatCal(hasProgress ? remainingDeficit : totalDeficit)}
        </div>
        {hasProgress ? (
          <>
            <div className="text-sm text-zinc-500 mt-2">of {formatCal(totalDeficit)} total</div>
            <div className="mt-3 h-2.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, progressPercent)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs mt-2">
              <span className="text-emerald-400 font-semibold">{formatCal(completed)} completed</span>
              <span className="text-zinc-500 font-mono">{progressPercent.toFixed(0)}%</span>
            </div>
          </>
        ) : (
          <div className="text-sm text-zinc-500 mt-2">
            {weightDiff.toFixed(1)} lbs &times; 3,500 cal/lb
          </div>
        )}
        <div className={`text-xs mt-2 font-semibold ${rateColor}`}>
          {isLosing ? <TrendingDown className="w-3 h-3 inline mr-1" /> : <TrendingUp className="w-3 h-3 inline mr-1" />}
          {lbsPerWeek.toFixed(1)} lbs/week plan &middot; {rateLabel}
        </div>
        {actualLbsPerWeek !== null && (
          <div className="text-xs mt-1 text-zinc-500">
            Actual:{' '}
            <span className={actualLbsPerWeek > 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
              {Math.abs(actualLbsPerWeek).toFixed(1)} lbs/week
            </span>
            {actualLbsPerWeek <= 0 && ' (gaining)'}
          </div>
        )}
      </div>

      {/* ── Deficit Progress Chart ── */}
      {deficitChartData.length >= 2 && (() => {
        const now = Date.now();
        const monthMs = 30 * 24 * 60 * 60 * 1000;
        const viewData = chartView === 'month'
          ? deficitChartData.filter((d) => d.ts >= now - 3 * 24 * 60 * 60 * 1000 && d.ts <= now + monthMs)
          : deficitChartData;
        const maxVal = chartView === 'month'
          ? Math.max(...viewData.map((d) => d.planned), ...viewData.filter((d) => d.actual != null).map((d) => d.actual))
          : totalDeficit;
        if (viewData.length < 2) return null;

        return (
          <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800/60">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Remaining Balance
                </h3>
                <button onClick={() => setExpandedChart('deficit')} className="text-zinc-600 hover:text-zinc-400">
                  <Maximize2 className="w-3 h-3" />
                </button>
              </div>
              <div className="flex bg-zinc-800 rounded-lg p-0.5">
                {[{ id: 'full', label: 'All' }, { id: 'month', label: '30d' }].map((v) => (
                  <button
                    key={v.id}
                    onClick={(e) => { e.stopPropagation(); setChartView(v.id); }}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors ${
                      chartView === v.id ? 'bg-zinc-700 text-white' : 'text-zinc-500'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-44 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={viewData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="deficitGrad" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0} />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.15} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis
                    dataKey="ts"
                    type="number"
                    scale="time"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={fmtTick}
                    tick={{ fontSize: 10, fill: '#52525b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#27272a' }}
                  />
                  <YAxis
                    domain={[0, maxVal]}
                    tick={{ fontSize: 10, fill: '#52525b' }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`}
                  />
                  <Tooltip content={<DeficitTooltip />} />
                  <ReferenceLine
                    y={0}
                    stroke="#34d399"
                    strokeDasharray="6 3"
                    strokeOpacity={0.4}
                    label={{ value: 'Goal', position: 'right', fill: '#34d399', fontSize: 10 }}
                  />
                  <Line type="linear" dataKey="planHigh" stroke="#f87171" strokeWidth={1} strokeOpacity={0.5} strokeDasharray="4 4" dot={false} activeDot={false} />
                  <Line type="linear" dataKey="planLow" stroke="#f87171" strokeWidth={1} strokeOpacity={0.5} strokeDasharray="4 4" dot={false} activeDot={false} />
                  <Area
                    type="monotone"
                    dataKey="planned"
                    stroke="#f87171"
                    strokeWidth={2}
                    fill="url(#deficitGrad)"
                    dot={false}
                    activeDot={{ r: 3, fill: '#f87171', stroke: '#18181b', strokeWidth: 2 }}
                  />
                  {hasActualDeficit && (
                    <>
                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="#60a5fa"
                        strokeWidth={2.5}
                        dot={<ColoredDot />}
                        activeDot={{ r: 5, fill: '#60a5fa', stroke: '#18181b', strokeWidth: 2 }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="revised"
                        stroke="#fbbf24"
                        strokeWidth={1.5}
                        strokeDasharray="6 4"
                        dot={false}
                        activeDot={{ r: 3, fill: '#fbbf24', stroke: '#18181b', strokeWidth: 2 }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="trend"
                        stroke="#a78bfa"
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                        dot={false}
                        connectNulls
                      />
                    </>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap mt-3 justify-center">
              <div className="flex items-center gap-1"><div className="w-3 h-0 border-t-2 border-rose-400" /><span className="text-[9px] text-zinc-500">Plan</span></div>
              {hasActualDeficit && (
                <>
                  <div className="flex items-center gap-1">
                    <div className="flex gap-0.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><div className="w-1.5 h-1.5 rounded-full bg-blue-400" /><div className="w-1.5 h-1.5 rounded-full bg-rose-400" /></div>
                    <span className="text-[9px] text-zinc-500">Actual</span>
                  </div>
                  <div className="flex items-center gap-1"><div className="w-3 h-0 border-t border-dashed border-violet-400" /><span className="text-[9px] text-zinc-500">Trend</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-0 border-t border-dashed border-amber-400" /><span className="text-[9px] text-zinc-500">Revised</span></div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Log Weight Button ── */}
      {onAddEntry && (
        <div className="space-y-2">
          <button
            onClick={() => setShowTrack(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Log Weight
          </button>
          <button
            onClick={() => setShowTrack(true)}
            className="w-full text-zinc-500 hover:text-zinc-300 text-xs font-medium py-1 transition-colors"
          >
            View / Edit History
          </button>
        </div>
      )}

      {/* ── Key Metrics ── */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={Calendar}
          label="Goal Date"
          value={formattedDate}
          subtext={`${lbsPerWeek.toFixed(1)} lbs/week`}
          accent="indigo"
        />
        <MetricCard
          icon={Calendar}
          label="Weeks to Goal"
          value={`${weeks} wk${weeks !== 1 ? 's' : ''}`}
          subtext={`${days} days remaining`}
          accent="emerald"
        />
      </div>

      {/* ── Daily Deficit with TDEE Bar ── */}
      <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800/60">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          Daily Deficit
        </h3>

        {/* Big number */}
        <div className="text-center mb-5">
          <div className="text-3xl font-extrabold text-white font-mono">
            {formatCal(dailyRequired)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">per day to reach your goal</div>
        </div>

        {/* TDEE calorie bar */}
        <div className="relative mb-2">
          <div className="h-4 rounded-full flex overflow-hidden">
            <div
              className="bg-zinc-700 transition-all duration-500"
              style={{ width: `${intakePct}%` }}
            />
            <div
              className="bg-amber-500 transition-all duration-500"
              style={{ width: `${dietPct}%` }}
            />
            {walkPct > 0 && (
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${walkPct}%` }}
              />
            )}
          </div>

          {/* Target intake marker */}
          <div
            className="absolute top-[-3px] w-0.5 bg-white rounded-full"
            style={{ left: `${intakePct}%`, height: '22px' }}
          />

          {/* TDEE marker */}
          {walkPct > 1 && (
            <div
              className="absolute top-[-3px] w-px bg-zinc-400"
              style={{ left: `${tdeePct}%`, height: '22px' }}
            />
          )}
        </div>

        {/* Bar labels */}
        <div className="flex justify-between text-[10px] mb-4">
          <span className="text-zinc-400">
            ↑ eat {Math.round(clampedIntake).toLocaleString()}
          </span>
          {walkPct > 1 && (
            <span className="text-zinc-500">
              TDEE {Math.round(tdee).toLocaleString()} ↑
            </span>
          )}
        </div>

        {/* Breakdown rows */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700 ring-1 ring-zinc-600 shrink-0" />
              <span className="text-sm text-zinc-300">Target Intake</span>
            </div>
            <span className="text-sm font-bold text-white font-mono">{formatCal(clampedIntake)}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <div className="flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-zinc-600" />
                <span className="text-sm text-zinc-300">From Diet</span>
              </div>
            </div>
            <span className="text-sm font-bold text-amber-400 font-mono">{formatCal(dietDef)}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <div className="flex items-center gap-1.5">
                <Footprints className="w-3.5 h-3.5 text-zinc-600" />
                <span className="text-sm text-zinc-300">From Walking</span>
              </div>
            </div>
            <span className="text-sm font-bold text-emerald-400 font-mono">{formatCal(Math.round(exerciseCalories))}</span>
          </div>
          <div className="text-[11px] text-zinc-600 text-right">
            {dailyStepGoal.toLocaleString()} steps/day &asymp; {Math.round(exerciseCalories)} cal
          </div>
          <div className="border-t border-zinc-800 pt-2.5 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-zinc-600" />
              <span className="text-sm text-zinc-500">Maintenance (TDEE)</span>
              <button onClick={() => setShowTdeeInfo(!showTdeeInfo)} className="text-zinc-600 hover:text-zinc-400">
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className="text-sm font-bold text-zinc-400 font-mono">{formatCal(tdee)}</span>
          </div>
          {showTdeeInfo && (
            <div className="bg-zinc-800/60 rounded-xl p-3 mt-2 text-xs text-zinc-400 leading-relaxed">
              <strong className="text-zinc-300">Total Daily Energy Expenditure</strong> &mdash; the total
              calories your body burns per day including base metabolism, digestion, and daily activity.
              Eating below your TDEE creates a deficit that leads to weight loss. Estimated from your
              height, weight, age, sex, and daily life activity.
            </div>
          )}
        </div>
      </div>

      {/* ── Tips ── */}
      <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800/60 flex items-start gap-3.5">
        <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
          <Lightbulb className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <div className="text-[11px] font-semibold text-amber-400/80 uppercase tracking-wider mb-1">Tip</div>
          <p className="text-sm text-zinc-300 leading-relaxed">{TIPS[tipIndex]}</p>
        </div>
      </div>

      {/* ── Warnings ── */}
      {hasWarnings && (
        <div className="bg-rose-950/40 rounded-2xl p-4 border border-rose-900/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span className="text-sm font-semibold text-rose-300">Health Notice</span>
          </div>
          <div className="text-xs text-rose-300/80 space-y-1.5">
            {lbsPerWeek > 2 && (
              <p>Losing {lbsPerWeek.toFixed(1)} lbs/week exceeds the recommended 1&ndash;2 lbs/week. Consider a lower weekly rate.</p>
            )}
            {isLosing && targetIntake < minSafeIntake && (
              <p>Target intake of {Math.round(targetIntake)} cal/day is below the recommended minimum of {minSafeIntake} cal/day. Consult a healthcare provider.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Track Modal ── */}
      {showTrack && onAddEntry && (
        <TrackModal
          entries={entries}
          onAdd={(e) => { onAddEntry(e); }}
          onDelete={onDeleteEntry}
          onClose={() => setShowTrack(false)}
        />
      )}

      {/* ── Full-screen chart modals ── */}
      {expandedChart === 'deficit' && deficitChartData.length >= 2 && (() => {
        const maxVal = totalDeficit;
        return (
          <ChartModal title="Remaining Balance" onClose={() => setExpandedChart(null)}>
            <div className="h-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={deficitChartData} margin={{ top: 10, right: 15, bottom: 20, left: 5 }}>
                  <defs>
                    <linearGradient id="deficitGradFull" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0} />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.15} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={fmtTick} tick={{ fontSize: 11, fill: '#52525b' }} tickLine={false} axisLine={{ stroke: '#27272a' }} />
                  <YAxis domain={[0, maxVal]} tick={{ fontSize: 11, fill: '#52525b' }} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`} />
                  <Tooltip content={<DeficitTooltip />} />
                  <ReferenceLine y={0} stroke="#34d399" strokeDasharray="6 3" strokeOpacity={0.4} />
                  <Line type="linear" dataKey="planHigh" stroke="#f87171" strokeWidth={1} strokeOpacity={0.5} strokeDasharray="4 4" dot={false} activeDot={false} />
                  <Line type="linear" dataKey="planLow" stroke="#f87171" strokeWidth={1} strokeOpacity={0.5} strokeDasharray="4 4" dot={false} activeDot={false} />
                  <Area type="linear" dataKey="planned" stroke="#f87171" strokeWidth={2} fill="url(#deficitGradFull)" dot={false} />
                  {hasActualDeficit && (
                    <>
                      <Line type="monotone" dataKey="actual" stroke="#60a5fa" strokeWidth={2.5} dot={<ColoredDot />} connectNulls />
                      <Line type="monotone" dataKey="revised" stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="6 4" dot={false} connectNulls />
                      <Line type="monotone" dataKey="trend" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="3 3" dot={false} connectNulls />
                    </>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartModal>
        );
      })()}

    </div>
  );
}
