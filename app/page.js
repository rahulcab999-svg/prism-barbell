"use client";
import { useState, useEffect, useRef } from "react";

function PrismLogo() {
  return (
    <svg width="34" height="34" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: "middle" }}>
      {/* Incoming white light beam */}
      <line x1="2" y1="26" x2="16" y2="20" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" filter="drop-shadow(0 0 2px rgba(0,0,0,0.3))" />
      {/* Glass triangle prism */}
      <polygon points="20,8 10,32 30,32" stroke="#1a1a2e" strokeWidth="2.2" fill="#ffffff" fillOpacity="0.85" strokeLinejoin="round" />
      {/* 7 Refracted rainbow rays */}
      <line x1="23" y1="19" x2="38" y2="13" stroke="#e63946" strokeWidth="2" strokeLinecap="round" /> {/* Red */}
      <line x1="23.5" y1="20.5" x2="38" y2="16.5" stroke="#f4a261" strokeWidth="2" strokeLinecap="round" /> {/* Orange */}
      <line x1="24" y1="22" x2="38" y2="20" stroke="#e9c46a" strokeWidth="2" strokeLinecap="round" /> {/* Yellow */}
      <line x1="24.5" y1="23.5" x2="38" y2="23.5" stroke="#2a9d8f" strokeWidth="2" strokeLinecap="round" /> {/* Green */}
      <line x1="25" y1="25" x2="38" y2="27" stroke="#0077b6" strokeWidth="2" strokeLinecap="round" /> {/* Blue */}
      <line x1="25.5" y1="26.5" x2="38" y2="30.5" stroke="#4a4e69" strokeWidth="2" strokeLinecap="round" /> {/* Indigo */}
      <line x1="26" y1="28" x2="38" y2="34" stroke="#7209b7" strokeWidth="2" strokeLinecap="round" /> {/* Violet */}
    </svg>
  );
}

export default function Home() {
  const [idea, setIdea] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState("analysis");

  const [grounding, setGrounding] = useState({ summary: "", sources: [] });
  const [groundingOpen, setGroundingOpen] = useState(false);

  const [hydrated, setHydrated] = useState(false);
  const [journal, setJournal] = useState([]);

  const [emotionalState, setEmotionalState] = useState("");
  const [invalidationTrigger, setInvalidationTrigger] = useState("");
  const [horizonDays, setHorizonDays] = useState(30);
  const [premortem, setPremortem] = useState("");
  const [skepticView, setSkepticView] = useState("");
  const [reversibility, setReversibility] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [savedId, setSavedId] = useState(null);

  const [importMsg, setImportMsg] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("prism_journal");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setJournal(parsed);
        else setJournal([]);
      }
    } catch (e) {
      setJournal([]);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem("prism_journal", JSON.stringify(journal));
    } catch (e) {}
  }, [journal, hydrated]);

  async function decide() {
    if (!idea.trim()) return;
    setLoading(true);
    setError("");
    setData(null);
    setGrounding({ summary: "", sources: [] });
    setGroundingOpen(false);
    setSavedId(null);
    setEmotionalState("");
    setInvalidationTrigger("");
    setHorizonDays(30);
    setPremortem("");
    setSkepticView("");
    setReversibility("");
    setSaveOpen(false);
    try {
      const res = await fetch("/api/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Failed to generate decision.");
        return;
      }
      setData(json.data || json);
      setGrounding(json?.data?.grounding ?? { summary: "", sources: [] });
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
          if (Array.isArray(v)) return `${label}: ${v.join("; ")}`;
          if (v && typeof v === "object") return `${label}: ${JSON.stringify(v)}`;
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
    if (typeof value === "string") return <p style={{ margin: "8px 0 0 0" }}>{value}</p>;
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

  function renderGroundingText(text) {
    if (!text || typeof text !== "string") return null;
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const items = [];
    lines.forEach((raw) => {
      const hasBullet = /^\s*[*\-•]\s+/.test(raw);
      if (!hasBullet && /^here are/i.test(raw)) return;
      const line = raw.replace(/\*\*/g, "").replace(/__/g, "");
      const endsWithColon = line.endsWith(":") && line.length < 80 && !hasBullet;
      const isHeading =
        line.startsWith("#") ||
        /^\(?[a-cA-C]\)\s/.test(line) ||
        endsWithColon;
      if (isHeading) {
        let h = line.replace(/^#+\s*/, "").replace(/^\(?[a-cA-C]\)\s*/, "").trim();
        if (h) items.push({ type: "heading", text: h });
      } else {
        let b = line.replace(/^\s*[*\-•]\s+/, "").trim();
        if (b) items.push({ type: "bullet", text: b });
      }
    });
    if (items.length === 0) return null;
    let headingIndex = -1;
    return (
      <>
        {items.map((item, i) => {
          if (item.type === "heading") {
            headingIndex++;
            const isFirst = headingIndex === 0;
            return (
              <div
                key={i}
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 700,
                  color: "#b8860b",
                  marginTop: isFirst ? 0 : 18,
                  marginBottom: 8,
                  borderBottom: "1px solid #e8dcc0",
                  paddingBottom: 6,
                }}
              >
                {item.text}
              </div>
            );
          }
          return (
            <div
              key={i}
              style={{
                fontSize: 15,
                fontWeight: 400,
                color: "#1a1a2e",
                lineHeight: 1.6,
                marginBottom: 6,
              }}
            >
              <span style={{ marginRight: 8, color: "#b8860b" }}>•</span>
              {item.text}
            </div>
          );
        })}
      </>
    );
  }

  function getTalebContent(t) {
    if (!t) return { main: "", barrier: "", viaNegativa: null, extras: [] };
    if (typeof t === "string") return { main: t, barrier: "", viaNegativa: null, extras: [] };
    const main = t.claim || t.audit || t.analysis || t.summary || t.critique || t.text || "";
    const barrier = t.absorbingBarrier || t.ruinRisk || t.absorbing_barrier || t.barrier || "";
    const viaNegativa = t.viaNegativa || t.via_negativa || t.thingsToAvoid || t.avoid || null;
    const used = new Set(["claim","audit","analysis","summary","critique","text","absorbingBarrier","ruinRisk","absorbing_barrier","barrier","viaNegativa","via_negativa","thingsToAvoid","avoid"]);
    const extras = Object.entries(t).filter(([k, v]) => !used.has(k) && v !== null && v !== undefined && v !== "");
    return { main, barrier, viaNegativa, extras };
  }

  function getThielContent(t) {
    if (!t) return { main: "", secret: "", advantages: null, extras: [] };
    if (typeof t === "string") return { main: t, secret: "", advantages: null, extras: [] };
    const main = t.claim || t.audit || t.analysis || t.summary || t.critique || t.text || "";
    const secret = t.secret || t.zeroToOne || t.monopolyAngle || t.nonConsensus || t.zero_to_one || "";
    const advantages = t.advantages || t.powerLaw || t.power_law || t.moats || null;
    const used = new Set(["claim","audit","analysis","summary","critique","text","secret","zeroToOne","monopolyAngle","nonConsensus","zero_to_one","advantages","powerLaw","power_law","moats"]);
    const extras = Object.entries(t).filter(([k, v]) => !used.has(k) && v !== null && v !== undefined && v !== "");
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
    const used = new Set(["verdict","summary","rationale","why","reasoning","killCriteria","talebFloor","survival","floor","unfairAdvantage","thielCeiling","ceiling","tenX","nextActions","actions","steps"]);
    const extras = Object.entries(s).filter(([k, v]) => !used.has(k) && v !== null && v !== undefined && v !== "");
    return { verdict, rationale, killCriteria, unfairAdvantage, nextActions, extras };
  }

  const taleb = getTalebContent(data?.taleb);
  const thiel = getThielContent(data?.thiel);
  const synthesis = getSynthesisContent(data?.synthesis);

  useEffect(() => {
    if (data && synthesis.killCriteria && !invalidationTrigger) {
      setInvalidationTrigger(renderText(synthesis.killCriteria));
    }
  }, [data]);

  function daysUntil(iso) {
    if (!iso) return 0;
    const then = new Date(iso).getTime();
    const now = Date.now();
    return Math.ceil((then - now) / (1000 * 60 * 60 * 24));
  }

  function fmtDate(iso) {
    if (!iso) return "Unknown";
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch (e) {
      return "Unknown";
    }
  }

  function num(v) {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }

  function saveDecision() {
    if (!emotionalState) return;
    const confidence = num(data?.confidence ?? data?.synthesis?.confidence ?? 70);
    const createdAt = new Date().toISOString();
    const checkInDate = new Date(Date.now() + horizonDays * 86400000).toISOString();
    const entry = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
      createdAt,
      lockedQuestion: idea,
      locked: {
        reasoning: renderText(synthesis.rationale || data?.reasoning || ""),
        talebAudit: renderText(taleb.main || ""),
        thielAudit: renderText(thiel.secret || thiel.main || ""),
        verdict: synthesis.verdict,
        confidence,
        killCriteria: invalidationTrigger,
      },
      emotionalState,
      invalidationTrigger,
      premortem,
      skepticView,
      reversibility,
      horizonDays,
      checkInDate,
      review: null,
    };
    setJournal((j) => [entry, ...j]);
    setSavedId(entry.id);
  }

  function addAddendum(id, text) {
    if (!text.trim()) return;
    setJournal((j) =>
      j.map((e) =>
        e.id === id
          ? { ...e, addenda: [...(e.addenda || []), { at: new Date().toISOString(), text }] }
          : e
      )
    );
  }

  function saveReview(id, review) {
    setJournal((j) => j.map((e) => (e.id === id ? { ...e, review } : e)));
  }

  function deleteDecision(id) {
    setJournal((j) => j.filter((e) => e.id !== id));
  }

  function calcCalibration(entries) {
    const reviewed = entries.filter((e) => e.review && e.review.quality);
    const confident = reviewed.filter((e) => num(e.locked?.confidence) >= 70);
    const goodOutcomes = confident.filter((e) => e.review.quality === "Earned Success" || e.review.quality === "Dumb Luck");
    const hitRate = confident.length ? goodOutcomes.length / confident.length : 0;
    const avgConf = confident.length ? confident.reduce((s, e) => s + num(e.locked?.confidence), 0) / confident.length / 100 : 0;
    const brier = confident.length
      ? confident.reduce((s, e) => {
          const p = num(e.locked?.confidence) / 100;
          const o = e.review.quality === "Earned Success" || e.review.quality === "Dumb Luck" ? 1 : 0;
          return s + Math.pow(p - o, 2);
        }, 0) / confident.length
      : 0;
    let label = "well calibrated";
    if (avgConf - hitRate > 0.15) label = "overconfident";
    else if (hitRate - avgConf > 0.15) label = "underconfident";
    return {
      total: reviewed.length,
      confidentCount: confident.length,
      hitRate,
      avgConf,
      brier,
      label,
      enough: confident.length >= 3,
    };
  }

  function calcProcessQuality(entries) {
    const reviewed = entries.filter((e) => e.review && e.review.quality);
    if (!reviewed.length) return { pct: 0, enough: false };
    const good = reviewed.filter((e) => e.review.quality === "Earned Success" || e.review.quality === "Bad Luck");
    return { pct: Math.round((good.length / reviewed.length) * 100), enough: reviewed.length >= 1 };
  }

  function calcBlindSpots(entries) {
    const out = [];
    if (entries.length < 3) return out;
    const states = {};
    entries.forEach((e) => {
      if (e.emotionalState) states[e.emotionalState] = (states[e.emotionalState] || 0) + 1;
    });
    const topState = Object.entries(states).sort((a, b) => b[1] - a[1])[0];
    if (topState) out.push(`Most frequent emotional state: ${topState[0]} (${topState[1]} decisions).`);

    const reviewed = entries.filter((e) => e.review && e.review.quality);
    if (reviewed.length >= 2) {
      const badStates = {};
      reviewed.forEach((e) => {
        if (e.review.quality === "Predictable Mistake" || e.review.quality === "Dumb Luck") {
          const s = e.emotionalState || "Unknown";
          badStates[s] = (badStates[s] || 0) + 1;
        }
      });
      const worst = Object.entries(badStates).sort((a, b) => b[1] - a[1])[0];
      if (worst) out.push(`State linked to mistakes/dumb luck: ${worst[0]} (${worst[1]}x).`);
    }

    const oneWay = entries.filter((e) => e.reversibility === "One-way door").length;
    if (oneWay / entries.length >= 0.4) out.push(`One-way doors: ${oneWay}/${entries.length} decisions.`);

    const noPremortem = entries.filter((e) => !e.premortem || !e.premortem.trim()).length;
    if (noPremortem / entries.length >= 0.5) out.push(`Empty pre-mortem on ${noPremortem}/${entries.length} decisions.`);

    const cal = calcCalibration(entries);
    if (cal.enough) out.push(`Overconfidence check: avg ${Math.round(cal.avgConf * 100)}% vs ${Math.round(cal.hitRate * 100)}% hit rate.`);

    return out.slice(0, 3);
  }

  function calcOutcomeCounts(entries) {
    const c = { "Earned Success": 0, "Bad Luck": 0, "Dumb Luck": 0, "Predictable Mistake": 0 };
    entries.forEach((e) => {
      if (e.review && e.review.quality && c[e.review.quality] !== undefined) c[e.review.quality]++;
    });
    return c;
  }

  function buildMarkdown(entries) {
    const lines = [];
    lines.push("# Decision Journal");
    lines.push("");
    lines.push(`Exported: ${new Date().toISOString()}`);
    lines.push(`Total decisions: ${entries.length}`);
    lines.push(`Reviewed: ${entries.filter((e) => e.review).length}`);
    lines.push("");
    entries.forEach((e) => {
      lines.push("---");
      lines.push("");
      lines.push(`## ${e.lockedQuestion || "Untitled"}`);
      lines.push("");
      lines.push(`- Date: ${fmtDate(e.createdAt)}`);
      lines.push(`- Emotional State: ${e.emotionalState || "Not recorded"}`);
      lines.push(`- Verdict: ${e.locked?.verdict || "Not recorded"}`);
      lines.push(`- Confidence: ${num(e.locked?.confidence)}%`);
      lines.push(`- Reversibility: ${e.reversibility || "Not recorded"}`);
      lines.push(`- Horizon: ${e.horizonDays} days`);
      lines.push(`- Check-in: ${fmtDate(e.checkInDate)}`);
      lines.push("");
      lines.push(`### Kill Criteria`);
      lines.push(e.invalidationTrigger || "Not recorded");
      lines.push("");
      lines.push(`### Pre-mortem`);
      lines.push(e.premortem || "Not recorded");
      lines.push("");
      lines.push(`### Skeptic View`);
      lines.push(e.skepticView || "Not recorded");
      lines.push("");
      lines.push(`### Thiel 10x Secret`);
      lines.push(e.locked?.thielAudit || "Not recorded");
      lines.push("");
      lines.push(`### Reasoning`);
      lines.push(e.locked?.reasoning || "Not recorded");
      lines.push("");
      lines.push(`### Review`);
      if (e.review) {
        lines.push(`- What happened: ${e.review.whatHappened}`);
        lines.push(`- Kill trigger: ${e.review.killTriggered || "N/A"}`);
        lines.push(`- Quality: ${e.review.quality}`);
        lines.push(`- Lesson: ${e.review.lesson || "None"}`);
        lines.push(`- Reviewed at: ${fmtDate(e.review.reviewedAt)}`);
      } else {
        lines.push("Not yet reviewed.");
      }
      if (e.addenda && e.addenda.length) {
        lines.push("");
        lines.push(`### Addenda`);
        e.addenda.forEach((a) => lines.push(`- ${fmtDate(a.at)}: ${a.text}`));
      }
      lines.push("");
    });
    return lines.join("\n");
  }

  function download(filename, content, type) {
    try {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {}
  }

  function exportMarkdown() {
    download("decision-journal.md", buildMarkdown(journal), "text/markdown");
  }

  function backupJSON() {
    download("prism-journal-backup.json", JSON.stringify(journal, null, 2), "application/json");
  }

  function importJSON(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!Array.isArray(parsed)) throw new Error("not array");
        setJournal((j) => {
          const ids = new Set(j.map((x) => x.id));
          const merged = [...j];
          parsed.forEach((entry) => {
            if (entry && entry.id && !ids.has(entry.id)) {
              merged.push(entry);
              ids.add(entry.id);
            }
          });
          return merged;
        });
        setImportMsg("Imported successfully.");
      } catch (err) {
        setImportMsg("Import failed: invalid file.");
      }
      setTimeout(() => setImportMsg(""), 3000);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  }

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e5e0d5",
    borderRadius: 16,
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
  const bodyStyle = { fontSize: 16, lineHeight: 1.6, color: "#1a1a2e", whiteSpace: "pre-wrap" };
  const subLabelStyle = { fontSize: 13, fontWeight: 600, color: "#5a5142", marginTop: 16, marginBottom: 4 };

  const EMOTIONS = [
    { v: "Calm", e: "😌" },
    { v: "Rushed", e: "⏱️" },
    { v: "Anxious", e: "😰" },
    { v: "FOMO", e: "🚀" },
    { v: "Fatigued", e: "😴" },
  ];
  const RISKY_STATES = ["Rushed", "Anxious", "FOMO", "Fatigued"];
  const REVERSIBILITY = ["Easy to reverse", "Hard to reverse", "One-way door"];
  const QUALITIES = [
    { v: "Earned Success", d: "Good Process + Good Outcome", c: "#e8f0e6", b: "#8fb389" },
    { v: "Bad Luck", d: "Good Process + Bad Outcome", c: "#e6eef5", b: "#89a8c9" },
    { v: "Dumb Luck", d: "Bad Process + Good Outcome", c: "#f5efe0", b: "#c9a86a" },
    { v: "Predictable Mistake", d: "Bad Process + Bad Outcome", c: "#f0e6ef", b: "#b08aab" },
  ];
  const stateColor = (s) => {
    if (s === "Calm") return "#8fb389";
    if (s === "Rushed") return "#c9a86a";
    if (s === "Anxious") return "#b08aab";
    if (s === "FOMO") return "#c98a8a";
    return "#8892a0";
  };

  function Pill({ active, onClick, children, color }) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        style={{
          padding: "6px 14px",
          borderRadius: 999,
          border: active ? `1px solid ${color || "#b8860b"}` : "1px solid #e0dccf",
          background: active ? (color || "#b8860b") + "22" : "#fff",
          color: "#1a1a2e",
          fontSize: 14,
          cursor: "pointer",
          transition: "all 180ms",
        }}
      >
        {children}
      </button>
    );
  }

  function DecisionCard({ entry, onDelete, onSaveReview, onAddAddendum }) {
    const [showReasoning, setShowReasoning] = useState(false);
    const [outcome, setOutcome] = useState("");
    const [killTriggered, setKillTriggered] = useState("");
    const [quality, setQuality] = useState("");
    const [lesson, setLesson] = useState("");
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [addText, setAddText] = useState("");
    const [showAddendum, setShowAddendum] = useState(false);

    const days = daysUntil(entry.checkInDate);
    const ready = days <= 0;
    const reviewed = !!entry.review;

    return (
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 13, color: "#8a7f6a" }}>{fmtDate(entry.createdAt)}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {entry.emotionalState && (
              <span style={{ padding: "2px 10px", borderRadius: 999, background: stateColor(entry.emotionalState) + "33", border: `1px solid ${stateColor(entry.emotionalState)}`, fontSize: 13 }}>
                {EMOTIONS.find((x) => x.v === entry.emotionalState)?.e} {entry.emotionalState}
              </span>
            )}
            {entry.reversibility && (
              <span style={{ padding: "2px 10px", borderRadius: 999, background: "#eef0f4", border: "1px solid #cdd3dd", fontSize: 13 }}>
                {entry.reversibility}
              </span>
            )}
          </div>
        </div>

        <div style={{ fontSize: 18, fontWeight: 600, margin: "12px 0 6px", color: "#1a1a2e" }}>
          {entry.lockedQuestion || "Untitled"}
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <span style={{ color: "#b8860b", fontWeight: 700 }}>{entry.locked?.verdict || "Not recorded"}</span>
          <span style={{ fontSize: 13, color: "#5a5142" }}>Confidence: {num(entry.locked?.confidence)}%</span>
        </div>
        <div style={{ height: 4, background: "#eee", borderRadius: 2, marginBottom: 16, overflow: "hidden" }}>
          <div style={{ width: `${num(entry.locked?.confidence)}%`, height: "100%", background: "#b8860b", transition: "width 200ms" }} />
        </div>

        <div style={{ fontSize: 13, color: "#8a7f6a", marginBottom: 12 }}>
          🔒 Locked on {fmtDate(entry.createdAt)}
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={subLabelStyle}>Kill Criteria</div>
          <div>{entry.invalidationTrigger || "Not recorded"}</div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={subLabelStyle}>Thiel 10x Secret</div>
          <div>{entry.locked?.thielAudit || "Not recorded"}</div>
        </div>

        <button
          type="button"
          onClick={() => setShowReasoning((v) => !v)}
          style={{ background: "none", border: "none", color: "#5a5142", cursor: "pointer", padding: 0, fontSize: 14, textDecoration: "underline" }}
        >
          {showReasoning ? "Hide original reasoning" : "Show original reasoning"}
        </button>
        {showReasoning && (
          <div style={{ marginTop: 8, padding: 12, background: "#faf8f3", borderRadius: 8, fontSize: 14, whiteSpace: "pre-wrap" }}>
            {entry.locked?.reasoning || "Not recorded"}
          </div>
        )}

        {entry.premortem && (
          <div style={{ marginTop: 10 }}>
            <div style={subLabelStyle}>Pre-mortem</div>
            <div>{entry.premortem}</div>
          </div>
        )}
        {entry.skepticView && (
          <div style={{ marginTop: 10 }}>
            <div style={subLabelStyle}>Skeptic View</div>
            <div>{entry.skepticView}</div>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <span style={{ padding: "3px 12px", borderRadius: 999, fontSize: 13, background: reviewed ? "#e8f0e6" : ready ? "#f5efe0" : "#eef0f4", border: "1px solid #dcd6c4" }}>
            {reviewed ? "Reviewed ✓" : ready ? "Ready for Review" : `Due in ${days} days`}
          </span>
          {!reviewed && ready && <span style={{ marginLeft: 10, fontSize: 12, color: "#8a7f6a" }}>Reviewing early is allowed.</span>}
        </div>

        {!reviewed && (
          <div style={{ marginTop: 16, padding: 16, background: "#faf8f3", borderRadius: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Outcome Review</div>
            <textarea
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="What actually happened in reality?"
              aria-label="What actually happened"
              style={{ width: "100%", minHeight: 80, padding: 10, borderRadius: 8, border: "1px solid #e0dccf", fontSize: 15, outline: "none" }}
            />
            <div style={{ marginTop: 10, marginBottom: 6, fontSize: 13, color: "#5a5142" }}>Did any kill criteria trigger?</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Yes", "No", "Partly"].map((v) => (
                <Pill key={v} active={killTriggered === v} onClick={() => setKillTriggered(v)}>{v}</Pill>
              ))}
            </div>
            <div style={{ marginTop: 12, marginBottom: 6, fontSize: 13, color: "#5a5142" }}>Decision Quality</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
              {QUALITIES.map((q) => (
                <button
                  key={q.v}
                  type="button"
                  onClick={() => setQuality(q.v)}
                  aria-pressed={quality === q.v}
                  style={{
                    textAlign: "left",
                    padding: 12,
                    borderRadius: 10,
                    background: quality === q.v ? q.c : "#fff",
                    border: `1px solid ${quality === q.v ? q.b : "#e0dccf"}`,
                    cursor: "pointer",
                    transition: "all 180ms",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{q.v}</div>
                  <div style={{ fontSize: 12, color: "#5a5142" }}>{q.d}</div>
                </button>
              ))}
            </div>
            <input
              value={lesson}
              onChange={(e) => setLesson(e.target.value)}
              placeholder="Lesson I will carry forward (optional)"
              aria-label="Lesson"
              style={{ width: "100%", marginTop: 12, padding: 10, borderRadius: 8, border: "1px solid #e0dccf", fontSize: 15, outline: "none" }}
            />
            <button
              type="button"
              disabled={!outcome.trim() || !quality}
              onClick={() => {
                onSaveReview({ whatHappened: outcome, killTriggered, quality, lesson, reviewedAt: new Date().toISOString() });
              }}
              style={{
                marginTop: 12,
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: !outcome.trim() || !quality ? "#c9b98a" : "#b8860b",
                color: "#fff",
                fontWeight: 600,
                cursor: !outcome.trim() || !quality ? "not-allowed" : "pointer",
              }}
            >
              Save Outcome Review
            </button>
          </div>
        )}

        {reviewed && (
          <div style={{ marginTop: 16, padding: 16, background: "#faf8f3", borderRadius: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Review ({fmtDate(entry.review.reviewedAt)})</div>
            <div style={{ marginBottom: 6 }}><strong>What happened:</strong> {entry.review.whatHappened}</div>
            <div style={{ marginBottom: 6 }}><strong>Kill triggered:</strong> {entry.review.killTriggered || "N/A"}</div>
            <div style={{ marginBottom: 6 }}><strong>Quality:</strong> {entry.review.quality}</div>
            {entry.review.lesson && <div><strong>Lesson:</strong> {entry.review.lesson}</div>}
            {entry.addenda && entry.addenda.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={subLabelStyle}>Addenda</div>
                {entry.addenda.map((a, i) => (
                  <div key={i} style={{ fontSize: 14, marginBottom: 4 }}>— {fmtDate(a.at)}: {a.text}</div>
                ))}
              </div>
            )}
            {showAddendum ? (
              <div style={{ marginTop: 10 }}>
                <textarea
                  value={addText}
                  onChange={(e) => setAddText(e.target.value)}
                  placeholder="Add a dated note..."
                  aria-label="Addendum"
                  style={{ width: "100%", minHeight: 60, padding: 10, borderRadius: 8, border: "1px solid #e0dccf", fontSize: 14, outline: "none" }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => { onAddAddendum(addText); setAddText(""); setShowAddendum(false); }}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#b8860b", color: "#fff", cursor: "pointer" }}
                  >
                    Save Note
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddendum(false)}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e0dccf", background: "#fff", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddendum(true)}
                style={{ marginTop: 10, background: "none", border: "none", color: "#5a5142", cursor: "pointer", textDecoration: "underline", padding: 0, fontSize: 14 }}
              >
                Add addendum
              </button>
            )}
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          {confirmDelete ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, color: "#5a5142" }}>Are you sure? This cannot be undone.</span>
              <button type="button" onClick={() => onDelete()} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#b08aab", color: "#fff", cursor: "pointer" }}>Delete</button>
              <button type="button" onClick={() => setConfirmDelete(false)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e0dccf", background: "#fff", cursor: "pointer" }}>Cancel</button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} style={{ background: "none", border: "none", color: "#8a7f6a", cursor: "pointer", textDecoration: "underline", padding: 0, fontSize: 14 }}>
              Delete decision
            </button>
          )}
        </div>
      </div>
    );
  }

  const cal = calcCalibration(journal);
  const pq = calcProcessQuality(journal);
  const blinds = calcBlindSpots(journal);
  const counts = calcOutcomeCounts(journal);
  const reviewedCount = journal.filter((e) => e.review).length;

  return (
    <main style={{ minHeight: "100vh", background: "#f0f2f5", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', padding: "40px 20px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <PrismLogo />
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1a1a2e", margin: 0 }}>
              Prism <span style={{ color: "#b8860b" }}>Barbell</span>
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setView(view === "analysis" ? "journal" : "analysis")}
            style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #e0dccf", background: "#fff", cursor: "pointer", fontWeight: 600, color: "#1a1a2e" }}
          >
            {view === "analysis" ? `📓 Decision Journal (${journal.length})` : "← Back to Analysis"}
          </button>
        </div>

        {view === "analysis" && (
          <>
            <p style={{ color: "#8a7f6a", marginBottom: 24, fontSize: 15 }}>
              Run any idea through the Taleb, Thiel, and Barbell Synthesis filters.
            </p>

            <div style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
              <input
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && decide()}
                placeholder="Describe your idea, decision, or bet..."
                aria-label="Idea"
                style={{ flex: 1, minWidth: 240, padding: "14px 18px", fontSize: 16, border: "1px solid #e5e0d5", borderRadius: 10, background: "#fff", outline: "none", color: "#1a1a2e" }}
              />
              <button
                onClick={decide}
                disabled={loading}
                style={{ padding: "14px 28px", fontSize: 16, fontWeight: 600, color: "#fff", background: loading ? "#c9b98a" : "#b8860b", border: "none", borderRadius: 10, cursor: loading ? "not-allowed" : "pointer" }}
              >
                {loading ? "Scanning live market data..." : "Decide"}
              </button>
            </div>

            {error && <div style={{ color: "#b00020", marginBottom: 24 }}>{error}</div>}

            {data && (
              <div style={{ marginBottom: 20 }}>
                {grounding?.summary ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setGroundingOpen((v) => !v)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#b8860b",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                        padding: 0,
                        marginBottom: 10,
                      }}
                    >
                      {groundingOpen ? "▾" : "▸"} ✓ Grounded with real-time market data
                    </button>
                    {groundingOpen && (
                      <div style={cardStyle}>
                        <div>{renderGroundingText(grounding?.summary)}</div>
                        {grounding?.sources && grounding.sources.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                            {grounding.sources.map((s, i) => {
                              const title = s?.title || s?.uri || "";
                              const short = title.length > 40 ? title.slice(0, 40) + "…" : title;
                              return (
                                <a
                                  key={i}
                                  href={s?.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    padding: "6px 14px",
                                    borderRadius: 999,
                                    border: "1px solid #e0dccf",
                                    background: "#fff",
                                    color: "#1a1a2e",
                                    fontSize: 13,
                                    textDecoration: "none",
                                  }}
                                >
                                  {short}
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ color: "#8a7f6a", fontSize: 13 }}>Ungrounded: live data unavailable</div>
                )}
              </div>
            )}

            {data && (
              <>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 20 }}>
                  <div style={cardStyle}>
                    <div style={labelStyle}>Taleb — Antifragility Audit</div>
                    <div style={bodyStyle}>
                      {taleb.main && <p style={{ margin: 0 }}>{renderText(taleb.main)}</p>}
                      {taleb.barrier && (
                        <>
                          <div style={subLabelStyle}>Absorbing Barrier / Ruin Risk</div>
                          <p style={{ margin: 0 }}>{renderText(taleb.barrier)}</p>
                        </>
                      )}
                      {taleb.viaNegativa && (
                        <>
                          <div style={subLabelStyle}>Via Negativa — Things to Avoid</div>
                          {renderBullets(taleb.viaNegativa)}
                        </>
                      )}
                      {taleb.extras.length > 0 && taleb.extras.map(([k, v]) => (
                        <div key={k}>
                          <div style={subLabelStyle}>{k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}</div>
                          {renderBullets(v)}
                        </div>
                      ))}
                      {!taleb.main && !taleb.barrier && !taleb.viaNegativa && taleb.extras.length === 0 && (
                        <p style={{ margin: 0, color: "#8a7f6a" }}>{renderText(data.taleb) || "—"}</p>
                      )}
                    </div>
                  </div>

                  <div style={cardStyle}>
                    <div style={labelStyle}>Thiel — Monopoly & Secrets</div>
                    <div style={bodyStyle}>
                      {thiel.main && <p style={{ margin: 0 }}>{renderText(thiel.main)}</p>}
                      {thiel.secret && (
                        <>
                          <div style={subLabelStyle}>0 to 1 / Non-consensus Secret</div>
                          <p style={{ margin: 0 }}>{renderText(thiel.secret)}</p>
                        </>
                      )}
                      {thiel.advantages && (
                        <>
                          <div style={subLabelStyle}>Advantages / Power Law</div>
                          {renderBullets(thiel.advantages)}
                        </>
                      )}
                      {thiel.extras.length > 0 && thiel.extras.map(([k, v]) => (
                        <div key={k}>
                          <div style={subLabelStyle}>{k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}</div>
                          {renderBullets(v)}
                        </div>
                      ))}
                      {!thiel.main && !thiel.secret && !thiel.advantages && thiel.extras.length === 0 && (
                        <p style={{ margin: 0, color: "#8a7f6a" }}>{renderText(data.thiel) || "—"}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ background: "#fffdf5", border: "1px solid #e8dcc0", borderRadius: 16, padding: "32px 36px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div style={labelStyle}>Barbell Synthesis</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#b8860b", marginBottom: 20 }}>{synthesis.verdict}</div>
                  <div style={bodyStyle}>
                    {synthesis.rationale && (
                      <>
                        <div style={subLabelStyle}>Main Rationale</div>
                        <p style={{ margin: 0 }}>{renderText(synthesis.rationale)}</p>
                      </>
                    )}
                    {synthesis.killCriteria && (
                      <>
                        <div style={subLabelStyle}>Taleb Floor — Survival / Kill Criteria</div>
                        <p style={{ margin: 0 }}>{renderText(synthesis.killCriteria)}</p>
                      </>
                    )}
                    {synthesis.unfairAdvantage && (
                      <>
                        <div style={subLabelStyle}>Thiel Ceiling — Unfair Advantage / 10x</div>
                        <p style={{ margin: 0 }}>{renderText(synthesis.unfairAdvantage)}</p>
                      </>
                    )}
                    {synthesis.nextActions && (Array.isArray(synthesis.nextActions) ? synthesis.nextActions.length > 0 : true) && (
                      <>
                        <div style={subLabelStyle}>Immediate Actions</div>
                        {renderNumbered(synthesis.nextActions)}
                      </>
                    )}
                    {synthesis.extras.length > 0 && synthesis.extras.map(([k, v]) => (
                      <div key={k}>
                        <div style={subLabelStyle}>{k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}</div>
                        {renderBullets(v)}
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 28, borderTop: "1px solid #e8dcc0", paddingTop: 20 }}>
                    <button
                      type="button"
                      onClick={() => setSaveOpen((v) => !v)}
                      style={{ background: "none", border: "none", color: "#5a5142", cursor: "pointer", fontSize: 16, fontWeight: 600, padding: 0 }}
                    >
                      {saveOpen ? "▾" : "▸"} Save to Decision Journal
                    </button>

                    {saveOpen && (
                      <div style={{ marginTop: 16 }}>
                        {savedId ? (
                          <div style={{ padding: 16, background: "#e8f0e6", borderRadius: 10, color: "#3c5a3a", fontWeight: 600 }}>
                            Saved ✓
                          </div>
                        ) : (
                          <>
                            <div style={{ marginBottom: 6, fontSize: 13, color: "#5a5142" }}>Emotional State (required)</div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                              {EMOTIONS.map((em) => (
                                <Pill key={em.v} active={emotionalState === em.v} onClick={() => setEmotionalState(em.v)} color={stateColor(em.v)}>
                                  {em.e} {em.v}
                                </Pill>
                              ))}
                            </div>
                            {RISKY_STATES.includes(emotionalState) && (
                              <div style={{ padding: 10, background: "#f5efe0", borderRadius: 8, marginBottom: 12, fontSize: 14, color: "#7a6338" }}>
                                Your state may bias this decision. Consider sleeping on it.
                              </div>
                            )}

                            <div style={{ marginBottom: 6, fontSize: 13, color: "#5a5142" }}>What would prove me wrong? (Kill Criteria)</div>
                            <textarea
                              value={invalidationTrigger}
                              onChange={(e) => setInvalidationTrigger(e.target.value)}
                              aria-label="Kill criteria"
                              style={{ width: "100%", minHeight: 70, padding: 10, borderRadius: 8, border: "1px solid #e0dccf", fontSize: 15, outline: "none", marginBottom: 12 }}
                            />

                            <div style={{ marginBottom: 6, fontSize: 13, color: "#5a5142" }}>Check-in Horizon</div>
                            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                              {[30, 60, 90].map((d) => (
                                <Pill key={d} active={horizonDays === d} onClick={() => setHorizonDays(d)}>{d} days</Pill>
                              ))}
                            </div>

                            <input
                              value={premortem}
                              onChange={(e) => setPremortem(e.target.value)}
                              placeholder="Pre-mortem: if this fails in 6 months, the most likely reason is..."
                              aria-label="Pre-mortem"
                              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e0dccf", fontSize: 15, outline: "none", marginBottom: 10 }}
                            />
                            <input
                              value={skepticView}
                              onChange={(e) => setSkepticView(e.target.value)}
                              placeholder="What would a smart skeptic say?"
                              aria-label="Skeptic view"
                              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e0dccf", fontSize: 15, outline: "none", marginBottom: 10 }}
                            />
                            <div style={{ marginBottom: 6, fontSize: 13, color: "#5a5142" }}>Reversibility</div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                              {REVERSIBILITY.map((r) => (
                                <Pill key={r} active={reversibility === r} onClick={() => setReversibility(r)}>{r}</Pill>
                              ))}
                            </div>

                            <button
                              type="button"
                              disabled={!emotionalState}
                              onClick={saveDecision}
                              style={{
                                padding: "12px 22px",
                                borderRadius: 10,
                                border: "none",
                                background: !emotionalState ? "#c9b98a" : "#b8860b",
                                color: "#fff",
                                fontWeight: 600,
                                cursor: !emotionalState ? "not-allowed" : "pointer",
                              }}
                            >
                              Lock & Save Decision
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {view === "journal" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, color: "#1a1a2e" }}>📓 Decision Journal & Calibration Lab</h2>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" onClick={() => setView("analysis")} style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid #e0dccf", background: "#fff", cursor: "pointer" }}>← Back to Analysis</button>
                <button type="button" onClick={exportMarkdown} style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid #e0dccf", background: "#fff", cursor: "pointer" }}>↓ Export Journal (Markdown)</button>
                <button type="button" onClick={backupJSON} style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid #e0dccf", background: "#fff", cursor: "pointer" }}>↓ Backup (JSON)</button>
                <button type="button" onClick={() => fileInputRef.current?.click()} style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid #e0dccf", background: "#fff", cursor: "pointer" }}>↑ Import (JSON)</button>
                <input ref={fileInputRef} type="file" accept="application/json" onChange={importJSON} style={{ display: "none" }} />
              </div>
            </div>
            {importMsg && <div style={{ marginBottom: 16, padding: 10, background: "#e8f0e6", borderRadius: 8 }}>{importMsg}</div>}

            {journal.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: "center", padding: 40 }}>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>Your memory is not a reliable narrator.</div>
                <p style={{ color: "#5a5142", maxWidth: 520, margin: "0 auto 20px" }}>
                  Hindsight bias rewrites the past so you look smarter than you were. Journaling locks in what you actually knew and decided — before the outcome was known.
                </p>
                <button type="button" onClick={() => setView("analysis")} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#b8860b", color: "#fff", cursor: "pointer", fontWeight: 600 }}>Go to Analysis</button>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
                  <div style={cardStyle}>
                    <div style={labelStyle}>Total Decisions</div>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>{journal.length}</div>
                    <div style={{ fontSize: 13, color: "#8a7f6a" }}>{reviewedCount} reviewed · {journal.length - reviewedCount} pending</div>
                  </div>
                  <div style={cardStyle}>
                    <div style={labelStyle}>Calibration Accuracy</div>
                    {cal.enough ? (
                      <>
                        <div style={{ fontSize: 28, fontWeight: 700 }}>{Math.round(cal.hitRate * 100)}%</div>
                        <div style={{ fontSize: 13, color: "#8a7f6a" }}>Brier: {cal.brier.toFixed(2)}</div>
                        <div style={{ fontSize: 13, color: "#5a5142", marginTop: 6 }}>
                          You are <strong>{cal.label}</strong>.
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 14, color: "#8a7f6a" }}>Not enough reviewed decisions yet.</div>
                    )}
                  </div>
                  <div style={cardStyle}>
                    <div style={labelStyle}>Process Quality</div>
                    {pq.enough ? (
                      <>
                        <div style={{ fontSize: 28, fontWeight: 700 }}>{pq.pct}%</div>
                        <div style={{ fontSize: 13, color: "#5a5142", marginTop: 6 }}>Judge yourself on process, not results.</div>
                      </>
                    ) : (
                      <div style={{ fontSize: 14, color: "#8a7f6a" }}>No reviewed decisions yet.</div>
                    )}
                  </div>
                  {journal.length >= 3 && (
                    <div style={cardStyle}>
                      <div style={labelStyle}>Recurring Blind Spots</div>
                      {blinds.length === 0 ? (
                        <div style={{ fontSize: 14, color: "#8a7f6a" }}>No clear patterns yet.</div>
                      ) : (
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {blinds.map((b, i) => <li key={i} style={{ marginBottom: 6, fontSize: 14 }}>{b}</li>)}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
                  {QUALITIES.map((q) => (
                    <div key={q.v} style={{ ...cardStyle, padding: 16, background: q.c, border: `1px solid ${q.b}` }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#5a5142" }}>{q.v}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e" }}>{counts[q.v]}</div>
                    </div>
                  ))}
                </div>

                {journal.map((entry) => (
                  <DecisionCard
                    key={entry.id}
                    entry={entry}
                    onDelete={() => deleteDecision(entry.id)}
                    onSaveReview={(review) => saveReview(entry.id, review)}
                    onAddAddendum={(text) => addAddendum(entry.id, text)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
