# Job Application Assistant

Multi-agent workflow that parses job descriptions, generates cover letters, and logs data to Google Sheets.

## Architecture

```
HTTP POST {name, email, message}
        ↓
Agent 1: Parser      → Extracts company, position, skills
        ↓
Agent 2: Writer      → Generates cover letter
        ↓
Agent 3: Publisher   → Saves cover_letter.txt
        ↓
Agent 4: Sheets Logger → Logs to Google Sheets ✅
```

## Files

| File | Purpose |
|------|---------|
| `app.js` | Main server, all 4 agents defined here |
| `package.json` | Node.js dependencies |
| `.env.example` | Environment variable template |
| `Agents.md` | Antigravity agent prompts |
| `mycommands.md` | Antigravity trigger command |
| `cover_letter.txt` | Generated output sample |

## Setup

```bash
npm install
cp .env.example .env
# Fill in your Google Sheets credentials in .env
node app.js
```

## Test

```bash
curl -X POST http://localhost:3000/apply \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Baran Yazici",
    "email": "baran.yazici@atilim.edu.tr",
    "message": "Software Support Intern at P.I. Works..."
  }'
```

## HW Requirements Met

- ✅ HW1: Manual trigger, AI writing function, document output
- ✅ HW2: HTTP POST input, cover letter generation, Google Sheets logging
