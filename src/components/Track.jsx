import { useState } from 'react';
import { PenLine, Trash2, Scale } from 'lucide-react';

export default function Track({ entries, onAdd, onDelete }) {
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
    <div className="space-y-4 pb-4">
      {/* Quick Add */}
      <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800/60 space-y-4">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
          <PenLine className="w-3.5 h-3.5" />
          Log Weight
        </h3>
        <div className="flex gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={today}
            className="flex-1 bg-zinc-800/80 border border-zinc-700/50 rounded-xl px-3 py-3 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all min-w-0"
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
              className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-xl px-3 py-3 text-white text-lg font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none">
              lbs
            </span>
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={!weight || !date}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          + Log Entry
        </button>
      </div>

      {/* History */}
      {sorted.length > 0 ? (
        <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800/60">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
            History
            <span className="text-zinc-600 ml-1.5">({sorted.length})</span>
          </h3>
          <div className="space-y-0.5">
            {sorted.map((entry) => {
              const formatted = new Date(entry.date + 'T00:00:00').toLocaleDateString(
                'en-US',
                { month: 'short', day: 'numeric', year: 'numeric' }
              );
              return (
                <div
                  key={entry.date}
                  className="flex items-center justify-between py-2.5 border-b border-zinc-800/40 last:border-0"
                >
                  <span className="text-sm text-zinc-400">{formatted}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-white font-mono">
                      {entry.weight} lbs
                    </span>
                    <button
                      onClick={() => onDelete(entry.date)}
                      className="text-zinc-700 hover:text-rose-400 active:text-rose-400 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-16">
          <Scale className="w-14 h-14 text-zinc-800 mx-auto mb-4" />
          <p className="text-zinc-500 text-sm font-medium">No entries yet</p>
          <p className="text-zinc-600 text-xs mt-1">
            Log your first weigh-in to start tracking progress.
          </p>
        </div>
      )}
    </div>
  );
}
