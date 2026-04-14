import {
  DollarSign,
  Calendar,
  Utensils,
  Footprints,
  Wallet,
  AlertTriangle,
  Target,
  TrendingDown,
  TrendingUp,
  PartyPopper,
} from 'lucide-react';
import { formatDebt } from '../utils/calculations';

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

export default function Dashboard({ metrics, targetDate }) {
  if (!metrics) return null;

  const {
    isLosing,
    totalDebt,
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
  } = metrics;

  // At goal state
  if (weightDiff < 0.1) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <PartyPopper className="w-16 h-16 text-emerald-400 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Debt Free!</h2>
        <p className="text-zinc-400">
          You're already at your target weight. Adjust your goals in Settings.
        </p>
      </div>
    );
  }

  const formattedDate = new Date(targetDate + 'T00:00:00').toLocaleDateString(
    'en-US',
    { month: 'short', day: 'numeric', year: 'numeric' }
  );
  const weeks = Math.round(days / 7);

  // Rate classification
  let rateLabel, rateColor;
  if (lbsPerWeek <= 0.5) {
    rateLabel = 'Conservative';
    rateColor = 'text-emerald-400';
  } else if (lbsPerWeek <= 1) {
    rateLabel = 'Moderate';
    rateColor = 'text-emerald-400';
  } else if (lbsPerWeek <= 2) {
    rateLabel = 'Aggressive';
    rateColor = 'text-amber-400';
  } else {
    rateLabel = 'Extreme';
    rateColor = 'text-rose-400';
  }

  // Payment split percentages
  const dietPercent =
    dailyRequired > 0
      ? Math.min(100, (dietDef / dailyRequired) * 100)
      : 0;
  const exercisePercent =
    dailyRequired > 0
      ? Math.min(100 - dietPercent, (exerciseCalories / dailyRequired) * 100)
      : 0;

  // Monthly schedule
  const schedule = generateSchedule(
    currentWeight,
    targetWeight,
    lbsPerWeek,
    targetDate,
    isLosing
  );

  // Safety thresholds
  const minSafeIntake = sex === 'male' ? 1500 : 1200;
  const hasWarnings = lbsPerWeek > 2 || (isLosing && targetIntake < minSafeIntake);

  return (
    <div className="space-y-3 pb-4">
      {/* Hero - Total Debt */}
      <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800/60 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <DollarSign className="w-5 h-5 text-rose-400" />
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Total Calorie {isLosing ? 'Debt' : 'Goal'}
          </span>
        </div>
        <div className="text-4xl sm:text-5xl font-extrabold text-rose-400 tracking-tight font-mono">
          {formatDebt(totalDebt)}
        </div>
        <div className="text-sm text-zinc-500 mt-2">
          {weightDiff.toFixed(1)} lbs &times; $3,500/lb
        </div>
        <div className={`text-xs mt-2 font-semibold ${rateColor}`}>
          {isLosing ? (
            <TrendingDown className="w-3 h-3 inline mr-1" />
          ) : (
            <TrendingUp className="w-3 h-3 inline mr-1" />
          )}
          {lbsPerWeek.toFixed(1)} lbs/week &middot; {rateLabel}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={Calendar}
          label="Payoff Date"
          value={formattedDate}
          subtext={`${days} days (${weeks} wk${weeks !== 1 ? 's' : ''})`}
          accent="indigo"
        />
        <MetricCard
          icon={DollarSign}
          label="Daily Payment"
          value={formatDebt(dailyRequired)}
          subtext="deficit per day"
          accent="emerald"
        />
      </div>

      {/* Payment Breakdown */}
      <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800/60">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
          Payment Plan
        </h3>

        {/* Visual bar */}
        <div className="h-2.5 rounded-full bg-zinc-800 overflow-hidden flex mb-4">
          <div
            className="bg-amber-500 transition-all duration-500 rounded-l-full"
            style={{ width: `${dietPercent}%` }}
          />
          <div
            className="bg-emerald-500 transition-all duration-500"
            style={{
              width: `${exercisePercent}%`,
              borderRadius: dietPercent === 0 ? '9999px 9999px 9999px 9999px' : '0 9999px 9999px 0',
            }}
          />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <Utensils className="w-4 h-4 text-zinc-600" />
              <span className="text-sm text-zinc-300">Diet Cuts</span>
            </div>
            <span className="text-sm font-bold text-amber-400 font-mono">
              {formatDebt(dietDef)}/day
            </span>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <Footprints className="w-4 h-4 text-zinc-600" />
              <span className="text-sm text-zinc-300">Steps</span>
            </div>
            <span className="text-sm font-bold text-emerald-400 font-mono">
              {formatDebt(Math.round(exerciseCalories))}/day
            </span>
          </div>

          <div className="text-[11px] text-zinc-600 text-right">
            {dailyStepGoal.toLocaleString()} steps/day &asymp;{' '}
            {Math.round(exerciseCalories)} cal burned
          </div>
        </div>
      </div>

      {/* Your Finances */}
      <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800/60">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
          Your Finances
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <Wallet className="w-4 h-4 text-zinc-600" />
              <span className="text-sm text-zinc-300">
                Daily Salary <span className="text-zinc-600">(TDEE)</span>
              </span>
            </div>
            <span className="text-sm font-bold text-zinc-200 font-mono">
              {formatDebt(tdee)}
            </span>
          </div>
          <div className="h-px bg-zinc-800" />
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <Target className="w-4 h-4 text-zinc-600" />
              <span className="text-sm text-zinc-300">
                Daily Budget <span className="text-zinc-600">(eat this)</span>
              </span>
            </div>
            <span className="text-sm font-bold text-emerald-400 font-mono">
              {formatDebt(targetIntake)}
            </span>
          </div>
        </div>
      </div>

      {/* Payoff Schedule */}
      {schedule.length > 0 && (
        <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800/60">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
            Payoff Schedule
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
                <div className="text-[10px] font-medium text-zinc-500">
                  {month.label}
                </div>
                <div
                  className={`text-sm font-bold mt-1 font-mono ${
                    month.isTarget ? 'text-emerald-400' : 'text-zinc-300'
                  }`}
                >
                  {month.weight}
                </div>
                <div className="text-[10px] text-zinc-600">lbs</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {hasWarnings && (
        <div className="bg-rose-950/40 rounded-2xl p-4 border border-rose-900/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span className="text-sm font-semibold text-rose-300">
              Health Notice
            </span>
          </div>
          <div className="text-xs text-rose-300/80 space-y-1.5">
            {lbsPerWeek > 2 && (
              <p>
                Losing {lbsPerWeek.toFixed(1)} lbs/week exceeds the recommended
                1&ndash;2 lbs/week. Consider extending your target date.
              </p>
            )}
            {isLosing && targetIntake < minSafeIntake && (
              <p>
                Target intake of {Math.round(targetIntake)} cal/day is below the
                recommended minimum of {minSafeIntake} cal/day. Consult a
                healthcare provider before proceeding.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
