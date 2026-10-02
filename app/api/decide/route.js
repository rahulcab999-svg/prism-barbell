import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-120b';
const GEMINI_MODEL = 'gemini-2.5-flash';

const PLAIN_ENGLISH =
  'PLAIN-ENGLISH RULE: Write for a smart non-specialist. The FIRST time a technical or conceptual term ' +
  '(e.g. "absorbing barrier", "via negativa", "ergodicity", "0 to 1", "power law", "monopoly") ' +
  'appears in your answer, explain it immediately in everyday words in the same sentence or the next one. ' +
  'After that first explanation, use the term alone. Never repeat the definition inside later bullets, ' +
  'actions or recommendations, and never append "- <term> means ..." or similar explanations to list items.';

const NO_MARKDOWN = 'Write plain text only. No asterisks, no bold, no markdown, no backticks.';

function stripFences(text) {
  if (!text) return '';
  return String(text)
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim();
}

function extractJson(text) {
  const cleaned = stripFences(text);
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      try {
        return JSON.parse(cleaned.slice(first, last + 1));
      } catch (_) {
        return null;
      }
    }
    return null;
  }
}

async function runGrounding(question) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { summary: '', sources: [] };

  let timer = null;
  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt =
      'Search the web for real, current facts relevant to this decision:\n\n' +
      '"' + question + '"\n\n' +
      'Return EXACTLY this structure, with no intro sentence and no closing sentence:\n' +
      '## Competitors and alternatives\n' +
      '- bullet\n' +
      '- bullet\n' +
      '## Base rates\n' +
      '- bullet\n' +
      '## Industry traps\n' +
      '- bullet\n\n' +
      'Rules: each bullet is one short plain sentence. No bold, no asterisks, no nested bullets, ' +
      'no "(a)/(b)/(c)" labels, no markdown other than the "## " heading lines and "- " bullets. ' +
      'Max about 250 words. ' +
      'Say "no reliable data found" when you cannot verify something. Never invent numbers.';

    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Grounding timeout')), 35000);
    });

    let response;
    try {
      response = await Promise.race([
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
            temperature: 0.2
          }
        }),
        timeoutPromise
      ]);
    } finally {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }

    const text =
      (response && response.text) ||
      (response &&
        response.candidates &&
        response.candidates[0] &&
        response.candidates[0].content &&
        response.candidates[0].content.parts &&
        response.candidates[0].content.parts.map((p) => p.text || '').join('')) ||
      '';

    const summary = text ? String(text).trim() : '';
    if (!summary) return { summary: '', sources: [] };

    let sources = [];
    try {
      const chunks =
        response &&
        response.candidates &&
        response.candidates[0] &&
        response.candidates[0].groundingMetadata &&
        response.candidates[0].groundingMetadata.groundingChunks;

      if (Array.isArray(chunks)) {
        const seen = new Set();
        const out = [];
        for (const chunk of chunks) {
          if (out.length >= 6) break;
          if (!chunk || !chunk.web) continue;
          const uri = chunk.web.uri;
          if (!uri) continue;
          if (seen.has(uri)) continue;
          seen.add(uri);
          let title = chunk.web.title;
          if (!title) {
            try {
              title = new URL(uri).hostname;
            } catch (_) {
              title = uri;
            }
          }
          out.push({ title, uri });
        }
        sources = out;
      }
    } catch (_) {
      sources = [];
    }

    return { summary, sources };
  } catch (_) {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    return { summary: '', sources: [] };
  }
}

async function runTaleb(question, briefing) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set.');

  const system =
    'You are Nassim Nicholas Taleb — the Downside, Fragility & Ruin Auditor. ' +
    'You hunt for absorbing barriers, ruin risk, and path dependence, and you prescribe ' +
    'Via Negativa (removing things rather than adding). ' +
    PLAIN_ENGLISH + ' ' +
    NO_MARKDOWN + ' ' +
    'Return ONLY a valid JSON object, no markdown fences, matching this schema: ' +
    '{ "claim": "string", "absorbingBarrier": "string", "viaNegativa": ["string"], "recommendation": "string" }';

  let user =
    'Audit this decision strictly for downside and ruin risk:\n\n' +
    '"' + question + '"\n\n' +
    'Identify the absorbing barrier (the point of no return where you are wiped out and cannot recover), ' +
    'the ruin risk, path dependence, and produce a concrete Via Negativa list of what to STOP or eliminate. ' +
    'Give a final recommendation focused on survival first. ' +
    'The \'claim\' field must be one sentence stating your actual finding. Do not restate or paraphrase the question.';

  if (briefing && briefing.trim()) {
    user +=
      '\n\nLIVE MARKET BRIEFING:\n' + briefing + '\n\n' +
      'Use the real base rates and failure traps above to define the absorbing barrier and the ruin risk. ' +
      'Use names and numbers ONLY if they appear in the briefing. ' +
      'If a number is not in the briefing, do not state any number. Describe it in words instead ' +
      '(for example "a large upfront cost"). ' +
      'Never write "(not in briefing)" after a figure. If something important is unknown, ' +
      'you may say "Verify this locally." at most once per field, and only as the LAST sentence ' +
      'of that field, never at the start. Do not use it in nextActions.';
  }

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.6,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Groq Taleb brain failed (${res.status}): ${errText.slice(0, 300)}`);
  }

  const payload = await res.json();
  const content =
    payload &&
    payload.choices &&
    payload.choices[0] &&
    payload.choices[0].message &&
    payload.choices[0].message.content;

  const parsed = extractJson(content);
  if (!parsed) throw new Error('Taleb brain returned non-JSON content.');

  return {
    claim: parsed.claim || '',
    absorbingBarrier: parsed.absorbingBarrier || '',
    viaNegativa: Array.isArray(parsed.viaNegativa) ? parsed.viaNegativa.filter(Boolean) : [],
    recommendation: parsed.recommendation || ''
  };
}

async function runThiel(question, briefing) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');

  const ai = new GoogleGenAI({ apiKey });

  const system =
    'You are Peter Thiel — the Upside, Asymmetry & Monopoly Auditor. ' +
    'You challenge incremental thinking, hunt for the non-consensus secret, test 0-to-1 ' +
    'monopoly differentiation, and evaluate power-law leverage. ' +
    PLAIN_ENGLISH + ' ' +
    NO_MARKDOWN + ' ' +
    'Return ONLY a valid JSON object, no markdown fences, matching this schema: ' +
    '{ "claim": "string", "secret": "string", "monopolyAngle": "string", "recommendation": "string" }';

  let user =
    'Audit this decision for upside, asymmetry, and monopoly potential:\n\n' +
    '"' + question + '"\n\n' +
    'Challenge any incremental 1-to-N thinking. Identify the non-consensus secret (what important ' +
    'truth do few people agree with you on?), the 0-to-1 monopoly differentiation, and the power-law ' +
    'leverage that could create a 10x breakthrough. Give a final recommendation aimed at asymmetric upside. ' +
    'The \'claim\' field must be one sentence stating your actual finding. Do not restate or paraphrase the question.';

  if (briefing && briefing.trim()) {
    user +=
      '\n\nLIVE MARKET BRIEFING:\n' + briefing + '\n\n' +
      'Evaluate the named competitors above and demand a genuine 0-to-1 differentiator, ' +
      'rejecting any incremental copycat. ' +
      'Use names and numbers ONLY if they appear in the briefing. ' +
      'If a number is not in the briefing, do not state any number. Describe it in words instead ' +
      '(for example "a large upfront cost"). ' +
      'Never write "(not in briefing)" after a figure. If something important is unknown, ' +
      'you may say "Verify this locally." at most once per field, and only as the LAST sentence ' +
      'of that field, never at the start. Do not use it in nextActions.';
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: user,
    config: {
      systemInstruction: system,
      temperature: 0.7,
      responseMimeType: 'application/json'
    }
  });

  const text =
    (response && response.text) ||
    (response &&
      response.candidates &&
      response.candidates[0] &&
      response.candidates[0].content &&
      response.candidates[0].content.parts &&
      response.candidates[0].content.parts.map((p) => p.text || '').join('')) ||
    '';

  const parsed = extractJson(text);
  if (!parsed) throw new Error('Thiel brain returned non-JSON content.');

  return {
    claim: parsed.claim || '',
    secret: parsed.secret || '',
    monopolyAngle: parsed.monopolyAngle || '',
    recommendation: parsed.recommendation || ''
  };
}

async function runSynthesis(question, taleb, thiel, briefing) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');

  const ai = new GoogleGenAI({ apiKey });

  const system =
    'You are the Barbell Synthesis engine. You combine a Taleb downside audit and a Thiel ' +
    'upside audit into one final verdict. The barbell = extreme safety on the downside + ' +
    'extreme asymmetry on the upside. ' +
    PLAIN_ENGLISH + ' ' +
    NO_MARKDOWN + ' ' +
    'Return ONLY a valid JSON object matching this schema: ' +
    '{ "verdict": "Proceed | Pivot | Abort", "confidence": 0, "killCriteria": "string", ' +
    '"unfairAdvantage": "string", "nextActions": ["string", "string", "string"] }';

  let user =
    'DECISION:\n"' + question + '"\n\n' +
    'TALEB DOWNSIDE AUDIT:\n' + JSON.stringify(taleb) + '\n\n' +
    'THIEL UPSIDE AUDIT:\n' + JSON.stringify(thiel) + '\n\n';

  if (briefing && briefing.trim()) {
    user += 'LIVE MARKET BRIEFING:\n' + briefing + '\n\n' +
      'Keep the verdict consistent with the real facts above. ' +
      'Use names and numbers ONLY if they appear in the briefing. ' +
      'If a number is not in the briefing, do not state any number. Describe it in words instead ' +
      '(for example "a large upfront cost"). ' +
      'Never write "(not in briefing)" after a figure. If something important is unknown, ' +
      'you may say "Verify this locally." at most once per field, and only as the LAST sentence ' +
      'of that field, never at the start. Do not use it in nextActions.\n\n';
  }

  user +=
    'Synthesize these into a Barbell Synthesis.\n' +
    'Compute the confidence score MECHANICALLY (not vibes): start at 50, ' +
    'add up to +25 for upside asymmetry, add up to +15 for a clear non-consensus secret, ' +
    'subtract up to -40 for absorbing-barrier / ruin proximity, then clamp to 0-100.\n' +
    'Provide: verdict (Proceed / Pivot / Abort), confidence (integer 0-100), ' +
    'killCriteria (2 to 3 concrete, checkable triggers: what to observe and when to stop. ' +
    'Numbers, percentages AND time periods (months, weeks) are allowed ONLY if they come from the briefing. ' +
    'Otherwise write "set your own deadline before starting" or "set your own limit: [what to measure]"), ' +
    'unfairAdvantage (Thiel Ceiling — the durable edge and 10x breakthrough), ' +
    'and exactly 3 immediate next actions.';

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: user,
    config: {
      systemInstruction: system,
      temperature: 0.5,
      responseMimeType: 'application/json'
    }
  });

  const text =
    (response && response.text) ||
    (response &&
      response.candidates &&
      response.candidates[0] &&
      response.candidates[0].content &&
      response.candidates[0].content.parts &&
      response.candidates[0].content.parts.map((p) => p.text || '').join('')) ||
    '';

  const parsed = extractJson(text);
  if (!parsed) throw new Error('Synthesis brain returned non-JSON content.');

  let confidence = Number(parsed.confidence);
  if (!Number.isFinite(confidence)) confidence = 50;
  confidence = Math.max(0, Math.min(100, Math.round(confidence)));

  const actions = Array.isArray(parsed.nextActions)
    ? parsed.nextActions.filter(Boolean).slice(0, 3)
    : [];

  return {
    verdict: parsed.verdict || 'Pivot',
    confidence,
    killCriteria: parsed.killCriteria || '',
    unfairAdvantage: parsed.unfairAdvantage || '',
    nextActions: actions
  };
}

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body.' },
        { status: 400 }
      );
    }

    const question =
      body && typeof (body.idea || body.question) === 'string'
        ? (body.idea || body.question).trim()
        : '';

    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: question or idea.' },
        { status: 400 }
      );
    }

    const grounding = await runGrounding(question);
    const briefing = grounding && grounding.summary ? grounding.summary : '';

    const [talebResult, thielResult] = await Promise.all([
      runTaleb(question, briefing),
      runThiel(question, briefing)
    ]);

    const synthesis = await runSynthesis(question, talebResult, thielResult, briefing);

    return NextResponse.json(
      {
        success: true,
        data: {
          taleb: talebResult,
          thiel: thielResult,
          synthesis,
          grounding: {
            summary: grounding && grounding.summary ? grounding.summary : '',
            sources: grounding && Array.isArray(grounding.sources) ? grounding.sources : []
          }
        }
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error && error.message ? error.message : 'Unknown error in dual-brain pipeline.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}
