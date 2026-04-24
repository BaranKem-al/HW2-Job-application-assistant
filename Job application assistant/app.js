// ============================================================
// Job Application Assistant - HW1 & HW2
// Multi-agent workflow: Parser → Writer → Publisher → Sheets
// ============================================================

require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// ============================================================
// GOOGLE SHEETS SETUP
// ============================================================
function getGoogleSheetsClient() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  return google.sheets({ version: 'v4', auth });
}

// ============================================================
// NODEMAILER SETUP
// ============================================================
function getMailTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS   // Gmail App Password (not your real password)
    }
  });
}

// ============================================================
// AGENT 1: PARSER
// Extracts company, position, skills from job description
// ============================================================
function agent1_parser(jobDescription) {
  console.log('[AGENT 1 - PARSER] Starting data extraction...');

  const companyMatch = jobDescription.match(/(?:at|@|company:|firm:)\s*([A-Z][^\n,\.]+)/i);
  const company = companyMatch ? companyMatch[1].trim() : 'Unknown Company';

  const positionMatch = jobDescription.match(/(?:position:|role:|title:|applying for:?)\s*([^\n]+)/i)
    || jobDescription.match(/^([A-Z][^\n]+(?:Engineer|Developer|Manager|Intern|Analyst|Designer)[^\n]*)/m);
  const position = positionMatch ? positionMatch[1].trim() : 'Software Position';

  const skillKeywords = ['Python', 'JavaScript', 'Java', 'React', 'Node', 'SQL', 'AWS',
    'Docker', 'Git', 'REST', 'API', 'English', 'Communication', 'Teamwork',
    'Telecom', 'Network', '5G', 'Customer Service', 'Technical Support'];
  const foundSkills = skillKeywords.filter(skill =>
    jobDescription.toLowerCase().includes(skill.toLowerCase())
  ).slice(0, 5);

  const parsed = { company, position, skills: foundSkills };
  console.log('[AGENT 1 - PARSER] Extracted:', parsed);
  return parsed;
}

// ============================================================
// AGENT 2: WRITER
// Generates cover letter from parsed job data
// ============================================================
function agent2_writer(parsedData, userName) {
  console.log('[AGENT 2 - WRITER] Generating cover letter...');

  const { company, position, skills } = parsedData;
  const skillsList = skills.length > 0 ? skills.join(', ') : 'relevant technical skills';
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const coverLetter = `${today}

Dear Hiring Manager at ${company},

I am writing to express my strong interest in the ${position} position at ${company}. As a dedicated and motivated student with a passion for technology and continuous learning, I am excited about the opportunity to contribute to your team.

My academic background has provided me with a solid foundation in ${skillsList}. I am particularly drawn to ${company} because of its innovative approach and commitment to excellence in the industry.

Throughout my studies, I have developed strong analytical and problem-solving skills, which I believe align well with the requirements of this role. I am a quick learner, highly motivated, and thrive in collaborative environments where I can both contribute and grow professionally.

I am confident that my enthusiasm, technical foundation, and dedication make me a strong candidate for the ${position} role. I would welcome the opportunity to discuss how my background aligns with your needs.

Thank you for considering my application. I look forward to hearing from you.

Sincerely,
${userName || '[Your Name]'}
`;

  console.log('[AGENT 2 - WRITER] Cover letter generated successfully.');
  return coverLetter;
}

// ============================================================
// AGENT 3: PUBLISHER
// Saves cover letter to file AND sends it via email
// ============================================================
async function agent3_publisher(coverLetter, company, position, recipientEmail, userName) {
  console.log('[AGENT 3 - PUBLISHER] Saving cover letter to file...');

  // --- Task 1: Save to file ---
  const fileName = 'cover_letter.txt';
  const filePath = path.join(__dirname, fileName);
  fs.writeFileSync(filePath, coverLetter);
  console.log(`[AGENT 3 - PUBLISHER] File saved: ${fileName}`);

  // --- Task 2: Send email ---
  let emailStatus = { sent: false, error: null };
  try {
    const transporter = getMailTransporter();

    const mailOptions = {
      from: `"Job Application Assistant" <${process.env.MAIL_USER}>`,
      to: recipientEmail,
      subject: `Your Cover Letter for ${position} at ${company}`,
      text: `Hi ${userName},\n\nHere is your generated cover letter for the ${position} position at ${company}.\n\n` +
            `---\n\n${coverLetter}\n\n---\n\nGood luck with your application!\n\nJob Application Assistant`,
      attachments: [
        {
          filename: fileName,
          path: filePath
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log(`[AGENT 3 - PUBLISHER] Email sent successfully to ${recipientEmail}`);
    emailStatus.sent = true;
  } catch (error) {
    console.error('[AGENT 3 - PUBLISHER] Email error:', error.message);
    emailStatus.error = error.message;
  }

  return { fileName, filePath, saved: true, emailStatus };
}

// ============================================================
// AGENT 4: GOOGLE SHEETS LOGGER
// Logs application data to Google Sheets
// ============================================================
async function agent4_sheetsLogger(name, email, parsedData, fileInfo) {
  console.log('[AGENT 4 - SHEETS LOGGER] Logging to Google Sheets...');

  try {
    const sheets = getGoogleSheetsClient();
    const today = new Date().toISOString().split('T')[0];

    const row = [
      name,
      email,
      parsedData.position,
      parsedData.company,
      parsedData.skills.join(', '),
      'Cover Letter Generated',
      today,
      fileInfo.fileName
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A:H',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] }
    });

    console.log('[AGENT 4 - SHEETS LOGGER] Data logged to Google Sheets successfully!');
    return { success: true, row };

  } catch (error) {
    console.error('[AGENT 4 - SHEETS LOGGER] Error:', error.message);
    return { success: false, error: error.message };
  }
}

// ============================================================
// HW2 MAIN ENDPOINT
// HTTP POST /apply → runs full pipeline → saves to Sheets
// ============================================================
app.post('/apply', async (req, res) => {
  console.log('\n========== NEW JOB APPLICATION REQUEST ==========');

  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({
      error: 'Missing required fields: name, email, message (job description)'
    });
  }

  try {
    // AGENT 1: Parse job description
    const parsedData = agent1_parser(message);

    // AGENT 2: Generate cover letter
    const coverLetter = agent2_writer(parsedData, name);

    // AGENT 3: Save to file + send email
    const fileInfo = await agent3_publisher(coverLetter, parsedData.company, parsedData.position, email, name);

    // AGENT 4: Log to Google Sheets
    const sheetsResult = await agent4_sheetsLogger(name, email, parsedData, fileInfo);

    console.log('========== WORKFLOW COMPLETE ==========\n');

    res.json({
      success: true,
      message: 'Cover letter generated and logged successfully!',
      pipeline: {
        agent1_parser: { status: 'SUCCESS', extracted: parsedData },
        agent2_writer: { status: 'SUCCESS', wordCount: coverLetter.split(' ').length },
        agent3_publisher: {
          status: 'SUCCESS',
          file: fileInfo.fileName,
          email_sent: fileInfo.emailStatus.sent,
          email_error: fileInfo.emailStatus.error || null
        },
        agent4_sheets: sheetsResult.success
          ? { status: 'SUCCESS' }
          : { status: 'ERROR', error: sheetsResult.error }
      },
      cover_letter: coverLetter,
      sheets_logged: sheetsResult.success,
      email_confirmation: fileInfo.emailStatus.sent
        ? `Cover letter has been sent to ${email}`
        : `Email could not be sent: ${fileInfo.emailStatus.error}`
    });

  } catch (error) {
    console.error('Pipeline error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/', (req, res) => {
  res.json({
    status: 'Job Application Assistant is running!',
    endpoints: {
      'POST /apply': 'Submit job description → get cover letter + email + Google Sheets log',
    },
    payload_example: {
      name: 'Baran Yazici',
      email: 'baran.yazici@atilim.edu.tr',
      message: 'Paste your job description here...'
    }
  });
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ Job Application Assistant running on port ${PORT}`);
  console.log(`📋 POST http://localhost:${PORT}/apply`);
  console.log(`🔑 Make sure .env file is configured!\n`);
});
