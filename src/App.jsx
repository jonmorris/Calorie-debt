import { useState, useEffect, useMemo } from 'react'
import { LayoutDashboard, SlidersHorizontal } from 'lucide-react'
import Dashboard from './components/Dashboard'
import Settings from './components/Settings'
import { calculateAll } from './utils/calculations'

const STORAGE_KEY = 'caloriedebt_settings'

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
  targetDate: getDefaultDate(),
  dailyStepGoal: 10000,
}

function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_SETTINGS }
}

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const [settings, setSettings] = useState(loadSettings)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // ignore storage errors
    }
  }, [settings])

  const metrics = useMemo(() => calculateAll(settings), [settings])

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/40">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-emerald-400">$</span>
            <span className="text-white">Calorie</span>
            <span className="text-zinc-400">Debt</span>
          </h1>
          <span className="text-[11px] text-zinc-600 font-mono tabular-nums">
            {settings.currentWeight} &rarr; {settings.targetWeight} lbs
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-4 overflow-y-auto">
        <div className="max-w-lg mx-auto">
          {tab === 'dashboard' ? (
            <Dashboard metrics={metrics} targetDate={settings.targetDate} />
          ) : (
            <Settings settings={settings} onChange={setSettings} />
          )}
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="sticky bottom-0 z-20 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800/40">
        <div className="max-w-lg mx-auto flex" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
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
