import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-120b';
const GEMINI_MAIN_MODEL = 'gemini-2.5-flash';
const GEMINI_LITE_MODEL = 'gemini-3.5-flash-lite';

const PLAIN_ENGLISH =
  'PLAIN-ENGLISH RULE: Write for a smart non-specialist. The FIRST time a technical or conceptual term ' +
  '(e.g. "absorbing barrier", "via negativa", "ergodicity", "0 to 1", "power law", "monopoly") ' +
  'appears in your answer, explain it immediately in everyday words in the same sentence or the next one. ' +
  'After that first explanation, use the term alone. Never repeat the definition inside later bullets, ' +
  'actions or recommendations, and never append "- <term> means ..." or similar explanations to list items.';

const NO_MARKDOWN = 'Write plain text only. No asterisks, no bold, no markdown, no backticks.';

const USER_FACTS_RULE =
  'First read the question for facts the user states about their situation (for example: owns the land, budget, city, floors, timeline). ' +
  'Treat them as true. ' +
  'Do not count a cost the user says they already cover (for example land they own: mention it at most once as an opportunity cost, never as upfront cash). ' +
  'Never recommend anything that contradicts them (for example renting space when they own the land). ' +
  'Do not mix up costs and income. Monthly expenses are costs, never cash flow, revenue or profit. ' +
  'Call something income or revenue only if the briefing says so.';

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

async function callGeminiWithFallback({ models, build }) {
  let lastError = null;
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const result = await build(model);
      return { result, model };
    } catch (error) {
      lastError = error;
      const msg = error && error.message ? String(error.message) : '';
      const is429 =
        msg.includes('429') ||
        /RESOURCE_EXHAUSTED/i.test(msg) ||
        /quota/i.test(msg) ||
        /rate limit/i.test(msg);
      const is503 = msg.includes('503');
      const is404 = msg.includes('404') || /no longer available/i.test(msg);
      if (is429 || is503 || is404) {
        console.error('[fallback]', model, is429 ? '429' : is503 ? '503' : '404');
        if (is503) {
          await new Promise((r) => setTimeout(r, 1000));
        }
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error('All providers failed.');
}

async function callGroqText(user, system, temperature) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set.');
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    })
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Groq failed (${res.status}): ${errText.slice(0, 300)}`);
  }
  const payload = await res.json();
  return (
    (payload &&
      payload.choices &&
      payload.choices[0] &&
      payload.choices[0].message &&
      payload.choices[0].message.content) ||
    ''
  );
}

async function runGrounding(question) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { summary: '', sources: [], reason: 'GEMINI_API_KEY is not set.', model: 'none' };
  }

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
      'Say "no reliable data found" when you cannot verify something. Never invent numbers. ' +
      'Every bullet must be directly about the kind of business or decision in the question, ' +
      'in the same country or region level. Skip statistics about unrelated platforms, products or industries. ' +
      'If no relevant figure exists, write "no reliable data found". ' +
      'Skip costs the question says the user already has (for example land prices when they own the land). ' +
      'Every bullet must be directly about the kind of business in the question and the same city or region.';

    const { result: response, model } = await callGeminiWithFallback({
      models: [GEMINI_MAIN_MODEL, GEMINI_LITE_MODEL],
      build: async (modelName) => {
        let localTimer = null;
        const timeoutPromise = new Promise((_, reject) => {
          localTimer = setTimeout(() => reject(new Error('Grounding timeout')), 35000);
        });
        try {
          return await Promise.race([
            ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.2
              }
            }),
            timeoutPromise
          ]);
        } finally {
          if (localTimer) clearTimeout(localTimer);
        }
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

    const summary = text ? String(text).trim() : '';
    if (!summary) {
      return { summary: '', sources: [], reason: 'Empty grounding output.', model };
    }

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
          let hostname = '';
          try {
            hostname = new URL(uri).hostname;
          } catch (_) {
            hostname = uri;
          }
          if (!hostname) continue;
          if (seen.has(hostname)) continue;
          seen.add(hostname);
          const title = chunk.web.title || hostname;
          out.push({ title, uri });
        }
        sources = out;
      }
    } catch (_) {
      sources = [];
    }

    return { summary, sources, model };
  } catch (_) {
    return { summary: '', sources: [], reason: 'Grounding failed.', model: 'none' };
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
    'The \'claim\' field must be one sentence stating your actual finding. Do not restate or paraphrase the question. ' +
    USER_FACTS_RULE;

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
    'Use only Thiel\'s ideas: 0 to 1, the non-consensus secret, monopoly, power law. ' +
    'Never use the terms via negativa, ergodicity or absorbing barrier. ' +
    'Recommendation: maximum 4 numbered steps, one sentence each. ' +
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
    'The \'claim\' field must be one sentence stating your actual finding. Do not restate or paraphrase the question. ' +
    'The recommendation and the secret must build on the user\'s stated assets and stay connected to their original idea. ' +
    'Still demand a 0-to-1 angle, but as an upgrade of their plan, not a replacement. ' +
    USER_FACTS_RULE;

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

  const { result, model } = await callGeminiWithFallback({
    models: [GEMINI_MAIN_MODEL, GEMINI_LITE_MODEL, 'groq'],
    build: async (modelName) => {
      let text = '';
      if (modelName === 'groq') {
        text = await callGroqText(user, system, 0.7);
      } else {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: user,
          config: {
            systemInstruction: system,
            temperature: 0.7,
            responseMimeType: 'application/json'
          }
        });
        text =
          (response && response.text) ||
          (response &&
            response.candidates &&
            response.candidates[0] &&
            response.candidates[0].content &&
            response.candidates[0].content.parts &&
            response.candidates[0].content.parts.map((p) => p.text || '').join('')) ||
          '';
      }
      const parsed = extractJson(text);
      if (!parsed) throw new Error('Thiel brain returned non-JSON content.');
      return {
        claim: parsed.claim || '',
        secret: parsed.secret || '',
        monopolyAngle: parsed.monopolyAngle || '',
        recommendation: parsed.recommendation || ''
      };
    }
  });

  return { result, model };
}

async function runSynthesis(question, taleb, thiel, briefing) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');

  const ai = new GoogleGenAI({ apiKey });

  const system =
    'You are the Barbell Synthesis engine. You combine a Taleb downside audit and a Thiel ' +
    'upside audit into one final verdict. The barbell = extreme safety on the downside + ' +
    'extreme asymmetry on the upside. ' +
    'Use "absorbing barrier" only for the point of ruin in the Taleb Floor. ' +
    'In the Thiel Ceiling describe the edge as a "competitive moat", never as an absorbing barrier. ' +
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
    'killCriteria (2 to 3 triggers as numbered sentences "1. ... 2. ... 3. ...". ' +
    'Each trigger is ONE complete, natural sentence in this form: ' +
    '"Stop or rethink if <something you can observe> by the deadline you decide before you start." ' +
    'No square brackets, no placeholders, no text like "set your own limit: [...]" and no "within a set your own deadline". ' +
    'Numbers, percentages and time periods are allowed ONLY if they appear in the briefing. ' +
    'Otherwise use plain words such as "by the deadline you decide before you start" ' +
    'or "once spending passes the amount you decided in advance"), ' +
    'unfairAdvantage (Thiel Ceiling — the durable edge and 10x breakthrough, described as a competitive moat), ' +
    'and exactly 3 immediate next actions (3 concrete steps, each starting with a verb, each tied to the user\'s plan). ' +
    'If the verdict is Pivot, the pivot must be specific changes to the user\'s own plan ' +
    '(what to remove, delay, scale down or reorder) that keep the same core idea. ' +
    'Do not invent a different business. Only if the verdict is Abort may you name an alternative, ' +
    'and then say clearly "drop this plan". ' +
    USER_FACTS_RULE;

  const { result, model } = await callGeminiWithFallback({
    models: [GEMINI_MAIN_MODEL, 'groq'],
    build: async (modelName) => {
      let text = '';
      if (modelName === 'groq') {
        text = await callGroqText(user, system, 0.5);
      } else {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: user,
          config: {
            systemInstruction: system,
            temperature: 0.5,
            responseMimeType: 'application/json'
          }
        });
        text =
          (response && response.text) ||
          (response &&
            response.candidates &&
            response.candidates[0] &&
            response.candidates[0].content &&
            response.candidates[0].content.parts &&
            response.candidates[0].content.parts.map((p) => p.text || '').join('')) ||
          '';
      }
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
  });

  return { result, model };
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

    const [talebResult, thielOut] = await Promise.all([
      runTaleb(question, briefing),
      runThiel(question, briefing)
    ]);
    const thielResult = thielOut.result;

    const synthesisOut = await runSynthesis(question, talebResult, thielResult, briefing);
    const synthesis = synthesisOut.result;

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
          },
          meta: {
            grounding: grounding && grounding.model ? grounding.model : 'none',
            thiel: thielOut.model,
            synthesis: synthesisOut.model
          }
        }
      },
      { status: 200 }
    );
  } catch (error) {
    const raw = error && error.message ? String(error.message) : 'Unknown error in dual-brain pipeline.';
    console.error('[decide] failed:', error);
    const lower = raw.toLowerCase();
    let status = 500;
    let friendly = 'Something went wrong while analysing your idea. Please try again.';
    if (
      lower.includes('429') ||
      lower.includes('resource_exhausted') ||
      lower.includes('quota') ||
      lower.includes('rate limit')
    ) {
      status = 429;
      friendly = 'Daily free AI limit reached. Please try again later. The limit resets once a day.';
    } else if (lower.includes('timeout') || lower.includes('timed out')) {
      status = 504;
      friendly = 'The AI took too long to respond. Please try again.';
    } else if (lower.includes('api_key is not set') || lower.includes('api key')) {
      status = 500;
      friendly = 'Server setup problem: an AI API key is missing or invalid.';
    }
    return NextResponse.json(
      { success: false, error: friendly, details: raw.slice(0, 300) },
      { status }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}
