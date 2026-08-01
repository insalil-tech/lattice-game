// Runs daily via GitHub Actions — generates puzzle with Gemini, saves to Supabase

const GEMINI_KEY  = process.env.GEMINI_KEY;
const SUPA_URL    = process.env.SUPABASE_URL;
const SUPA_KEY    = process.env.SUPABASE_SERVICE_KEY;

const today = new Date().toISOString().slice(0, 10);

const PROMPT = `You are generating a daily word-connection puzzle about science for general audiences aged 10+.

Today's date: ${today}

Create exactly 4 groups of 4 science words or short phrases.

STRICT RULES:
- Each group shares ONE clear simple connection expressible in under 6 words
- The 4 groups must come from DIFFERENT areas of science (mix biology, chemistry, physics, astronomy, geology, anatomy, ecology, etc.)
- NO overarching theme connecting all 4 groups to each other
- Words must be recognisable to a curious 10-year-old
- No word appears in more than one group
- One group easy, one medium, one hard, one surprising twist
- Do NOT mention science, connections, or themes in the clue

Return ONLY valid JSON, no explanation, no markdown:
{
  "clue": "One short punchy line (max 8 words) that teases the puzzle without revealing groups",
  "groups": [
    {
      "label": "Things that glow in the dark",
      "emoji": "✨",
      "items": ["Firefly", "Anglerfish", "Radium", "Glow Worm"]
    },
    {
      "label": "Named after scientists",
      "emoji": "🔬",
      "items": ["Watt", "Newton", "Kelvin", "Hertz"]
    },
    {
      "label": "Things with a nucleus",
      "emoji": "⚛️",
      "items": ["Atom", "Cell", "Comet", "Galaxy"]
    },
    {
      "label": "Animals that change sex",
      "emoji": "🧬",
      "items": ["Clownfish", "Oyster", "Wrasse", "Parrotfish"]
    }
  ]
}`;

async function run() {
  console.log(`Generating puzzle for ${today}...`);

  // Call Gemini
  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 1000 }
      })
    }
  );

  const geminiData = await geminiRes.json();
  const raw = geminiData.candidates[0].content.parts[0].text.trim();

  // Strip markdown fences if present
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const puzzle  = JSON.parse(cleaned);

  console.log('Generated:', puzzle.groups.map(g => g.label));

  // Save to Supabase
  const supaRes = await fetch(`${SUPA_URL}/rest/v1/puzzles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPA_KEY,
      'Authorization': `Bearer ${SUPA_KEY}`,
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify({ date: today, clue: puzzle.clue, groups: puzzle.groups })
  });

  if (!supaRes.ok) {
    const err = await supaRes.text();
    throw new Error(`Supabase error: ${err}`);
  }

  console.log(`✅ Puzzle saved for ${today}`);
}

run().catch(e => { console.error(e); process.exit(1); });
