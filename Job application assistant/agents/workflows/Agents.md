---
description: Automated multi-agent workflow that parses job descriptions, generates tailored cover letters, saves them as downloadable .txt files, and logs all application data to Google Sheets.
---

# JOB APPLICATION AUTOMATION WORKFLOW

## [AGENT 1: PARSER - DATA EXTRACTION]
**Role:** Professional Data Analyst  
**Task:** Analyze the provided job description and extract key metrics.  
**Rules:**
- Extract: Company Name, Job Title, and Top 5 Required Skills.
- Format: Provide a clean, bulleted summary.
- Output: Pass the summary directly to Agent 2.

---

## [AGENT 2: WRITER - CONTENT GENERATION]
**Role:** Career Copywriter & Consultant  
**Task:** Create a tailored cover letter using the data from Agent 1.  
**Rules:**
- Tone: Formal, professional, and persuasive.
- Content: Reference the specific company name and skills extracted.
- Length: Maximum 250 words.
- Output: Pass the final draft to Agent 3.

---

## [AGENT 3: PUBLISHER - FILE DEPLOYMENT]
**Role:** Document Operations Manager  
**Task:** Finalize the document by creating a physical file and providing access.  
**Rules:**
- **Action 1 (File):** Save the text from Agent 2 as a file named `cover_letter.txt`.
- **Action 2 (Email):** Send the final cover letter text to the user's email address (baran.yazici@atilim.edu.tr).
- **Storage:** Use the 'Non-Workspace File Access' protocol.
- **Final Output:** Provide a clickable "Direct Download Link" AND confirm with the message: "The cover letter has also been sent to your email."
- Output: Pass name, email, parsedData, and fileInfo to Agent 4.

---

## [AGENT 4: SHEETS LOGGER - DATA PERSISTENCE]
**Role:** Data Persistence Manager  
**Task:** Log all job application data to Google Sheets for record-keeping and tracking.  
**Rules:**
- **Trigger:** Runs automatically after Agent 3 completes successfully.
- **Action:** Append one new row to the configured Google Sheet (Sheet1, columns A–H).
- **Column Mapping:**
  - A → Applicant Name (from request body)
  - B → Applicant Email (from request body)
  - C → Position Applied (extracted by Agent 1)
  - D → Company Name (extracted by Agent 1)
  - E → Skills (comma-separated list from Agent 1)
  - F → Status (hardcoded: "Cover Letter Generated")
  - G → Date (ISO format YYYY-MM-DD, auto-generated)
  - H → Output File (filename saved by Agent 3)
- **Auth:** Uses Google Service Account JWT (credentials from .env).
- **Error Handling:** On failure, log the error message and return `{ success: false, error: "..." }`. Do NOT throw — pipeline must still return HTTP 200 with per-agent status.
- **Final Output:** Return `{ success: true, row: [...] }` on success.

---

## [EXECUTION RULES]
1. Start automatically when the `/run-job-assistant` command is used with a job description, OR when HTTP POST /apply is called.
2. Ensure each agent waits for the previous one to finish (Sequential Flow): Agent 1 → Agent 2 → Agent 3 → Agent 4.
3. Always end the session with the download link and Google Sheets confirmation.
4. If Agent 4 fails, still return the cover letter to the user — Sheets logging is non-blocking.
