import { useState, useEffect, useMemo } from 'react'
import { LayoutDashboard, SlidersHorizontal, FileText, X, Settings2 } from 'lucide-react'
import Dashboard from './components/Dashboard'
import Settings from './components/Settings'
import { calculateAll } from './utils/calculations'

const SETTINGS_KEY = 'caloriedebt_settings'
const ENTRIES_KEY = 'caloriedebt_entries'

function getDefaultDate() {
  const d = new Date()
  d.setMonth(d.getMonth() + 6)
  return d.toISOString().split('T')[0]
}

const DEFAULT_SETTINGS = {
  currentWeight: 200,
  targetWeight: 170,
  heightFeet: 5,
  heightInches: 10,
  age: 30,
  sex: 'male',
  activityLevel: 'desk',
  planMode: 'lbsPerWeek',
  lbsPerWeek: 1.5,
  targetDate: getDefaultDate(),
  calorieBudget: 1800,
  dailyStepGoal: 10000,
  units: 'lbs',
}

function loadJSON(key, fallback) {
  try {
    const stored = localStorage.getItem(key)
    if (stored) return JSON.parse(stored)
  } catch {
    // ignore
  }
  return fallback
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

const CHANGELOG = [
  { date: '2026-04-15', text: 'Full-screen charts, trend lines, actual lbs/week rate' },
  { date: '2026-04-15', text: 'Calorie budget plan mode, simplified activity level' },
  { date: '2026-04-15', text: 'Color-coded weight dots (green/red/blue)' },
  { date: '2026-04-15', text: 'TDEE calorie bar, deficit progress chart' },
  { date: '2026-04-15', text: 'Weight tracking with actual vs projected charts' },
  { date: '2026-04-15', text: 'Revised projection line from current weight' },
  { date: '2026-04-15', text: 'Initial build: calorie deficit dashboard' },
]

const ROADMAP = [
  'TDEE-adjusted non-linear projections',
  'Weekly/monthly summary stats',
  'Export data to CSV/JSON',
  'Dark/light theme toggle',
  'Unit toggle (lbs/kg)',
  'Macro tracking (protein, carbs, fat)',
  'Integration with step counter APIs',
  'Weekly weigh-in reminders',
  'Social sharing of milestones',
]

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const [showChangelog, setShowChangelog] = useState(false)
  const [showAppSettings, setShowAppSettings] = useState(false)
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...loadJSON(SETTINGS_KEY, {}),
  }))
  const [entries, setEntries] = useState(() => loadJSON(ENTRIES_KEY, []))

  useEffect(() => { saveJSON(SETTINGS_KEY, settings) }, [settings])
  useEffect(() => { saveJSON(ENTRIES_KEY, entries) }, [entries])

  const addEntry = (entry) => {
    setEntries((prev) => {
      const filtered = prev.filter((e) => e.date !== entry.date)
      return [...filtered, entry]
    })
  }

  const deleteEntry = (date) => {
    setEntries((prev) => prev.filter((e) => e.date !== date))
  }

  // When current weight changes in settings, also log it as today's entry
  const handleCurrentWeightChange = (weight) => {
    if (weight >= 50 && weight <= 700) {
      addEntry({ date: todayStr(), weight })
    }
  }

  const metrics = useMemo(() => calculateAll(settings), [settings])

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/40">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-white">Burn</span>
            <span className="text-emerald-400">Down</span>
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowChangelog(true)}
              className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span className="text-[11px] font-medium">v0.1</span>
            </button>
            <button
              onClick={() => setShowAppSettings(true)}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-4 overflow-y-auto">
        <div className="max-w-lg mx-auto">
          {tab === 'dashboard' && (
            <Dashboard metrics={metrics} entries={entries} onAddEntry={addEntry} onDeleteEntry={deleteEntry} />
          )}
          {tab === 'planning' && (
            <Settings
              settings={settings}
              onChange={setSettings}
              onCurrentWeightChange={handleCurrentWeightChange}
              metrics={metrics}
            />
          )}
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="sticky bottom-0 z-20 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800/40">
        <div className="max-w-lg mx-auto flex" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'planning', icon: SlidersHorizontal, label: 'Planning' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                tab === id
                  ? 'text-emerald-400'
                  : 'text-zinc-600 active:text-zinc-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* App Settings Modal */}
      {showAppSettings && (
        <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-white">Settings</h2>
            <button onClick={() => setShowAppSettings(false)} className="text-zinc-400 p-2 -mr-2">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800/60 space-y-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Units
                </label>
                <div className="flex gap-2">
                  {[
                    { id: 'lbs', label: 'Pounds (lbs)' },
                    { id: 'kg', label: 'Kilograms (kg)' },
                  ].map((u) => (
                    <button
                      key={u.id}
                      onClick={() => setSettings(s => ({ ...s, units: u.id }))}
                      className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                        settings.units === u.id
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                          : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700/80'
                      }`}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-xs text-zinc-600 text-center">More settings coming soon.</p>
          </div>
        </div>
      )}

      {/* Changelog / Roadmap Modal */}
      {showChangelog && (
        <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-white">BurnDown v0.1</h2>
            <button onClick={() => setShowChangelog(false)} className="text-zinc-400 p-2 -mr-2">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Changelog</h3>
              <div className="space-y-2">
                {CHANGELOG.map((item, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <span className="text-zinc-600 font-mono text-xs shrink-0 pt-0.5">{item.date}</span>
                    <span className="text-zinc-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Roadmap</h3>
              <div className="space-y-2">
                {ROADMAP.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-zinc-700 mt-1">&#9633;</span>
                    <span className="text-zinc-400">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
