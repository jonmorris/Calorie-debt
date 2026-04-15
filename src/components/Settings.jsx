import {
  Scale,
  Target,
  Ruler,
  Calendar,
  User,
  Briefcase,
  Footprints,
  TrendingDown,
  Utensils,
} from 'lucide-react';
import { calculateTDEE, caloriesFromSteps, CALORIES_PER_POUND } from '../utils/calculations';

function InputGroup({ icon: Icon, label, children }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </label>
      {children}
    </div>
  );
}

function NumberInput({ value, onChange, min, max, step = 1, unit, placeholder }) {
  return (
    <div className="relative">
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-xl px-4 py-3 text-white text-lg font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
      />
      {unit && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none">
          {unit}
        </span>
      )}
    </div>
  );
}

function ComputedValue({ label, children }) {
  return (
    <div className="bg-zinc-800/50 rounded-xl px-4 py-3">
      <span className="text-xs text-zinc-500">{label}</span>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

export default function Settings({ settings, onChange, onCurrentWeightChange }) {
  const update = (key, value) => {
    onChange({ ...settings, [key]: value });
  };

  const today = new Date().toISOString().split('T')[0];
  const weightDiff = Math.abs(settings.currentWeight - settings.targetWeight);

  // Derived values for display in each plan mode
  let computedDate = '';
  let computedRate = 0;
  let computedDeficit = 0;

  if (settings.planMode === 'lbsPerWeek' && settings.lbsPerWeek > 0 && weightDiff > 0) {
    const daysNeeded = Math.ceil((weightDiff / settings.lbsPerWeek) * 7);
    const d = new Date();
    d.setDate(d.getDate() + daysNeeded);
    computedDate = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    computedDeficit = (settings.lbsPerWeek * 3500) / 7;
  }

  if (settings.planMode === 'targetDate' && settings.targetDate) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(settings.targetDate + 'T00:00:00');
    const days = Math.max(1, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
    computedRate = weightDiff / (days / 7);
    computedDeficit = (weightDiff * 3500) / days;
  }

  if (settings.planMode === 'calorieBudget' && settings.calorieBudget > 0) {
    const totalHeight = settings.heightFeet * 12 + settings.heightInches;
    const tdee = calculateTDEE(settings.currentWeight, totalHeight, settings.age, settings.sex, settings.activityLevel);
    const exercise = caloriesFromSteps(settings.dailyStepGoal, settings.currentWeight);
    const dietDef = Math.max(0, tdee - settings.calorieBudget);
    const totalDaily = dietDef + exercise;
    computedDeficit = totalDaily;
    computedRate = totalDaily > 0 ? (totalDaily * 7) / CALORIES_PER_POUND : 0;
    if (computedRate > 0 && weightDiff > 0) {
      const daysNeeded = Math.ceil((weightDiff / computedRate) * 7);
      const d = new Date();
      d.setDate(d.getDate() + daysNeeded);
      computedDate = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
  }

  return (
    <div className="space-y-4 pb-4">
      {/* ── Plan Mode ── */}
      <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800/60 space-y-4">
        <InputGroup icon={Target} label="Target Weight">
          <NumberInput
            value={settings.targetWeight}
            onChange={(v) => update('targetWeight', v)}
            min={50}
            max={700}
            unit="lbs"
          />
        </InputGroup>

        <InputGroup icon={TrendingDown} label="Plan By">
          <div className="flex gap-1.5">
            {[
              { id: 'lbsPerWeek', label: 'Rate' },
              { id: 'targetDate', label: 'Date' },
              { id: 'calorieBudget', label: 'Calories' },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => update('planMode', mode.id)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                  settings.planMode === mode.id
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                    : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700/80'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </InputGroup>

        {settings.planMode === 'lbsPerWeek' && (
          <>
            <InputGroup icon={TrendingDown} label="Weekly Rate">
              <NumberInput
                value={settings.lbsPerWeek}
                onChange={(v) => update('lbsPerWeek', v)}
                min={0.1}
                max={5}
                step={0.1}
                unit="lbs/wk"
              />
              <input
                type="range"
                value={settings.lbsPerWeek}
                onChange={(e) => update('lbsPerWeek', Number(e.target.value))}
                min={0.25}
                max={3}
                step={0.25}
                className="w-full h-2 mt-1"
              />
              <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
                <span>0.25</span>
                <span>1.0</span>
                <span>2.0</span>
                <span>3.0</span>
              </div>
            </InputGroup>
            {computedDate && (
              <ComputedValue label="Estimated goal date">
                <p className="text-sm font-semibold text-white">{computedDate}</p>
              </ComputedValue>
            )}
            {computedDeficit > 0 && (
              <ComputedValue label="Daily deficit needed">
                <p className="text-sm font-semibold text-white">
                  {Math.round(computedDeficit).toLocaleString()} cal/day
                </p>
              </ComputedValue>
            )}
          </>
        )}

        {settings.planMode === 'targetDate' && (
          <>
            <InputGroup icon={Calendar} label="Target Date">
              <input
                type="date"
                value={settings.targetDate}
                onChange={(e) => update('targetDate', e.target.value)}
                min={today}
                className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-xl px-4 py-3 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
              />
            </InputGroup>
            {computedRate > 0 && (
              <ComputedValue label="Required rate">
                <p className={`text-sm font-semibold ${computedRate > 2 ? 'text-rose-400' : 'text-white'}`}>
                  {computedRate.toFixed(1)} lbs/week
                  {computedRate > 2 && <span className="text-xs text-rose-400/70 ml-2">(aggressive)</span>}
                </p>
              </ComputedValue>
            )}
            {computedDeficit > 0 && (
              <ComputedValue label="Daily deficit needed">
                <p className="text-sm font-semibold text-white">
                  {Math.round(computedDeficit).toLocaleString()} cal/day
                </p>
              </ComputedValue>
            )}
          </>
        )}

        {settings.planMode === 'calorieBudget' && (
          <>
            <InputGroup icon={Utensils} label="Daily Calorie Goal">
              <NumberInput
                value={settings.calorieBudget}
                onChange={(v) => update('calorieBudget', v)}
                min={800}
                max={5000}
                step={1}
                unit="cal/day"
              />
              <input
                type="range"
                value={settings.calorieBudget}
                onChange={(e) => update('calorieBudget', Number(e.target.value))}
                min={1000}
                max={3000}
                step={10}
                className="w-full h-2 mt-1"
              />
              <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
                <span>1,000</span>
                <span>1,500</span>
                <span>2,000</span>
                <span>2,500</span>
                <span>3,000</span>
              </div>
            </InputGroup>
            {computedRate > 0 && (
              <ComputedValue label="Estimated rate">
                <p className={`text-sm font-semibold ${computedRate > 2 ? 'text-rose-400' : 'text-white'}`}>
                  {computedRate.toFixed(1)} lbs/week
                  {computedRate > 2 && <span className="text-xs text-rose-400/70 ml-2">(aggressive)</span>}
                </p>
              </ComputedValue>
            )}
            {computedDate && (
              <ComputedValue label="Estimated goal date">
                <p className="text-sm font-semibold text-white">{computedDate}</p>
              </ComputedValue>
            )}
            {computedDeficit > 0 && (
              <ComputedValue label="Daily deficit">
                <p className="text-sm font-semibold text-white">
                  {Math.round(computedDeficit).toLocaleString()} cal/day
                </p>
              </ComputedValue>
            )}
          </>
        )}
      </div>

      {/* ── Steps ── */}
      <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800/60 space-y-4">
        <InputGroup icon={Footprints} label="Daily Step Goal">
          <NumberInput
            value={settings.dailyStepGoal}
            onChange={(v) => update('dailyStepGoal', v)}
            min={0}
            max={50000}
            step={500}
            unit="steps"
          />
          <input
            type="range"
            value={settings.dailyStepGoal}
            onChange={(e) => update('dailyStepGoal', Number(e.target.value))}
            min={0}
            max={30000}
            step={500}
            className="w-full h-2 mt-1"
          />
          <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
            <span>0</span>
            <span>10k</span>
            <span>20k</span>
            <span>30k</span>
          </div>
        </InputGroup>
      </div>

      {/* ── Body Metrics ── */}
      <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800/60 space-y-4">
        <InputGroup icon={Ruler} label="Height">
          <div className="flex gap-3">
            <div className="flex-1">
              <NumberInput
                value={settings.heightFeet}
                onChange={(v) => update('heightFeet', v)}
                min={3}
                max={8}
                unit="ft"
              />
            </div>
            <div className="flex-1">
              <NumberInput
                value={settings.heightInches}
                onChange={(v) => update('heightInches', v)}
                min={0}
                max={11}
                unit="in"
              />
            </div>
          </div>
        </InputGroup>

        <InputGroup icon={User} label="Age">
          <NumberInput
            value={settings.age}
            onChange={(v) => update('age', v)}
            min={13}
            max={120}
            unit="years"
          />
        </InputGroup>

        <InputGroup icon={User} label="Biological Sex">
          <div className="flex gap-2">
            {['male', 'female'].map((s) => (
              <button
                key={s}
                onClick={() => update('sex', s)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                  settings.sex === s
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                    : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700/80'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </InputGroup>

        <InputGroup icon={Briefcase} label="Daily Life">
          <div className="flex gap-1.5">
            {[
              { id: 'desk', label: 'Desk Job' },
              { id: 'onFeet', label: 'On My Feet' },
              { id: 'physical', label: 'Physical Job' },
            ].map((level) => (
              <button
                key={level.id}
                onClick={() => update('activityLevel', level.id)}
                className={`flex-1 py-3 rounded-xl text-xs font-semibold transition-all ${
                  settings.activityLevel === level.id
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                    : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700/80'
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-zinc-600 leading-relaxed">
            Your baseline daily activity — not including planned exercise or steps.
          </p>
        </InputGroup>
      </div>

      {/* ── Initial Setup (bottom, rarely changed) ── */}
      <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800/60 space-y-4">
        <InputGroup icon={Scale} label="Starting Weight">
          <NumberInput
            value={settings.currentWeight}
            onChange={(v) => {
              update('currentWeight', v);
              if (onCurrentWeightChange) onCurrentWeightChange(v);
            }}
            min={50}
            max={700}
            unit="lbs"
          />
        </InputGroup>
      </div>
    </div>
  );
}
