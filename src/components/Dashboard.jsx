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

  return [...dateMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ds, date]) => ({
      label: fmtLabel(date),
      dateStr: ds,
      projected: Math.round(getProjected(date) * 10) / 10,
      actual: actualMap.has(ds) ? actualMap.get(ds) : null,
    }));
}

function generateDeficitChartData(currentWeight, totalDeficit, days, targetDate, isLosing, entries) {
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

  return [...dateMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ds, date]) => {
      const daysSinceStart = Math.max(0, (date - now) / (1000 * 60 * 60 * 24));
      const planned = Math.min(totalDeficit, Math.round((daysSinceStart / days) * totalDeficit));

      let actual = null;
      if (actualMap.has(ds)) {
        const weightChange = isLosing
          ? currentWeight - actualMap.get(ds)
          : actualMap.get(ds) - currentWeight;
        actual = Math.max(0, Math.round(weightChange * CALORIES_PER_POUND));
      }

      return { label: fmtLabel(date), dateStr: ds, planned, actual };
    });
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
        <p className="text-xs font-semibold text-emerald-400 font-mono">
          Plan: {data.planned.toLocaleString()} cal
        </p>
      )}
      {data?.actual != null && (
        <p className="text-xs font-semibold text-blue-400 font-mono">
          Actual: {data.actual.toLocaleString()} cal
        </p>
      )}
    </div>
  );
}

// --- Main Component ---

export default function Dashboard({ metrics, entries = [] }) {
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
  const deficitChartData = generateDeficitChartData(
    currentWeight, totalDeficit, days, targetDate, isLosing, entries
  );
  const hasActualDeficit = deficitChartData.some((d) => d.actual != null);

  return (
    <div className="space-y-3 pb-4">
      {/* ── Hero: Total / Remaining Deficit ── */}
      <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800/60 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Flame className="w-5 h-5 text-rose-400" />
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {hasProgress ? 'Remaining' : 'Total'} Deficit
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
          {lbsPerWeek.toFixed(1)} lbs/week &middot; {rateLabel}
        </div>
      </div>

      {/* ── Deficit Progress Chart ── */}
      {deficitChartData.length >= 2 && (() => {
        const maxVal = totalDeficit;
        const tickInterval = Math.max(1, Math.floor(deficitChartData.length / 6));
        const ticks = deficitChartData
          .filter((_, i) => i === 0 || i === deficitChartData.length - 1 || i % tickInterval === 0)
          .map((d) => d.label);

        return (
          <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800/60">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Deficit Progress
              </h3>
              {hasActualDeficit && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[10px] text-zinc-500">Plan</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className="text-[10px] text-zinc-500">Actual</span>
                  </div>
                </div>
              )}
            </div>
            <div className="h-44 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={deficitChartData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="deficitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#52525b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#27272a' }}
                    ticks={ticks}
                    interval="preserveStartEnd"
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
                  <Area
                    type="monotone"
                    dataKey="planned"
                    stroke="#34d399"
                    strokeWidth={2}
                    fill="url(#deficitGrad)"
                    dot={false}
                    activeDot={{ r: 3, fill: '#34d399', stroke: '#18181b', strokeWidth: 2 }}
                  />
                  {hasActualDeficit && (
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="#60a5fa"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#60a5fa', stroke: '#18181b', strokeWidth: 2 }}
                      activeDot={{ r: 5, fill: '#60a5fa', stroke: '#18181b', strokeWidth: 2 }}
                      connectNulls
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })()}

      {/* ── Key Metrics ── */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={Calendar}
          label="Goal Date"
          value={formattedDate}
          subtext={`${days} days (${weeks} wk${weeks !== 1 ? 's' : ''})`}
          accent="indigo"
        />
        <MetricCard
          icon={Target}
          label="Target Intake"
          value={formatCal(targetIntake)}
          subtext="eat this per day"
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
            </div>
            <span className="text-sm font-bold text-zinc-400 font-mono">{formatCal(tdee)}</span>
          </div>
        </div>
      </div>

      {/* ── Weight Over Time Chart ── */}
      {(() => {
        const chartData = generateWeightChartData(
          currentWeight, targetWeight, lbsPerWeek, targetDate, isLosing, entries
        );
        if (chartData.length < 2) return null;

        const projectedVals = chartData.map((d) => d.projected);
        const actualVals = chartData.filter((d) => d.actual != null).map((d) => d.actual);
        const allValues = [...projectedVals, ...actualVals, targetWeight];
        const minW = Math.floor(Math.min(...allValues) / 5) * 5 - 5;
        const maxW = Math.ceil(Math.max(...allValues) / 5) * 5 + 5;

        const tickInterval = Math.max(1, Math.floor(chartData.length / 6));
        const ticks = chartData
          .filter((_, i) => i === 0 || i === chartData.length - 1 || i % tickInterval === 0)
          .map((d) => d.label);
        const hasActual = actualVals.length > 0;

        return (
          <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800/60">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Projected Weight
              </h3>
              {hasActual && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[10px] text-zinc-500">Plan</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className="text-[10px] text-zinc-500">Actual</span>
                  </div>
                </div>
              )}
            </div>
            <div className="h-56 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#52525b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#27272a' }}
                    ticks={ticks}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[minW, maxW]}
                    tick={{ fontSize: 10, fill: '#52525b' }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip content={<WeightTooltip />} />
                  <ReferenceLine
                    y={targetWeight}
                    stroke="#f43f5e"
                    strokeDasharray="6 3"
                    strokeOpacity={0.5}
                    label={{ value: `Goal: ${targetWeight}`, position: 'right', fill: '#f43f5e', fontSize: 10 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="projected"
                    stroke="#34d399"
                    strokeWidth={2}
                    fill="url(#weightGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#34d399', stroke: '#18181b', strokeWidth: 2 }}
                  />
                  {hasActual && (
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="#60a5fa"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#60a5fa', stroke: '#18181b', strokeWidth: 2 }}
                      activeDot={{ r: 5, fill: '#60a5fa', stroke: '#18181b', strokeWidth: 2 }}
                      connectNulls
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })()}

      {/* ── Monthly Milestones ── */}
      {schedule.length > 0 && (
        <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800/60">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
            Monthly Milestones
          </h3>
          <div className="flex gap-2.5 overflow-x-auto pb-2 hide-scrollbar">
            {schedule.map((month, i) => (
              <div
                key={i}
                className={`flex-shrink-0 w-[72px] rounded-xl p-2.5 text-center transition-colors ${
                  month.isTarget
                    ? 'bg-emerald-950/60 border border-emerald-800/50'
                    : 'bg-zinc-800/70'
                }`}
              >
                <div className="text-[10px] font-medium text-zinc-500">{month.label}</div>
                <div className={`text-sm font-bold mt-1 font-mono ${month.isTarget ? 'text-emerald-400' : 'text-zinc-300'}`}>
                  {month.weight}
                </div>
                <div className="text-[10px] text-zinc-600">lbs</div>
              </div>
            ))}
          </div>
        </div>
      )}

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
    </div>
  );
}
