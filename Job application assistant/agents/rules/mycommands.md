---
trigger: always_on
---

# Command: /run-job-assistant
# Description: Triggers the automated multi-agent workflow for HW1 and HW2 (including Email, File delivery, and Google Sheets logging).

[Workflow Sequence]
1. **CALL "Agent 1 Parser"**: 
   - Task: Analyze the job description.
   - Action: Extract Company Name, Position, and Top 5 Technical Skills.
   - Output: Pass the data summary to Agent 2.

2. **PASS OUTPUT TO "Agent 2 Writer"**: 
   - Task: Generate a professional, tailored cover letter based on Agent 1's summary.
   - Output: Pass the final draft to Agent 3.

3. **PASS OUTPUT TO "Agent 3 Publisher"**: 
   - Task 1 (File): Save the cover letter as a file named `cover_letter.txt`.
   - Task 2 (Email): Send the final cover letter text to the user's registered email address.
   - Task 3 (Output): Provide the user with the direct download link and confirm the email status.
   - Output: Pass name, email, parsedData, and fileInfo to Agent 4.

4. **PASS OUTPUT TO "Agent 4 Sheets Logger"**:
   - Task: Append all application data as a new row in Google Sheets.
   - Action: Write Name, Email, Position, Company, Skills, Status, Date, and Output File to Sheet1 columns A–H.
   - Auth: Use Google Service Account credentials from .env.
   - On Success: Confirm "Application data has been logged to Google Sheets."
   - On Failure: Log the error silently — do NOT block the user from receiving their cover letter.

[Rules]
- **Order of Operations**: Follow the exact sequence: Agent 1 → Agent 2 → Agent 3 → Agent 4.
- **HW2 Compliance**: Agent 3 MUST ensure the file is saved in the workspace and the download URL is visible. Agent 4 MUST log to Google Sheets without blocking the response.
- **Communication**: Explicitly mention "Email has been sent to your address" and "Data logged to Google Sheets" upon successful delivery.
- **Non-blocking Persistence**: If Agent 4 (Sheets) fails, the workflow still completes and the user receives their cover letter. The failure is reported in the pipeline status object.
