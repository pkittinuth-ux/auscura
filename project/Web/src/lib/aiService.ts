// ── AI Service API Layer ────────────────────────────────────────────────────
const AI_URL = 'http://127.0.0.1:8000';

export interface AIPrediction {
  label: string;
  type: string;
  severity: 'Good' | 'Warning' | 'Bad';
  result_message: string;
  clinical_note: string;
  description: string;
  confidence: number;
  details: {
    location_detected: string;
    dominant_freq_detected: string;
    segments_analyzed: number;
  };
}

/**
 * Send a WAV File (or Blob) to the Python AI service /analyze endpoint.
 */
export async function analyzeWav(file: File | Blob, filename = 'audio.wav'): Promise<AIPrediction> {
  const form = new FormData();
  form.append('file', file, filename);

  const res = await fetch(`${AI_URL}/analyze`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json() as Promise<AIPrediction>;
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${AI_URL}/health`, { signal: AbortSignal.timeout(4000) });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Session store (in-memory) ──────────────────────────────────────────────
// Stores per-step WAV files & results for the current patient session.
export interface StepResult {
  step: number;
  filename: string;
  prediction: AIPrediction | null;
  error?: string;
}

const SESSION_KEY = 'auscura_session';

export function saveStepFile(step: number, file: File | Blob, name: string) {
  // Store file reference in sessionStorage as object URL
  const url = URL.createObjectURL(file);
  const raw = sessionStorage.getItem(SESSION_KEY);
  const session: Record<number, { url: string; name: string }> = raw ? JSON.parse(raw) : {};
  // Save for all remaining steps (including current)
  for (let i = step; i < 4; i++) {
    session[i] = { url, name };
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem('auscura_results');
  sessionStorage.removeItem('esp32_auto_mode');
}

export function saveResults(results: StepResult[]) {
  sessionStorage.setItem('auscura_results', JSON.stringify(results));
}

export function loadResults(): StepResult[] {
  const raw = sessionStorage.getItem('auscura_results');
  return raw ? JSON.parse(raw) : [];
}
