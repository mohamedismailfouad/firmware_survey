import express from 'express';
import Survey from './Survey.js';
import { sendSurveyNotification } from './emailService.js';

const router = express.Router();

const SKILL_VALUES = {
  none: 0,
  learning: 1,
  basic: 2,
  proficient: 3,
  expert: 4,
};

const ALL_SKILL_MODULES = [
  'Metering', 'DLMS', 'ANSI', 'IEC62056-21', 'Tariff', 'Calendar',
  'LoadProfile', 'Predictor', 'Limiter', 'Disconnector',
  'RF_APP', 'RF_Drv', 'RFID_APP', 'RFID_Drv', 'PLC', 'GPRS_APP',
  'GPRS_Drv', 'IR', 'WiFi', 'Bluetooth', 'NB_IoT', 'Console',
  'Security', 'AES', 'SHA', 'MD5', 'RSA', 'ECC', 'HMAC', 'ECDSA',
  'TLS_SSL', 'KeyManagement', 'SecureBoot',
  'Bootloader', 'RTOS', 'LowPowerMode', 'PowerManagement', 'EEPROM',
  'FLASH', 'BinaryDelta', 'Compression',
  'Display_APP', 'Display_Drv', 'Keypad', 'TouchKeypad', 'Tampers',
  'GPIO', 'UART', 'SPI', 'I2C', 'ADC', 'Timer', 'DMA', 'Interrupt',
  'RTC', 'Watchdog', 'CRC',
];

function mapToObject(map) {
  if (map instanceof Map) return Object.fromEntries(map);
  return map || {};
}

function calculateGrade(skills, customSkills) {
  const allSkills = { ...mapToObject(skills), ...mapToObject(customSkills) };
  const values = Object.values(allSkills).map((v) => SKILL_VALUES[v] || 0);
  if (values.length === 0) return { score: 0, grade: 'F', percentage: 0 };

  const total = values.reduce((a, b) => a + b, 0);
  const max = values.length * 4;
  const percentage = Math.round((total / max) * 100);

  let grade;
  if (percentage >= 80) grade = 'A';
  else if (percentage >= 60) grade = 'B';
  else if (percentage >= 40) grade = 'C';
  else if (percentage >= 20) grade = 'D';
  else grade = 'F';

  return { score: total, grade, percentage };
}

// --- Export JSON (must be before /:id) ---
router.get('/export/json', async (req, res) => {
  try {
    const surveys = await Survey.find().lean();
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=azka_firmware_survey_${new Date().toISOString().slice(0, 10)}.json`
    );
    res.json(surveys);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Export CSV ---
router.get('/export/csv', async (req, res) => {
  try {
    const surveys = await Survey.find().lean();
    if (surveys.length === 0) {
      return res.status(400).json({ error: 'No data to export' });
    }

    const allModules = [...ALL_SKILL_MODULES];
    surveys.forEach((e) => {
      Object.keys(mapToObject(e.customSkills)).forEach((m) => {
        if (!allModules.includes(m)) allModules.push(m);
      });
    });

    let csv =
      'Name,Email,HR Code,Title,Experience,Department,Project,' +
      allModules.join(',') +
      ',Score,Grade\n';

    surveys.forEach((eng) => {
      const grade = calculateGrade(eng.skills, eng.customSkills);
      const allSkills = {
        ...mapToObject(eng.skills),
        ...mapToObject(eng.customSkills),
      };

      csv += `"${eng.fullName || ''}","${eng.email || ''}","${eng.hrCode || ''}","${eng.title || ''}",${eng.experience || 0},"${eng.department || ''}","${eng.projectName || ''}",`;
      csv += allModules.map((m) => SKILL_VALUES[allSkills[m]] || 0).join(',');
      csv += `,${grade.percentage}%,${grade.grade}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=azka_firmware_matrix_${new Date().toISOString().slice(0, 10)}.csv`
    );
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Import ---
router.post('/import', async (req, res) => {
  try {
    const { data, merge } = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'data must be an array' });
    }

    if (!merge) {
      await Survey.deleteMany({});
    }

    let importedCount = 0;
    for (const item of data) {
      await Survey.findOneAndUpdate({ hrCode: item.hrCode }, item, {
        upsert: true,
        new: true,
        runValidators: true,
      });
      importedCount++;
    }

    res.json({ imported: importedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Get all surveys (optional department filter) ---
router.get('/', async (req, res) => {
  try {
    const filter =
      req.query.department && req.query.department !== 'all'
        ? { department: req.query.department }
        : {};
    const surveys = await Survey.find(filter).sort({ timestamp: -1 }).lean();
    res.json(surveys);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Get single by numeric id ---
router.get('/:id', async (req, res) => {
  try {
    const survey = await Survey.findOne({
      id: Number(req.params.id),
    }).lean();
    if (!survey) return res.status(404).json({ error: 'Not found' });
    res.json(survey);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Create ---
router.post('/', async (req, res) => {
  try {
    const survey = new Survey(req.body);
    await survey.save();

    // Send email notification (don't wait for it to complete)
    sendSurveyNotification(survey.toObject()).catch((err) => {
      console.error('Email notification failed:', err);
    });

    res.status(201).json(survey.toObject());
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'HR Code already exists' });
    }
    res.status(400).json({ error: err.message });
  }
});

// --- Update by hrCode ---
router.put('/:hrCode', async (req, res) => {
  try {
    const survey = await Survey.findOneAndUpdate(
      { hrCode: req.params.hrCode },
      req.body,
      { new: true, runValidators: true }
    );
    if (!survey) return res.status(404).json({ error: 'Not found' });
    res.json(survey.toObject());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Delete single by numeric id ---
router.delete('/:id', async (req, res) => {
  try {
    const result = await Survey.findOneAndDelete({
      id: Number(req.params.id),
    });
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Clear all ---
router.delete('/', async (req, res) => {
  try {
    await Survey.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Send personalized email ---
router.post('/send-email', async (req, res) => {
  try {
    const { to, subject, html } = req.body;
    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'to, subject, and html are required' });
    }

    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    });

    res.json({ success: true, to });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
