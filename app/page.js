"use client";
import { useState } from "react";

export default function Home() {
  const [idea, setIdea] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function decide() {
    if (!idea.trim()) return;
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch("/api/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function renderText(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) {
      return value
        .map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
        .join("\n");
    }
    if (typeof value === "object") {
      return Object.entries(value)
        .map(([k, v]) => {
          const label = k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
          if (Array.isArray(v)) {
            return `${label}: ${v.join("; ")}`;
          }
          if (v && typeof v === "object") {
            return `${label}: ${JSON.stringify(v)}`;
          }
          return `${label}: ${v}`;
        })
        .join("\n");
    }
    return String(value);
  }

  function renderBullets(value) {
    if (!value) return null;
    if (Array.isArray(value)) {
      return (
        <ul style={{ margin: "8px 0 0 0", padding: 0, listStyle: "none" }}>
          {value.map((item, i) => (
            <li key={i} style={{ marginBottom: 6 }}>
              <span style={{ marginRight: 8, color: "#b8860b" }}>•</span>
              {typeof item === "string" ? item : renderText(item)}
            </li>
          ))}
        </ul>
      );
    }
    if (typeof value === "string") {
      return <p style={{ margin: "8px 0 0 0" }}>{value}</p>;
    }
    return <p style={{ margin: "8px 0 0 0" }}>{renderText(value)}</p>;
  }

  function renderNumbered(value) {
    if (!value) return null;
    const items = Array.isArray(value) ? value : [value];
    return (
      <ol style={{ margin: "8px 0 0 0", paddingLeft: 20 }}>
        {items.map((item, i) => (
          <li key={i} style={{ marginBottom: 6 }}>
            {typeof item === "string" ? item : renderText(item)}
          </li>
        ))}
      </ol>
    );
  }

  function getTalebContent(t) {
    if (!t) return { main: "", barrier: "", viaNegativa: null, extras: [] };
    if (typeof t === "string") return { main: t, barrier: "", viaNegativa: null, extras: [] };
    const main =
      t.claim || t.audit || t.analysis || t.summary || t.critique || t.text || "";
    const barrier =
      t.absorbingBarrier || t.ruinRisk || t.absorbing_barrier || t.barrier || "";
    const viaNegativa =
      t.viaNegativa || t.via_negativa || t.thingsToAvoid || t.avoid || null;
    const used = new Set([
      "claim", "audit", "analysis", "summary", "critique", "text",
      "absorbingBarrier", "ruinRisk", "absorbing_barrier", "barrier",
      "viaNegativa", "via_negativa", "thingsToAvoid", "avoid",
    ]);
    const extras = Object.entries(t).filter(
      ([k, v]) => !used.has(k) && v !== null && v !== undefined && v !== ""
    );
    return { main, barrier, viaNegativa, extras };
  }

  function getThielContent(t) {
    if (!t) return { main: "", secret: "", advantages: null, extras: [] };
    if (typeof t === "string") return { main: t, secret: "", advantages: null, extras: [] };
    const main =
      t.claim || t.audit || t.analysis || t.summary || t.critique || t.text || "";
    const secret =
      t.secret || t.zeroToOne || t.monopolyAngle || t.nonConsensus || t.zero_to_one || "";
    const advantages =
      t.advantages || t.powerLaw || t.power_law || t.moats || null;
    const used = new Set([
      "claim", "audit", "analysis", "summary", "critique", "text",
      "secret", "zeroToOne", "monopolyAngle", "nonConsensus", "zero_to_one",
      "advantages", "powerLaw", "power_law", "moats",
    ]);
    const extras = Object.entries(t).filter(
      ([k, v]) => !used.has(k) && v !== null && v !== undefined && v !== ""
    );
    return { main, secret, advantages, extras };
  }

  function getSynthesisContent(s) {
    if (!s) return { verdict: "Proceed", rationale: "", killCriteria: "", unfairAdvantage: "", nextActions: [], extras: [] };
    if (typeof s === "string") return { verdict: "Proceed", rationale: s, killCriteria: "", unfairAdvantage: "", nextActions: [], extras: [] };
    const verdict = s.verdict || "Proceed";
    const rationale = s.summary || s.rationale || s.why || s.reasoning || "";
    const killCriteria = s.killCriteria || s.talebFloor || s.survival || s.floor || "";
    const unfairAdvantage = s.unfairAdvantage || s.thielCeiling || s.ceiling || s.tenX || "";
    const nextActions = s.nextActions || s.actions || s.steps || [];
    const used = new Set([
      "verdict", "summary", "rationale", "why", "reasoning",
      "killCriteria", "talebFloor", "survival", "floor",
      "unfairAdvantage", "thielCeiling", "ceiling", "tenX",
      "nextActions", "actions", "steps",
    ]);
    const extras = Object.entries(s).filter(
      ([k, v]) => !used.has(k) && v !== null && v !== undefined && v !== ""
    );
    return { verdict, rationale, killCriteria, unfairAdvantage, nextActions, extras };
  }

  const taleb = getTalebContent(data?.taleb);
  const thiel = getThielContent(data?.thiel);
  const synthesis = getSynthesisContent(data?.synthesis);

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e5e0d5",
    borderRadius: 12,
    padding: "24px 28px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    flex: 1,
    minWidth: 280,
  };

  const labelStyle = {
    fontSize: 12,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#8a7f6a",
    marginBottom: 12,
    fontWeight: 600,
  };

  const bodyStyle = {
    fontSize: 16,
    lineHeight: 1.6,
    color: "#2c2c2c",
    whiteSpace: "pre-wrap",
  };

  const subLabelStyle = {
    fontSize: 13,
    fontWeight: 600,
    color: "#5a5142",
    marginTop: 16,
    marginBottom: 4,
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#faf8f3",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        padding: "48px 24px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#2c2c2c",
            marginBottom: 8,
          }}
        >
          Thinking OS <span style={{ color: "#b8860b" }}>v2</span>
        </h1>
        <p style={{ color: "#8a7f6a", marginBottom: 32, fontSize: 15 }}>
          Run any idea through the Taleb, Thiel, and Barbell Synthesis filters.
        </p>

        <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
          <input
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && decide()}
            placeholder="Describe your idea, decision, or bet..."
            style={{
              flex: 1,
              padding: "14px 18px",
              fontSize: 16,
              border: "1px solid #e5e0d5",
              borderRadius: 10,
              background: "#fff",
              outline: "none",
              color: "#2c2c2c",
            }}
          />
          <button
            onClick={decide}
            disabled={loading}
            style={{
              padding: "14px 28px",
              fontSize: 16,
              fontWeight: 600,
              color: "#fff",
              background: loading ? "#c9b98a" : "#b8860b",
              border: "none",
              borderRadius: 10,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Thinking..." : "Decide"}
          </button>
        </div>

        {error && (
          <div style={{ color: "#b00020", marginBottom: 24 }}>{error}</div>
        )}

        {data && (
          <>
            <div
              style={{
                display: "flex",
                gap: 20,
                flexWrap: "wrap",
                marginBottom: 20,
              }}
            >
              {/* Taleb Card */}
              <div style={cardStyle}>
                <div style={labelStyle}>Taleb — Antifragility Audit</div>
                <div style={bodyStyle}>
                  {taleb.main ? (
                    <p style={{ margin: 0 }}>{renderText(taleb.main)}</p>
                  ) : null}
                  {taleb.barrier ? (
                    <>
                      <div style={subLabelStyle}>Absorbing Barrier / Ruin Risk</div>
                      <p style={{ margin: 0 }}>{renderText(taleb.barrier)}</p>
                    </>
                  ) : null}
                  {taleb.viaNegativa ? (
                    <>
                      <div style={subLabelStyle}>Via Negativa — Things to Avoid</div>
                      {renderBullets(taleb.viaNegativa)}
                    </>
                  ) : null}
                  {taleb.extras.length > 0 &&
                    taleb.extras.map(([k, v]) => (
                      <div key={k}>
                        <div style={subLabelStyle}>
                          {k
                            .replace(/([A-Z])/g, " $1")
                            .replace(/^./, (c) => c.toUpperCase())}
                        </div>
                        {renderBullets(v)}
                      </div>
                    ))}
                  {!taleb.main &&
                    !taleb.barrier &&
                    !taleb.viaNegativa &&
                    taleb.extras.length === 0 && (
                      <p style={{ margin: 0, color: "#8a7f6a" }}>
                        {renderText(data.taleb) || "—"}
                      </p>
                    )}
                </div>
              </div>

              {/* Thiel Card */}
              <div style={cardStyle}>
                <div style={labelStyle}>Thiel — Monopoly & Secrets</div>
                <div style={bodyStyle}>
                  {thiel.main ? (
                    <p style={{ margin: 0 }}>{renderText(thiel.main)}</p>
                  ) : null}
                  {thiel.secret ? (
                    <>
                      <div style={subLabelStyle}>
                        0 to 1 / Non-consensus Secret
                      </div>
                      <p style={{ margin: 0 }}>{renderText(thiel.secret)}</p>
                    </>
                  ) : null}
                  {thiel.advantages ? (
                    <>
                      <div style={subLabelStyle}>
                        Advantages / Power Law
                      </div>
                      {renderBullets(thiel.advantages)}
                    </>
                  ) : null}
                  {thiel.extras.length > 0 &&
                    thiel.extras.map(([k, v]) => (
                      <div key={k}>
                        <div style={subLabelStyle}>
                          {k
                            .replace(/([A-Z])/g, " $1")
                            .replace(/^./, (c) => c.toUpperCase())}
                        </div>
                        {renderBullets(v)}
                      </div>
                    ))}
                  {!thiel.main &&
                    !thiel.secret &&
                    !thiel.advantages &&
                    thiel.extras.length === 0 && (
                      <p style={{ margin: 0, color: "#8a7f6a" }}>
                        {renderText(data.thiel) || "—"}
                      </p>
                    )}
                </div>
              </div>
            </div>

            {/* Synthesis Card */}
            <div
              style={{
                background: "#fffdf5",
                border: "1px solid #e8dcc0",
                borderRadius: 12,
                padding: "32px 36px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div style={labelStyle}>Barbell Synthesis</div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#b8860b",
                  marginBottom: 20,
                }}
              >
                {synthesis.verdict}
              </div>
              <div style={bodyStyle}>
                {synthesis.rationale ? (
                  <>
                    <div style={subLabelStyle}>Main Rationale</div>
                    <p style={{ margin: 0 }}>{renderText(synthesis.rationale)}</p>
                  </>
                ) : null}
                {synthesis.killCriteria ? (
                  <>
                    <div style={subLabelStyle}>
                      Taleb Floor — Survival / Kill Criteria
                    </div>
                    <p style={{ margin: 0 }}>
                      {renderText(synthesis.killCriteria)}
                    </p>
                  </>
                ) : null}
                {synthesis.unfairAdvantage ? (
                  <>
                    <div style={subLabelStyle}>
                      Thiel Ceiling — Unfair Advantage / 10x
                    </div>
                    <p style={{ margin: 0 }}>
                      {renderText(synthesis.unfairAdvantage)}
                    </p>
                  </>
                ) : null}
                {synthesis.nextActions &&
                  (Array.isArray(synthesis.nextActions)
                    ? synthesis.nextActions.length > 0
                    : true) && (
                    <>
                      <div style={subLabelStyle}>Immediate Actions</div>
                      {renderNumbered(synthesis.nextActions)}
                    </>
                  )}
                {synthesis.extras.length > 0 &&
                  synthesis.extras.map(([k, v]) => (
                    <div key={k}>
                      <div style={subLabelStyle}>
                        {k
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (c) => c.toUpperCase())}
                      </div>
                      {renderBullets(v)}
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
