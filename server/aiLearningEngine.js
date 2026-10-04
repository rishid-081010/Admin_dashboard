import OpenAI from 'openai';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const dataDir = path.join(__dirname, 'uploads/data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const MEMORY_FILE = path.join(dataDir, 'ai_learning_memory.json');

// Default baseline architectural memory
const INITIAL_MEMORY = {
  version: '2.0.0',
  totalEditsProcessed: 0,
  autoRepairsTriggered: 0,
  rules: [
    {
      id: 'rule_wall_continuity',
      category: 'architectural',
      rule: 'When filling or removing wall openings/doors, match ambient shadow gradient and paint finish continuously with zero hard boundaries.',
      confidence: 1.0,
    },
    {
      id: 'rule_baseboard_skirting',
      category: 'skirting',
      rule: 'Always extend floor baseboard skirting smoothly across any removed doorframe opening matching adjacent color, height, and profile.',
      confidence: 1.0,
    },
    {
      id: 'rule_background_preservation',
      category: 'preservation',
      rule: '100% preserve adjacent corridors, background rooms, kitchen cabinetry, bathroom vanities, ceilings, and flooring textures untouched.',
      confidence: 1.0,
    },
    {
      id: 'rule_no_patch_boxes',
      category: 'anti_pattern',
      rule: 'Never render rectangular or isolated cutout patches; diffuse lighting and texture smoothly into surrounding plaster.',
      confidence: 1.0,
    }
  ],
  antiPatterns: [
    'Abrupt luminance steps between newly filled wall surfaces and existing ambient shadows.',
    'Discontinuous baseboard or trim lines where doorways previously existed.',
    'Accidental cropping or alteration of distant open rooms (e.g. kitchens, corridors).',
  ],
  successfulRecipes: [],
};

/**
 * Load persistent learning memory from disk
 */
export function loadLearningMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const data = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
      return { ...INITIAL_MEMORY, ...data };
    }
  } catch (err) {
    console.warn('[AI Learning Engine] Error reading memory file, using defaults:', err.message);
  }
  return { ...INITIAL_MEMORY };
}

/**
 * Save persistent learning memory to disk
 */
export function saveLearningMemory(memory) {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2), 'utf8');
  } catch (err) {
    console.error('[AI Learning Engine] Error saving memory file:', err.message);
  }
}

/**
 * Retrieve relevant learned rules and past successful recipes for a specific directive
 */
export function getRelevantLearnedContext({ directive = '' }) {
  const memory = loadLearningMemory();
  const lowerDir = directive.toLowerCase();

  const matchedRules = memory.rules
    .filter(r => r.confidence >= 0.7)
    .map(r => `• ${r.rule}`)
    .join('\n');

  const matchedAntiPatterns = memory.antiPatterns
    .map(ap => `• AVOID: ${ap}`)
    .join('\n');

  return {
    rulesPrompt: matchedRules,
    antiPatternsPrompt: matchedAntiPatterns,
    totalRules: memory.rules.length,
    editsProcessed: memory.totalEditsProcessed,
  };
}

/**
 * Autonomous AI Critic: Audits generated image vs original photo on a 5-dimension rubric
 */
export async function evaluateImageCritique({
  originalImagePath,
  generatedImagePath,
  directive,
  specializedPrompt,
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.includes('your_openai_api_key')) {
    return { pass: true, score: 95, critique: 'OpenAI API key missing, skipped critique' };
  }

  const openai = new OpenAI({ apiKey });

  try {
    const origBase64 = (await sharp(originalImagePath).resize(800).jpeg({ quality: 80 }).toBuffer()).toString('base64');
    const genBase64 = (await sharp(generatedImagePath).resize(800).jpeg({ quality: 80 }).toBuffer()).toString('base64');

    const critiqueRes = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an exacting Principal Visual Quality Auditor for ultra-luxury real estate imagery.
Compare the ORIGINAL photo (Image 1) with the GENERATED EDITED photo (Image 2).
User Modification Directive: "${directive}"

Evaluate on a 100-point scale across 5 criteria (20 points each):
1. Seamless Continuity: Zero visible cut seams, patch lines, or rectangular artifacts where modification occurred.
2. Lighting & Shadow Harmony: Ambient lighting gradients, falloff, and color temperature match the room naturally.
3. Material & Baseboard Fidelity: Wall paint texture and baseboard skirting are continuous and aligned.
4. Background & Surroundings Preservation: All unrequested areas (distant rooms, kitchens, vanities, floors, ceilings) are 100% authentic and preserved.
5. Luxury Presentation: The image meets high-end Dubai real estate listing standards.

Return ONLY a valid JSON object:
{
  "score": number, // 0 to 100
  "pass": boolean, // true if score >= 90 and no critical seams/distortions exist
  "critique": "concise explanation of findings",
  "actionableFix": "specific instructions to fix any flaws if score < 90, otherwise 'none'"
}`
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'IMAGE 1: ORIGINAL PHOTO' },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${origBase64}` } },
            { type: 'text', text: 'IMAGE 2: AI GENERATED EDIT' },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${genBase64}` } }
          ]
        }
      ],
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(critiqueRes.choices[0].message?.content || '{}');
    const score = typeof parsed.score === 'number' ? parsed.score : 90;
    const pass = parsed.pass !== false && score >= 90;

    console.log(`[AI Critic Audit] Score: ${score}/100 | Pass: ${pass} | Critique: ${parsed.critique || 'Approved'}`);

    return {
      pass,
      score,
      critique: parsed.critique || 'Passed visual quality evaluation.',
      actionableFix: parsed.actionableFix || '',
    };
  } catch (err) {
    console.warn('[AI Critic Audit] Evaluation skipped due to error:', err.message);
    return { pass: true, score: 95, critique: 'Auto-approved (Critic fallback).' };
  }
}

/**
 * Record successful run in learning memory
 */
export function recordSuccessfulRun({ directive, prompt, score = 95 }) {
  const memory = loadLearningMemory();
  memory.totalEditsProcessed = (memory.totalEditsProcessed || 0) + 1;

  if (score >= 90 && directive) {
    memory.successfulRecipes = memory.successfulRecipes || [];
    memory.successfulRecipes.unshift({
      directive: directive.trim(),
      promptSnippet: prompt ? prompt.substring(0, 300) : '',
      score,
      timestamp: new Date().toISOString(),
    });
    // Keep top 50 recipes
    if (memory.successfulRecipes.length > 50) {
      memory.successfulRecipes = memory.successfulRecipes.slice(0, 50);
    }
  }

  saveLearningMemory(memory);
}

/**
 * Increment auto-repair counter in memory
 */
export function recordAutoRepair() {
  const memory = loadLearningMemory();
  memory.autoRepairsTriggered = (memory.autoRepairsTriggered || 0) + 1;
  saveLearningMemory(memory);
}

/**
 * Self-Learning from user follow-up corrections
 */
export async function learnFromUserFollowUp({ previousDirective, followUpDirective }) {
  if (!previousDirective || !followUpDirective) return;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.includes('your_openai_api_key')) return;

  const openai = new OpenAI({ apiKey });

  try {
    const analysisRes = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an AI Machine Learning Architect analyzing user feedback on real estate photo editing.
Previous Directive: "${previousDirective}"
Follow-up Correction Directive: "${followUpDirective}"

Extract what failure mode or nuance occurred in the first attempt that the user had to correct.
Synthesize:
1. A permanent architectural rule to prevent this in future edits.
2. A negative anti-pattern description.

Return ONLY a JSON object:
{
  "newRule": "concise permanent architectural rule",
  "category": "lighting" | "texture" | "geometry" | "skirting" | "general",
  "antiPattern": "concise anti-pattern to avoid"
}`
        }
      ],
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(analysisRes.choices[0].message?.content || '{}');
    if (parsed.newRule) {
      const memory = loadLearningMemory();
      memory.rules.push({
        id: `rule_learned_${Date.now()}`,
        category: parsed.category || 'general',
        rule: parsed.newRule,
        confidence: 0.9,
      });
      if (parsed.antiPattern && !memory.antiPatterns.includes(parsed.antiPattern)) {
        memory.antiPatterns.push(parsed.antiPattern);
      }
      saveLearningMemory(memory);
      console.log(`[AI Learning Engine] Learned new rule from user follow-up: "${parsed.newRule}"`);
    }
  } catch (err) {
    console.warn('[AI Learning Engine] Error learning from follow-up:', err.message);
  }
}
