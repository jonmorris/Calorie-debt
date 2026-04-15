import { useState, useEffect, useMemo } from 'react'
import { LayoutDashboard, PenLine, SlidersHorizontal } from 'lucide-react'
import Dashboard from './components/Dashboard'
import Track from './components/Track'
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
  activityLevel: 'sedentary',
  planMode: 'lbsPerWeek',
  lbsPerWeek: 1.5,
  targetDate: getDefaultDate(),
  dailyStepGoal: 10000,
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

export default function App() {
  const [tab, setTab] = useState('dashboard')
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
            <span className="text-white">Calorie</span>
            <span className="text-emerald-400">Debt</span>
          </h1>
          <span className="text-[11px] text-zinc-600 font-mono tabular-nums">
            {settings.currentWeight} &rarr; {settings.targetWeight} lbs
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-4 overflow-y-auto">
        <div className="max-w-lg mx-auto">
          {tab === 'dashboard' && (
            <Dashboard metrics={metrics} entries={entries} />
          )}
          {tab === 'track' && (
            <Track entries={entries} onAdd={addEntry} onDelete={deleteEntry} />
          )}
          {tab === 'settings' && (
            <Settings
              settings={settings}
              onChange={setSettings}
              onCurrentWeightChange={handleCurrentWeightChange}
            />
          )}
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="sticky bottom-0 z-20 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800/40">
        <div className="max-w-lg mx-auto flex" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'track', icon: PenLine, label: 'Track' },
            { id: 'settings', icon: SlidersHorizontal, label: 'Settings' },
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
    </div>
  )
}
