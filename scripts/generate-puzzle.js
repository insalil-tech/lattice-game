// scripts/generate-puzzle.js
// Runs daily via GitHub Actions — generates puzzle with Gemini, saves to Supabase

const GEMINI_KEY = process.env.GEMINI_KEY;
const SUPA_URL   = process.env.SUPABASE_URL;
const SUPA_KEY   = process.env.SUPABASE_SERVICE_KEY;
const today      = new Date().toISOString().slice(0, 10);

// ── Validate secrets are present ──────────────────────────────────────────────
if (!GEMINI_KEY) { console.error("❌ GEMINI_KEY secret is missing"); process.exit(1); }
if (!SUPA_URL)   { console.error("❌ SUPABASE_URL secret is missing"); process.exit(1); }
if (!SUPA_KEY)   { console.error("❌ SUPABASE_SERVICE_KEY secret is missing"); process.exit(1); }

console.log(`✅ Secrets present`);
console.log(`📅 Generating puzzle for: ${today}`);

const PROMPT = `You are generating a daily word-connection puzzle for general audiences aged 10+.

Today's date: ${today}

Create exactly 4 groups of 4 words or short phrases. Each group shares ONE clear simple connection.

STRICT RULES:
- The 4 groups must come from DIFFERENT areas of knowledge (mix science, nature, history, language, etc.)
- NO overarching theme connecting all 4 groups to each other
- Words must be recognisable to a curious 10-year-old
- No word appears in more than one group
- One group easy, one medium, one hard, one surprising twist
- Keep group labels short and clear (under 6 words)

Return ONLY valid JSON with NO markdown, NO backticks, NO explanation — just the raw JSON object:
{
  "clue": "One short punchy teaser line under 10 words",
  "groups": [
    { "label": "Things that glow in the dark", "emoji": "✨", "items": ["Firefly", "Anglerfish", "Radium", "Glow Worm"] },
    { "label": "Named after scientists",        "emoji": "🔬", "items": ["Watt", "Newton", "Kelvin", "Hertz"] },
    { "label": "Things with a nucleus",         "emoji": "⚛️", "items": ["Atom", "Cell", "Comet", "Galaxy"] },
    { "label": "Animals that change sex",       "emoji": "🧬", "items": ["Clownfish", "Oyster", "Wrasse", "Parrotfish"] }
  ]
}`;

async function callGemini() {
  console.log("🤖 Calling Gemini API...");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
  
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: PROMPT }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 1000 }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = await res.json();

  // Log the raw response so we can debug if needed
  console.log("📥 Gemini raw response structure:", JSON.stringify(Object.keys(data)));

  if (!data.candidates || !data.candidates[0]) {
    throw new Error(`Unexpected Gemini response (full): ${JSON.stringify(data)}`);
  }

  const raw = data.candidates[0].content.parts[0].text.trim();
  console.log("📄 Raw text from Gemini:", raw.slice(0, 200));

  // Strip markdown fences if Gemini wraps in ```json ... ```
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let puzzle;
  try {
    puzzle = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Failed to parse Gemini JSON: ${e.message}\nRaw: ${cleaned}`);
  }

  // Validate structure
  if (!puzzle.clue || !Array.isArray(puzzle.groups) || puzzle.groups.length !== 4) {
    throw new Error(`Invalid puzzle structure: ${JSON.stringify(puzzle)}`);
  }
  for (const g of puzzle.groups) {
    if (!g.label || !g.emoji || !Array.isArray(g.items) || g.items.length !== 4) {
      throw new Error(`Invalid group structure: ${JSON.stringify(g)}`);
    }
  }

  console.log("✅ Puzzle valid:", puzzle.groups.map(g => g.label));
  return puzzle;
}

async function saveToSupabase(puzzle) {
  console.log("💾 Saving to Supabase...");

  const res = await fetch(`${SUPA_URL}/rest/v1/puzzles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPA_KEY,
      "Authorization": `Bearer ${SUPA_KEY}`,
      "Prefer": "resolution=merge-duplicates"
    },
    body: JSON.stringify({
      date: today,
      clue: puzzle.clue,
      groups: puzzle.groups
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Supabase error ${res.status}: ${errText}`);
  }

  console.log(`✅ Puzzle saved to Supabase for ${today}`);
}

async function run() {
  try {
    const puzzle = await callGemini();
    await saveToSupabase(puzzle);
    console.log("🎉 Done!");
  } catch (e) {
    console.error("❌ Error:", e.message);
    process.exit(1);
  }
}

run();
