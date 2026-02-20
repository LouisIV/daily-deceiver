# Game Generator

Generates the daily newspaper game payload.

## Usage

```bash
npm install
npm run typecheck
npm run generate
```

## Environment

Required:
- `ANTHROPIC_API_KEY`
- `BLOB_READ_WRITE_TOKEN` (omit to run local mode and write to `public/fallback-game.json`)

Required for OCR (unless using `--skip-loc`):
- `AI_GATEWAY_API_KEY` (or `VERCEL_OIDC_TOKEN` on Vercel)

Optional:
- `AI_GATEWAY_BASE_URL` (default `https://ai-gateway.vercel.sh/v1`)
- `GEMINI_OCR_MODEL` (default `google/gemini-2.0-flash-lite`)
- `ANTHROPIC_MODEL_GEN` (default `claude-haiku-4-5`)
- `ANTHROPIC_MODEL_SCORE` (default `claude-sonnet-4-6`)

## Flags

- `--local` write output to `public/fallback-game.json` and skip blob writes.
- `--skip-loc` skip LOC fetch + OCR and generate only fake snippets.
- `--force` ignore the play flag and regenerate.
