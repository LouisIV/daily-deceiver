const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const FAKE_GENERATION_MODEL = process.env.FAKE_GENERATION_MODEL || "anthropic/claude-haiku-4-5-20251001";
const SCORE_MODEL = process.env.SCORE_MODEL || "anthropic/claude-sonnet-4-6";
const PRICE_PER_MTOK_IN_GEN = 1;
const PRICE_PER_MTOK_OUT_GEN = 5;
const PRICE_PER_MTOK_IN_SCORE = 3;
const PRICE_PER_MTOK_OUT_SCORE = 15;
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
const AI_GATEWAY_BASE_URL = process.env.AI_GATEWAY_BASE_URL || "https://ai-gateway.vercel.sh/v1";
const GEMINI_OCR_MODEL = process.env.GEMINI_OCR_MODEL || "google/gemini-2.0-flash-lite";
const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const LOCAL_MODE = process.argv.includes("--local") || !BLOB_READ_WRITE_TOKEN;
const SKIP_LOC = process.argv.includes("--skip-loc");
const FORCE_GENERATE = process.argv.includes("--force");
const PLAY_FLAG_PATH = "play-flag.txt";

const TOPIC_TERMS = [
  "train wreck",
  "railroad accident",
  "bank robbery",
  "stagecoach",
  "runaway horse",
  "town council",
  "schoolhouse",
  "church social",
  "temperance",
  "suffrage",
  "lynching",
  "murder",
  "arson",
  "fire",
  "flood",
  "tornado",
  "blizzard",
  "drought",
  "mining",
  "strike",
  "union",
  "election",
  "mayor",
  "telegraph",
  "telephone",
  "electric light",
  "epidemic",
  "smallpox",
  "scarlet fever",
  "cholera",
  "county fair",
  "circus",
  "parade",
  "saloon",
  "whiskey",
  "temperance pledge",
  "land dispute",
  "lost child",
  "elopement",
  "trial",
  "verdict",
  "accident",
  "explosion",
  "boiler",
  "steamboat",
  "ferry",
  "immigration",
  "homestead",
  "claim jump",
  "depot",
  "livery",
  "grange",
  "harvest",
  "wheat",
  "corn",
  "coal",
  "silver",
  "gold",
  "mail coach",
  "outlaw",
  "posse",
  "reward",
  "missing",
  "stolen",
  "jail break",
  "riot",
  "snowstorm",
  "hailstorm",
  "barn fire",
  "hotel fire",
  "school fire",
  "bridge collapse",
  "river rise",
  "earthquake",
  "lightning strike",
  "rail",
  "telegraph line",
  "cattle drive",
  "rustler",
  "stage line",
  "opera house",
  "lecture",
  "invention",
  "patent",
  "county seat",
  "court house",
  "grand jury",
  "indictment",
  "pension",
  "veteran",
  "Spanish-American War",
  "monument",
];

const EXTRA_TERMS = ["near", "in", "at", "outside", "yesterday", "last night", "this week", "last Saturday"];

const MIN_SNIPPET_WORDS = 40;
const MAX_SNIPPET_WORDS = 120;
const OVERFETCH_REAL = 40;
const OVERFETCH_FAKE = 30;
const REAL_SCORE_SAMPLE = 20;
const MIN_SCORE = 6;
const TARGET_REAL = 5;
const TARGET_TOTAL = 10;
const LOC_BASE = "https://www.loc.gov/collections/chronicling-america/";
const LOC_RESULTS_PER_QUERY = 25;
const LOC_REQUEST_DELAY_MS = 350;

export {
  ANTHROPIC_API_KEY,
  FAKE_GENERATION_MODEL,
  SCORE_MODEL,
  PRICE_PER_MTOK_IN_GEN,
  PRICE_PER_MTOK_OUT_GEN,
  PRICE_PER_MTOK_IN_SCORE,
  PRICE_PER_MTOK_OUT_SCORE,
  AI_GATEWAY_API_KEY,
  AI_GATEWAY_BASE_URL,
  GEMINI_OCR_MODEL,
  BLOB_READ_WRITE_TOKEN,
  LOCAL_MODE,
  SKIP_LOC,
  FORCE_GENERATE,
  PLAY_FLAG_PATH,
  TOPIC_TERMS,
  EXTRA_TERMS,
  MIN_SNIPPET_WORDS,
  MAX_SNIPPET_WORDS,
  OVERFETCH_REAL,
  OVERFETCH_FAKE,
  REAL_SCORE_SAMPLE,
  MIN_SCORE,
  TARGET_REAL,
  TARGET_TOTAL,
  LOC_BASE,
  LOC_RESULTS_PER_QUERY,
  LOC_REQUEST_DELAY_MS,
};
