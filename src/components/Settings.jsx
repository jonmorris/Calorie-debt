import {
  Scale,
  Target,
  Ruler,
  Calendar,
  User,
  Activity,
  Footprints,
  TrendingDown,
} from 'lucide-react';

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

export default function Settings({ settings, onChange }) {
  const update = (key, value) => {
    onChange({ ...settings, [key]: value });
  };

  const today = new Date().toISOString().split('T')[0];

  // Compute the derived value for display
  const weightDiff = Math.abs(settings.currentWeight - settings.targetWeight);

  let computedDate = '';
  if (settings.planMode === 'lbsPerWeek' && settings.lbsPerWeek > 0 && weightDiff > 0) {
    const daysNeeded = Math.ceil((weightDiff / settings.lbsPerWeek) * 7);
    const d = new Date();
    d.setDate(d.getDate() + daysNeeded);
    computedDate = d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  let computedRate = 0;
  if (settings.planMode === 'targetDate' && settings.targetDate) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(settings.targetDate + 'T00:00:00');
    const days = Math.max(1, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
    computedRate = weightDiff / (days / 7);
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Weight */}
      <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800/60 space-y-4">
        <InputGroup icon={Scale} label="Current Weight">
          <NumberInput
            value={settings.currentWeight}
            onChange={(v) => update('currentWeight', v)}
            min={50}
            max={700}
            unit="lbs"
          />
        </InputGroup>

        <InputGroup icon={Target} label="Target Weight">
          <NumberInput
            value={settings.targetWeight}
            onChange={(v) => update('targetWeight', v)}
            min={50}
            max={700}
            unit="lbs"
          />
        </InputGroup>
      </div>

      {/* Plan Mode */}
      <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800/60 space-y-4">
        <InputGroup icon={TrendingDown} label="Plan By">
          <div className="flex gap-2">
            {[
              { id: 'lbsPerWeek', label: 'Weekly Rate' },
              { id: 'targetDate', label: 'Target Date' },
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

        {settings.planMode === 'lbsPerWeek' ? (
          <>
            <InputGroup icon={TrendingDown} label="Rate">
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
              <div className="bg-zinc-800/50 rounded-xl px-4 py-3">
                <span className="text-xs text-zinc-500">Estimated goal date</span>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {computedDate}
                </p>
              </div>
            )}
          </>
        ) : (
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
              <div className="bg-zinc-800/50 rounded-xl px-4 py-3">
                <span className="text-xs text-zinc-500">Required rate</span>
                <p className={`text-sm font-semibold mt-0.5 ${
                  computedRate > 2 ? 'text-rose-400' : 'text-white'
                }`}>
                  {computedRate.toFixed(1)} lbs/week
                  {computedRate > 2 && (
                    <span className="text-xs text-rose-400/70 ml-2">
                      (aggressive)
                    </span>
                  )}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Body Metrics */}
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

        <InputGroup icon={Activity} label="Activity Level">
          <select
            value={settings.activityLevel}
            onChange={(e) => update('activityLevel', e.target.value)}
            className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-xl px-4 py-3 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all appearance-none cursor-pointer"
          >
            <option value="sedentary">Sedentary (little/no exercise)</option>
            <option value="light">Light (exercise 1-3 days/week)</option>
            <option value="moderate">Moderate (exercise 3-5 days/week)</option>
            <option value="active">Active (exercise 6-7 days/week)</option>
            <option value="veryActive">Very Active (physical job + exercise)</option>
          </select>
        </InputGroup>
      </div>

      {/* Steps */}
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

      {/* Tip */}
      <p className="text-[11px] text-zinc-600 text-center px-6 leading-relaxed">
        Set activity level to <strong className="text-zinc-500">Sedentary</strong> if
        you want to count daily steps as your primary exercise source. Steps
        estimate additional calories burned above your base activity.
      </p>
    </div>
  );
}
