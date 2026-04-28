import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { getServerTime } from '@/api/system.api';

interface ISample {
  index: number;
  t0: number;
  t2: number;
  serverUtcMs: number;
  roundTripMs: number;
  driftMs: number;
  serverUtcIso: string;
}

function statusColor(driftMs: number, halfRoundTrip: number): 'green' | 'yellow' | 'red' {
  const abs = Math.abs(driftMs);
  if (abs <= halfRoundTrip) return 'green';
  if (abs <= 1000) return 'yellow';
  return 'red';
}

function StatusBadge({ drift, halfRoundTrip }: { drift: number; halfRoundTrip: number }) {
  const color = statusColor(drift, halfRoundTrip);
  const label =
    color === 'green' ? 'OK — within latency window'
    : color === 'yellow' ? 'WARN — mild clock skew'
    : 'ERROR — significant clock skew';

  const cls =
    color === 'green' ? 'bg-green-100 text-green-800 border-green-300'
    : color === 'yellow' ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
    : 'bg-red-100 text-red-800 border-red-300';

  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>{label}</span>;
}

function ms(n: number) {
  return `${n.toFixed(1)} ms`;
}

export function SystemTestPage() {
  const [samples, setSamples] = useState<ISample[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  async function runSamples(count: number) {
    abortRef.current = false;
    setRunning(true);
    setError(null);
    setSamples([]);
    const collected: ISample[] = [];
    for (let i = 0; i < count; i++) {
      if (abortRef.current) break;
      try {
        const t0 = Date.now();
        const data = await getServerTime();
        const t2 = Date.now();
        const roundTripMs = t2 - t0;
        const midpoint = (t0 + t2) / 2;
        const driftMs = data.serverUtcMs - midpoint;
        collected.push({ index: i + 1, t0, t2, serverUtcMs: data.serverUtcMs, roundTripMs, driftMs, serverUtcIso: data.serverUtcIso });
        setSamples([...collected]);
        // Small gap between samples
        if (i < count - 1) await new Promise(r => setTimeout(r, 200));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
        break;
      }
    }
    setRunning(false);
  }

  function stop() {
    abortRef.current = true;
  }

  const avgDrift = samples.length
    ? samples.reduce((s, x) => s + x.driftMs, 0) / samples.length
    : null;
  const avgRoundTrip = samples.length
    ? samples.reduce((s, x) => s + x.roundTripMs, 0) / samples.length
    : null;
  const maxAbs = samples.length
    ? Math.max(...samples.map(x => Math.abs(x.driftMs)))
    : null;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Server / Client Time Sync Test</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Compares UTC time from the server vs the browser. Drift beyond round-trip/2 indicates real clock skew.
        </p>
      </div>

      {/* Legend */}
      <div className="rounded-md border bg-muted/30 p-4 text-sm space-y-1">
        <p><span className="font-medium">Round-trip</span> — total time for the HTTP request (t₂ − t₀).</p>
        <p><span className="font-medium">Drift</span> — server time minus estimated midpoint ((t₀ + t₂) / 2). Positive = server ahead.</p>
        <p><span className="font-medium">OK</span> if |drift| ≤ round-trip / 2 &nbsp;·&nbsp; <span className="font-medium">WARN</span> if ≤ 1 s &nbsp;·&nbsp; <span className="font-medium">ERROR</span> if &gt; 1 s.</p>
      </div>

      {/* Controls */}
      <div className="flex gap-2 flex-wrap">
        {[1, 5, 10, 20].map(n => (
          <Button key={n} variant="outline" size="sm" disabled={running} onClick={() => runSamples(n)}>
            Run {n}×
          </Button>
        ))}
        {running && (
          <Button variant="destructive" size="sm" onClick={stop}>Stop</Button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary */}
      {samples.length > 0 && (
        <div className="rounded-md border p-4 space-y-1 text-sm">
          <p className="font-semibold text-base mb-2">Summary ({samples.length} sample{samples.length > 1 ? 's' : ''})</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1">
            <span className="text-muted-foreground">Avg round-trip</span>
            <span className="font-mono">{avgRoundTrip !== null ? ms(avgRoundTrip) : '—'}</span>
            <span className="text-muted-foreground">Avg drift</span>
            <span className="font-mono">{avgDrift !== null ? ms(avgDrift) : '—'}</span>
            <span className="text-muted-foreground">Max |drift|</span>
            <span className="font-mono">{maxAbs !== null ? ms(maxAbs) : '—'}</span>
          </div>
          {avgDrift !== null && avgRoundTrip !== null && (
            <div className="mt-2">
              <StatusBadge drift={avgDrift} halfRoundTrip={avgRoundTrip / 2} />
            </div>
          )}
        </div>
      )}

      {/* Sample table */}
      {samples.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">#</th>
                <th className="px-3 py-2 text-left font-medium">Client UTC (t₀)</th>
                <th className="px-3 py-2 text-left font-medium">Server UTC</th>
                <th className="px-3 py-2 text-right font-medium">Round-trip</th>
                <th className="px-3 py-2 text-right font-medium">Drift</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {samples.map(s => (
                <tr key={s.index} className="border-t">
                  <td className="px-3 py-2 text-muted-foreground">{s.index}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{new Date(s.t0).toISOString()}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{s.serverUtcIso}</td>
                  <td className="px-3 py-2 text-right font-mono">{ms(s.roundTripMs)}</td>
                  <td className={`px-3 py-2 text-right font-mono ${Math.abs(s.driftMs) > s.roundTripMs / 2 ? 'text-red-600' : ''}`}>
                    {s.driftMs > 0 ? '+' : ''}{ms(s.driftMs)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge drift={s.driftMs} halfRoundTrip={s.roundTripMs / 2} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {running && samples.length === 0 && (
        <p className="text-muted-foreground text-sm">Running…</p>
      )}
    </div>
  );
}
