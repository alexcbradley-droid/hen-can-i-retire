'use client';

// Spreadsheet upload: parses .xlsx/.xls/.csv in the browser, sends the sheet
// contents to /api/interpret, and turns the AI's reading into a new scenario.

import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useStore } from '@/lib/store';
import { Intake, intakeToScenario } from '@/lib/intake';
import { Scenario } from '@/lib/engine/types';
import { earliestRetirementDate, sustainableMonthlyIncome, withRetirementDate } from '@/lib/engine/solvers';
import { gbp, ymLabel } from '@/lib/format';

export default function UploadPanel({ onDone }: { onDone?: () => void }) {
  const store = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<'idle' | 'reading' | 'thinking'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Intake | null>(null);
  const [imported, setImported] = useState<Scenario | null>(null);
  const [verdict, setVerdict] = useState<{ date: string | null; income: number; planToAge: number } | null>(null);
  const [solving, setSolving] = useState(false);
  const [over, setOver] = useState(false);

  const whenCanIRetire = () => {
    if (!imported) return;
    setSolving(true);
    // Yield so the button repaints before the solver blocks the main thread.
    setTimeout(() => {
      const date = earliestRetirementDate(imported);
      const income = sustainableMonthlyIncome(date ? withRetirementDate(imported, date) : imported);
      setVerdict({ date, income, planToAge: imported.people[0]?.planToAge ?? 95 });
      setSolving(false);
    }, 30);
  };

  const handleFile = async (file: File) => {
    setError(null);
    setResult(null);
    setImported(null);
    setVerdict(null);
    setState('reading');
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { cellDates: true });
      const sheets = wb.SheetNames.slice(0, 10).map((name) => ({
        name,
        csv: XLSX.utils.sheet_to_csv(wb.Sheets[name], { blankrows: false }),
      })).filter((s) => s.csv.trim().length > 0);
      if (!sheets.length) throw new Error('That file looks empty.');
      setState('thinking');
      const res = await fetch('/api/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheets }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not read the spreadsheet.');
      const intake: Intake = data.intake;
      const scenario = intakeToScenario(intake, file.name.replace(/\.\w+$/, ''));
      store.importJson(JSON.stringify(scenario));
      setImported(scenario);
      setResult(intake); // the user reads the notes, then opens the planner via the button
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong with that file.');
    } finally {
      setState('idle');
    }
  };

  return (
    <div>
      <div
        className={`dropzone ${over ? 'over' : ''}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault(); setOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
      >
        {state === 'idle' && (
          <>
            <p style={{ margin: 0 }}><b>Upload your own spreadsheet</b> (.xlsx, .xls or .csv)</p>
            <p className="small" style={{ margin: '6px 0 0' }}>
              Any layout works — AI reads it, maps what it finds into a new plan, and lists what&apos;s missing.
              The contents are sent to the AI service for this one purpose and are not stored.
            </p>
          </>
        )}
        {state === 'reading' && <p style={{ margin: 0 }}>Reading the file…</p>}
        {state === 'thinking' && <p style={{ margin: 0 }}>Interpreting your spreadsheet — this takes up to a minute…</p>}
      </div>
      <input
        ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />
      {error && <p className="notice" style={{ borderColor: 'var(--red)' }}>{error}</p>}
      {result && (
        <div className="notice info">
          <b>Imported as a new scenario — it&apos;s saved in this browser and now drives the planner.</b>
          {result.notes?.length > 0 && (
            <>
              <p style={{ margin: '8px 0 4px' }}><b>What I found and assumed:</b></p>
              <ul style={{ margin: 0 }}>{result.notes.slice(0, 8).map((n, i) => <li key={i}>{n}</li>)}</ul>
            </>
          )}
          {result.questions?.length > 0 && (
            <>
              <p style={{ margin: '8px 0 4px' }}><b>To make the projection accurate, please add:</b></p>
              <ul style={{ margin: 0 }}>{result.questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
            </>
          )}
          <div className="btn-row" style={{ marginTop: 10 }}>
            <button className="btn cta" onClick={whenCanIRetire} disabled={solving}>
              {solving ? 'Working it out…' : 'When can I retire?'}
            </button>
            <button className="btn" onClick={() => onDone?.()}>Open in the planner</button>
            {store.cloudOn && !store.userEmail && (
              <button className="btn" onClick={store.signIn}>Sign in with Google to save it to your account</button>
            )}
          </div>
          {verdict && (
            <p style={{ margin: '10px 0 0' }}>
              {verdict.date ? (
                <>You could retire in <b>{ymLabel(verdict.date)}</b> with about <b>{gbp(verdict.income)}/month</b> to
                  spend (today&apos;s money), lasting to age {verdict.planToAge}. Open the planner for the full
                  picture and to stress-test it.</>
              ) : (
                <>With current spending, your money doesn&apos;t yet stretch to the planned retirement date — the
                  plan sustains about <b>{gbp(verdict.income)}/month</b>. Open the planner to adjust savings,
                  spending or dates.</>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
