import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { FRAMEWORKS } from '../../../lib/frameworks.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL = 'gemini-2.0-flash';

const PLAIN_ENGLISH_RULE =
  'STRICT PLAIN-ENGLISH RULE: Write in clear, everyday language a smart non-specialist can read. ' +
  'Avoid dense academic jargon. Every conceptual term you use (for example "absorbing barrier", "via negativa", ' +
  '"ergodicity", "non-consensus secret", "creative monopoly", "power law") MUST be immediately followed by ' +
  'a short, clear, plain-English explanation in parentheses or the next sentence. ' +
  'Never let a loaded term stand unexplained.';

function buildSystemPrompt() {
  const taleb = FRAMEWORKS.taleb;
  const thiel = FRAMEWORKS.thiel;

  return [
    'You are the Thinking OS Barbell Decision Engine.',
    'You run a structured 3-step decision pipeline on a single user question.',
    PLAIN_ENGLISH_RULE,
    '',
    '=== THINKER 1: TALEB ===',
    `Name: ${taleb.name}`,
    `Role: ${taleb.role}`,
    `Literature: ${taleb.literature.join(', ')}`,
    `Core Models: ${taleb.coreModels.join(', ')}`,
    `Directive: ${taleb.promptDirective}`,
    '',
    '=== THINKER 2: THIEL ===',
    `Name: ${thiel.name}`,
    `Role: ${thiel.role}`,
    `Literature: ${thiel.literature.join(', ')}`,
    `Core Models: ${thiel.coreModels.join(', ')}`,
    `Directive: ${thiel.promptDirective}`,
    '',
    'You must output a single valid JSON object and nothing else.',
    'No markdown fences, no commentary, no trailing text.',
    'Follow the exact schema described in the user message.'
  ].join('\n');
}

function buildUserPrompt(question, context) {
  return [
    'Analyze this decision using the 3-step pipeline below.',
    '',
    '=== USER QUESTION ===',
    question,
    '',
    '=== USER CONTEXT ===',
    context && String(context).trim().length > 0
      ? context
      : '(No extra context provided.)',
    '',
    '=== STEP 1: LIVE GROUNDING & REALITY CHECK ===',
    'Use the Google Search tool to verify facts about this decision space.',
    'Extract: (a) verified facts with short source notes, (b) industry base rates ' +
    '(typical real-world success/failure odds for this kind of move), and ' +
    '(c) unverified assumptions the user is silently making.',
    '',
    '=== STEP 2: TALEB vs THIEL ADVERSARIAL DEBATE ===',
    'Taleb runs a Downside Audit: absorbing barriers (points of no return where you are wiped out), ' +
    'ruin risk, fragility vs antifragility, and via negativa (what to remove rather than add).',
    'Thiel runs an Upside Audit: 0-to-1 vs 1-to-N (true invention vs copying), ' +
    'the non-consensus secret (a truth few agree with you on), and creative monopoly ' +
    '(escaping competition to own a niche).',
    'FORCE them to attack each other directly: have Taleb challenge Thiel\'s bold bet, ' +
    'and have Thiel challenge Taleb\'s caution. Show the real disagreement.',
    '',
    '=== STEP 3: BARBELL SYNTHESIS ===',
    'Combine both into one verdict. The barbell = extreme safety on the downside + ' +
    'extreme asymmetry on the upside.',
    'Produce: final verdict (Proceed / Pivot / Abort), ' +
    'Taleb\'s Kill-Criteria (the exact conditions that should make you pull the plug), ' +
    'Thiel\'s Unfair Advantage (the durable edge no one can easily copy), ' +
    'and a confidence score from 0 to 100.',
    'The confidence score MUST be mechanically calculated, not vibes. ' +
    'Compute it as: start at 50, add up to +25 for grounding strength ' +
    '(how well facts and base rates support the move), add up to +25 for asymmetry ' +
    '(how lopsided the upside is versus the downside), subtract up to -25 for ruin risk ' +
    '(how close the absorbing barrier is), subtract up to -15 for unverified assumptions, ' +
    'then clamp the final number to the 0-100 range. Show the arithmetic in "confidence_math".',
    '',
    '=== OUTPUT SCHEMA (return ONLY this JSON) ===',
    '{',
    '  "research": {',
    '    "verified_facts": [ { "fact": "string", "source": "string" } ],',
    '    "base_rates": [ "string" ],',
    '    "unverified_assumptions": [ "string" ]',
    '  },',
    '  "taleb": {',
    '    "downside_audit": "string",',
    '    "absorbing_barriers": [ "string" ],',
    '    "ruin_risk": "string",',
    '    "via_negativa": [ "string" ],',
    '    "rebuttal_to_thiel": "string"',
    '  },',
    '  "thiel": {',
    '    "upside_audit": "string",',
    '    "zero_to_one": "string",',
    '    "non_consensus_secret": "string",',
    '    "creative_monopoly": "string",',
    '    "rebuttal_to_taleb": "string"',
    '  },',
    '  "synthesis": {',
    '    "verdict": "Proceed | Pivot | Abort",',
    '    "verdict_reasoning": "string",',
    '    "taleb_kill_criteria": [ "string" ],',
    '    "thiel_unfair_advantage": "string",',
    '    "confidence_score": 0,',
    '    "confidence_math": "string"',
    '  }',
    '}'
  ].join('\n');
}

function extractJson(text) {
  if (!text) return null;
  let cleaned = String(text).trim();

  // Strip markdown fences if the model added them anyway.
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (_) {
    // Fallback: grab the outermost JSON object.
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

export async function POST(request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Server misconfiguration: GEMINI_API_KEY is not set.' },
        { status: 500 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (_) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body.' },
        { status: 400 }
      );
    }

    const question = body && typeof body.question === 'string' ? body.question.trim() : '';
    const context = body && typeof body.context === 'string' ? body.context.trim() : '';

    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: question.' },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: buildUserPrompt(question, context),
      config: {
        systemInstruction: buildSystemPrompt(),
        temperature: 0.7,
        responseMimeType: 'application/json',
        tools: [{ googleSearch: {} }]
      }
    });

    const rawText =
      (response && response.text) ||
      (response &&
        response.candidates &&
        response.candidates[0] &&
        response.candidates[0].content &&
        response.candidates[0].content.parts &&
        response.candidates[0].content.parts.map((p) => p.text || '').join('')) ||
      '';

    const data = extractJson(rawText);

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Model did not return valid JSON.',
          raw: typeof rawText === 'string' ? rawText.slice(0, 2000) : null
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    const message =
      error && error.message ? error.message : 'Unknown error in decision pipeline.';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}
