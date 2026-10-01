'use client';

import { useState } from 'react';

const GLOSSARY = {
  'Absorbing Barrier':
    'A point of no return — once you cross it, you cannot recover and the game is over.',
  'Via Negativa':
    'Improving by removing things (habits, risks, options) instead of adding more.',
  Ergodicity:
    'The difference between what works on average across many people and what works for you over time.',
  '0 to 1':
    'Creating something entirely new rather than copying what already exists (1 to N).',
  'Power Law':
    'A distribution where a few outcomes are enormously bigger than all the rest.',
  'Non-Consensus Secret':
    'A truth you believe that most other people do not agree with yet.',
  'Creative Monopoly':
    'Owning a niche so completely that you escape head-to-head competition.',
  'Skin in the Game':
    'Having something real to lose, so your incentives match your advice.',
  Antifragility:
    'Gaining strength from shocks and volatility instead of being broken by them.'
};

function Tooltip({ term }) {
  const [open, setOpen] = useState(false);
  const explanation = GLOSSARY[term];
  if (!explanation) return null;

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={`Explain ${term}`}
        onClick={() => setOpen((v) => !v)}
        style={{
          marginLeft: 6,
          width: 16,
          height: 16,
          borderRadius: '50%',
          border: '1px solid #cbd5e1',
          background: '#f8fafc',
          color: '#64748b',
          fontSize: 10,
          fontWeight: 700,
          lineHeight: 1,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0
        }}
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: '130%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 240,
            background: '#1a1a2e',
            color: '#f8fafc',
            fontSize: 12,
            lineHeight: 1.5,
            padding: '8px 10px',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            zIndex: 50,
            textAlign: 'left'
          }}
        >
          {explanation}
        </span>
      )}
    </span>
  );
}

const LENSES = [
  { id: 'taleb', label: 'Nassim Nicholas Taleb' },
  { id: 'thiel', label: 'Peter Thiel' }
];

const LOADING_STEPS = [
  'Step 1: Grounding with live Google Search data...',
  'Step 2: Running adversarial debate across active lenses...',
  'Step 3: Formulating Barbell Synthesis & Kill Criteria...'
];

function pick() {
  for (let i = 0; i < arguments.length; i++) {
    const value = arguments[i];
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    return value;
  }
  return undefined;
}

function pickArray() {
  for (let i = 0; i < arguments.length; i++) {
    const value = arguments[i];
    if (Array.isArray(value) && value.filter(Boolean).length > 0) {
      return value.filter(Boolean);
    }
  }
  return [];
}

function renderText(value, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'string' ? v : JSON.stringify(v)))
      .join(' • ');
  }
  return JSON.stringify(value);
}

function FactList({ items, renderItem }) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (list.length === 0) return <p style={styles.muted}>No entries returned.</p>;
  return (
    <ul style={styles.ul}>
      {list.map((item, i) => (
        <li key={i} style={styles.li}>
          {renderItem ? renderItem(item, i) : renderText(item)}
        </li>
      ))}
    </ul>
  );
}

export default function Page() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [lensesOpen, setLensesOpen] = useState(false);
  const [reminderSet, setReminderSet] = useState(false);

  async function handleAnalyze() {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setReminderSet(false);
    setStepIndex(0);

    const stepTimer = setInterval(() => {
      setStepIndex((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
    }, 2600);

    try {
      const res = await fetch('/api/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed })
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload || payload.success !== true) {
        throw new Error(
          (payload && payload.error) || `Request failed with status ${res.status}.`
        );
      }

      setResult(payload.data);
    } catch (err) {
      setError(err && err.message ? err.message : 'Something went wrong.');
    } finally {
      clearInterval(stepTimer);
      setLoading(false);
    }
  }

  const data = result || {};
  const taleb = data.taleb || null;
  const thiel = data.thiel || null;
  const synthesis = data.synthesis || null;

  const talebClaim = pick(
    taleb && taleb.claim,
    taleb && taleb.downsideAudit,
    taleb && taleb.audit
  );

  const talebBarrier = pick(
    taleb && taleb.absorbingBarrier,
    taleb && taleb.absorbing_barrier,
    taleb && taleb.ruinRisk
  );

  const talebRuinRisk = pick(
    taleb && taleb.ruinRisk,
    taleb && taleb.ruin_risk,
    taleb && taleb.riskOfRuin
  );

  const talebViaNegativa = pickArray(
    taleb && taleb.viaNegativa,
    taleb && taleb.via_negativa,
    taleb && taleb.toAvoid
  );

  const talebErgodicity = pick(
    taleb && taleb.ergodicityCheck,
    taleb && taleb.ergodicity_check,
    taleb && taleb.ergodicity
  );

  const thielClaim = pick(
    thiel && thiel.claim,
    thiel && thiel.upsideAudit,
    thiel && thiel.audit
  );

  const thielZeroToOne = pick(
    thiel && thiel.zeroToOne,
    thiel && thiel.zero_to_one,
    thiel && thiel.differentiation
  );

  const thielSecret = pick(
    thiel && thiel.secret,
    thiel && thiel.nonConsensusSecret,
    thiel && thiel.non_consensus_secret
  );

  const thielMonopoly = pick(
    thiel && thiel.monopolyAngle,
    thiel && thiel.creativeMonopoly,
    thiel && thiel.creative_monopoly
  );

  const thielPowerLaw = pick(
    thiel && thiel.powerLaw,
    thiel && thiel.power_law,
    thiel && thiel.powerLawFocus
  );

  const verdict = renderText(pick(synthesis && synthesis.verdict), '—');
  const verdictColor =
    verdict.toLowerCase() === 'proceed'
      ? '#16a34a'
      : verdict.toLowerCase() === 'abort'
      ? '#dc2626'
      : '#d97706';

  const confidenceValue = pick(synthesis && synthesis.confidence, 75);
  const confidence = Math.max(0, Math.min(100, Math.round(Number(confidenceValue) || 75)));

  const talebFloor = pick(
    synthesis && synthesis.killCriteria,
    synthesis && synthesis.talebFloor,
    synthesis && synthesis.survivalFloor
  );

  const thielCeiling = pick(
    synthesis && synthesis.unfairAdvantage,
    synthesis && synthesis.thielCeiling,
    synthesis && synthesis.upsideCeiling
  );

  const nextActions = pickArray(
    synthesis && synthesis.nextActions,
    synthesis && synthesis.actions
  );

  const verdictReasoning = pick(
    synthesis && synthesis.verdictReasoning,
    synthesis && synthesis.verdict_reasoning,
    synthesis && synthesis.reasoning
  );

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.brandRow}>
            <div style={styles.brandIcon}>⚖️</div>
            <div>
              <h1 style={styles.title}>PRISM</h1>
              <p style={styles.subtitle}>AI Decision Operating System</p>
            </div>
          </div>

          <div style={styles.lensWrap}>
            <button
              type="button"
              onClick={() => setLensesOpen((v) => !v)}
              style={styles.lensPill}
              aria-expanded={lensesOpen}
            >
              <span style={styles.lensDot} />
              Active Lenses: {LENSES.map((l) => l.label).join(' · ')}
              <span style={styles.lensCaret}>{lensesOpen ? '▲' : '▼'}</span>
            </button>
            {lensesOpen && (
              <div style={styles.lensPanel}>
                <p style={styles.lensPanelTitle}>Active Frameworks</p>
                <ul style={styles.ul}>
                  {LENSES.map((l) => (
                    <li key={l.id} style={styles.li}>
                      {l.label}
                    </li>
                  ))}
                </ul>
                <p style={styles.muted}>
                  More lenses can be added to the barbell over time.
                </p>
              </div>
            )}
          </div>
        </header>

        <section style={styles.card}>
          <h2 style={styles.h2}>The Dilemma</h2>
          <p style={styles.muted}>
            Describe the decision, the stakes, and any constraints you are working under.
          </p>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Should I leave my stable job to build a niche AI product with 6 months of runway?"
            rows={6}
            style={styles.textarea}
            disabled={loading}
          />
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading || question.trim().length === 0}
            style={{
              ...styles.primaryButton,
              opacity: loading || question.trim().length === 0 ? 0.6 : 1,
              cursor: loading || question.trim().length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Analyzing…' : 'Analyze Decision →'}
          </button>
        </section>

        {loading && (
          <section style={styles.card}>
            <div style={styles.pulseWrap}>
              <span style={styles.pulseDot} />
              <p style={styles.loadingText}>{LOADING_STEPS[stepIndex]}</p>
            </div>
            <div style={styles.progressTrack}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${((stepIndex + 1) / LOADING_STEPS.length) * 100}%`
                }}
              />
            </div>
          </section>
        )}

        {error && (
          <section style={{ ...styles.card, borderColor: '#fecaca', background: '#fef2f2' }}>
            <h2 style={{ ...styles.h2, color: '#b91c1c' }}>Analysis Failed</h2>
            <p style={{ ...styles.muted, color: '#b91c1c' }}>{error}</p>
          </section>
        )}

        {result && (
          <>
            <section style={styles.debateGrid}>
              <article style={{ ...styles.card, borderTop: '4px solid #f43f5e' }}>
                <div style={styles.cardHeader}>
                  <h2 style={styles.h2}>Nassim Nicholas Taleb</h2>
                  <span style={{ ...styles.tag, background: '#ffe4e6', color: '#be123c' }}>
                    Downside &amp; Ruin Audit
                  </span>
                </div>

                <h3 style={styles.h3}>Claim / Downside Audit</h3>
                <p style={styles.body}>{renderText(talebClaim)}</p>

                <h3 style={styles.h3}>
                  Absorbing Barrier
                  <Tooltip term="Absorbing Barrier" />
                </h3>
                <p style={styles.body}>{renderText(talebBarrier)}</p>

                <h3 style={styles.h3}>Ruin Risk</h3>
                <p style={styles.body}>{renderText(talebRuinRisk)}</p>

                <h3 style={styles.h3}>
                  Via Negativa
                  <Tooltip term="Via Negativa" />
                </h3>
                <FactList items={talebViaNegativa} />

                <h3 style={styles.h3}>
                  Ergodicity Check
                  <Tooltip term="Ergodicity" />
                </h3>
                <p style={styles.body}>{renderText(talebErgodicity)}</p>
              </article>

              <article style={{ ...styles.card, borderTop: '4px solid #0ea5e9' }}>
                <div style={styles.cardHeader}>
                  <h2 style={styles.h2}>Peter Thiel</h2>
                  <span style={{ ...styles.tag, background: '#e0f2fe', color: '#0369a1' }}>
                    Upside &amp; Monopoly Audit
                  </span>
                </div>

                <h3 style={styles.h3}>Claim / Upside Audit</h3>
                <p style={styles.body}>{renderText(thielClaim)}</p>

                <h3 style={styles.h3}>
                  0 to 1
                  <Tooltip term="0 to 1" />
                </h3>
                <p style={styles.body}>{renderText(thielZeroToOne)}</p>

                <h3 style={styles.h3}>
                  Non-Consensus Secret
                  <Tooltip term="Non-Consensus Secret" />
                </h3>
                <p style={styles.body}>{renderText(thielSecret)}</p>

                <h3 style={styles.h3}>
                  Creative Monopoly
                  <Tooltip term="Creative Monopoly" />
                </h3>
                <p style={styles.body}>{renderText(thielMonopoly)}</p>

                <h3 style={styles.h3}>
                  Power Law Focus
                  <Tooltip term="Power Law" />
                </h3>
                <p style={styles.body}>{renderText(thielPowerLaw)}</p>
              </article>
            </section>

            <section style={styles.synthesisCard}>
              <div style={styles.cardHeader}>
                <h2 style={styles.h2}>Barbell Synthesis</h2>
                <span style={{ ...styles.tag, background: '#fef3c7', color: '#92400e' }}>
                  Thinking OS Verdict
                </span>
              </div>

              <div style={styles.verdictRow}>
                <div>
                  <p style={styles.muted}>Final Verdict</p>
                  <p style={{ ...styles.verdict, color: verdictColor }}>{verdict}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={styles.muted}>Confidence Score</p>
                  <p style={styles.confidence}>{confidence}%</p>
                </div>
              </div>

              {verdictReasoning && (
                <p style={styles.body}>{renderText(verdictReasoning)}</p>
              )}

              <div style={styles.floorCeilingGrid}>
                <div style={styles.floorBox}>
                  <h3 style={styles.h3}>Taleb Floor — Survival &amp; Kill Criteria</h3>
                  <p style={styles.body}>{renderText(talebFloor)}</p>
                </div>
                <div style={styles.ceilingBox}>
                  <h3 style={styles.h3}>Thiel Ceiling — Unfair Advantage &amp; 10x Leap</h3>
                  <p style={styles.body}>{renderText(thielCeiling)}</p>
                </div>
              </div>

              <h3 style={styles.h3}>3 Immediate Next Actions</h3>
              <FactList items={nextActions} />

              <button
                type="button"
                onClick={() => setReminderSet(true)}
                disabled={reminderSet}
                style={{
                  ...styles.secondaryButton,
                  opacity: reminderSet ? 0.7 : 1,
                  cursor: reminderSet ? 'default' : 'pointer'
                }}
              >
                {reminderSet ? '✓ 30-Day Check-in Scheduled' : 'Remind me in 30 days'}
              </button>
            </section>
          </>
        )}

        <footer style={styles.footer}>
          PRISM · AI Decision Operating System · Barbell Engine v2
        </footer>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f0f2f5',
    color: '#1a1a2e',
    padding: '32px 16px 64px'
  },
  container: {
    maxWidth: 1040,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 20
  },
  header: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 14
  },
  brandIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#ffffff',
    fontSize: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)'
  },
  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: '0.02em'
  },
  subtitle: {
    margin: 0,
    fontSize: 16,
    color: '#64748b'
  },
  lensWrap: {
    position: 'relative'
  },
  lensPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 14px',
    borderRadius: 999,
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    color: '#1a1a2e',
    fontSize: 14,
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
  },
  lensDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'
  },
  lensCaret: {
    fontSize: 10,
    color: '#64748b'
  },
  lensPanel: {
    position: 'absolute',
    top: '110%',
    right: 0,
    width: 280,
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 16,
    boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
    zIndex: 40
  },
  lensPanelTitle: {
    margin: '0 0 8px',
    fontSize: 14,
    fontWeight: 600
  },
  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
  },
  synthesisCard: {
    background: '#fffff0',
    border: '1px solid #f6e05e',
    borderRadius: 14,
    padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
  },
  debateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 20
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 12
  },
  h2: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700
  },
  h3: {
    margin: '18px 0 6px',
    fontSize: 16,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center'
  },
  body: {
    margin: 0,
    fontSize: 16,
    lineHeight: 1.7,
    color: '#1a1a2e'
  },
  muted: {
    margin: '4px 0',
    fontSize: 14,
    color: '#64748b'
  },
  tag: {
    fontSize: 12,
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: 999,
    whiteSpace: 'nowrap'
  },
  ul: {
    margin: '6px 0 0',
    paddingLeft: 20,
    fontSize: 16,
    lineHeight: 1.7
  },
  li: {
    marginBottom: 6
  },
  textarea: {
    width: '100%',
    marginTop: 12,
    marginBottom: 16,
    padding: 14,
    fontSize: 16,
    lineHeight: 1.7,
    fontFamily: 'inherit',
    color: '#1a1a2e',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    resize: 'vertical',
    outline: 'none'
  },
  primaryButton: {
    width: '100%',
    padding: '14px 20px',
    fontSize: 16,
    fontWeight: 600,
    color: '#ffffff',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none',
    borderRadius: 10,
    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
  },
  secondaryButton: {
    marginTop: 20,
    padding: '12px 18px',
    fontSize: 15,
    fontWeight: 600,
    color: '#1a1a2e',
    background: '#ffffff',
    border: '1px solid #f6e05e',
    borderRadius: 10,
    cursor: 'pointer'
  },
  pulseWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    animation: 'prismPulse 1.4s ease-in-out infinite'
  },
  loadingText: {
    margin: 0,
    fontSize: 16,
    fontWeight: 500
  },
  progressTrack: {
    marginTop: 14,
    height: 6,
    borderRadius: 999,
    background: '#e2e8f0',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    transition: 'width 0.6s ease'
  },
  verdictRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 12
  },
  verdict: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: '0.02em'
  },
  confidence: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700
  },
  floorCeilingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 16,
    marginTop: 18
  },
  floorBox: {
    background: '#fff1f2',
    border: '1px solid #fecdd3',
    borderRadius: 10,
    padding: 16
  },
  ceilingBox: {
    background: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: 10,
    padding: 16
  },
  footer: {
    textAlign: 'center',
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 24
  }
};
