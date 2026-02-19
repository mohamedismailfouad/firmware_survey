import express from 'express';
import Vacation from './Vacation.js';

const router = express.Router();

// --- Helper: send vacation confirmation emails ---
async function sendVacationEmails(vacation, isUpdate) {
  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.default.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const action = isUpdate ? 'Updated' : 'New';

  const formattedDays = vacation.vacationDays
    .map((d) => {
      const date = new Date(d + 'T00:00:00');
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    })
    .join('<br>');

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1a5f7a, #159895); padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
        <h2 style="color: white; margin: 0;">${action} Vacation Request</h2>
      </div>
      <div style="background: #ffffff; padding: 25px; border: 1px solid #e0e0e0;">
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #1a5f7a; margin-top: 0;">Employee Details</h3>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${vacation.email}</p>
          <p style="margin: 5px 0;"><strong>HR Code:</strong> ${vacation.hrCode}</p>
        </div>
        <div style="background: #e8f4f8; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #1a5f7a; margin-top: 0;">
            Vacation Days (${vacation.totalDays} day${vacation.totalDays > 1 ? 's' : ''}) - Year ${vacation.year}
          </h3>
          <p style="line-height: 1.8;">${formattedDays}</p>
        </div>
        <p style="color: #666; font-size: 13px; text-align: center;">
          Submitted on ${new Date(vacation.submittedAt).toLocaleString()}
        </p>
      </div>
      <div style="background: #f8f9fa; padding: 15px; border-radius: 0 0 12px 12px; text-align: center; border: 1px solid #e0e0e0; border-top: none;">
        <p style="color: #999; font-size: 12px; margin: 0;">AZKA Firmware Team - Vacation Management System</p>
      </div>
    </div>
  `;

  const subject = `${action} Vacation: ${vacation.email} - ${vacation.totalDays} days (${vacation.year})`;

  // Send to employee
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: vacation.email,
    subject,
    html,
  });

  // Send to admin
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: 'azka.innovation@gmail.com',
    subject,
    html,
  });
}

// --- Export JSON (must be before /:id) ---
router.get('/export/json', async (req, res) => {
  try {
    const filter = {};
    if (req.query.year) filter.year = Number(req.query.year);
    const vacations = await Vacation.find(filter).lean();
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=azka_vacations_${new Date().toISOString().slice(0, 10)}.json`
    );
    res.json(vacations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Export CSV ---
router.get('/export/csv', async (req, res) => {
  try {
    const filter = {};
    if (req.query.year) filter.year = Number(req.query.year);
    const vacations = await Vacation.find(filter).lean();

    if (vacations.length === 0) {
      return res.status(400).json({ error: 'No data to export' });
    }

    let csv =
      '\uFEFF' +
      'Email,HR Code,Year,Total Days,Vacation Days,Submitted At\n';

    vacations.forEach((v) => {
      csv += `"${v.email}","${v.hrCode}",${v.year},${v.totalDays},"${v.vacationDays.join('; ')}","${new Date(v.submittedAt).toLocaleString()}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=azka_vacations_${new Date().toISOString().slice(0, 10)}.csv`
    );
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Statistics ---
router.get('/stats', async (req, res) => {
  try {
    const filter = {};
    if (req.query.year) filter.year = Number(req.query.year);

    const vacations = await Vacation.find(filter).lean();

    const topEmployees = vacations
      .sort((a, b) => b.totalDays - a.totalDays)
      .slice(0, 10)
      .map((v) => ({
        email: v.email,
        hrCode: v.hrCode,
        totalDays: v.totalDays,
      }));

    const monthlyDist = Array(12).fill(0);
    vacations.forEach((v) => {
      v.vacationDays.forEach((day) => {
        const month = new Date(day + 'T00:00:00').getMonth();
        monthlyDist[month]++;
      });
    });

    const dateOverlap = {};
    vacations.forEach((v) => {
      v.vacationDays.forEach((day) => {
        if (!dateOverlap[day]) dateOverlap[day] = [];
        dateOverlap[day].push(v.email);
      });
    });

    const overlapDates = Object.entries(dateOverlap)
      .map(([date, emails]) => ({
        date,
        totalPeople: emails.length,
        employees: emails,
      }))
      .filter((o) => o.totalPeople >= 2)
      .sort((a, b) => b.totalPeople - a.totalPeople)
      .slice(0, 20);

    res.json({
      totalSubmissions: vacations.length,
      totalVacationDays: vacations.reduce((sum, v) => sum + v.totalDays, 0),
      averageDaysPerPerson: vacations.length
        ? Math.round(
            (vacations.reduce((sum, v) => sum + v.totalDays, 0) /
              vacations.length) *
              10
          ) / 10
        : 0,
      topEmployees,
      monthlyDistribution: monthlyDist,
      overlapDates,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Get all vacations ---
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.year) {
      filter.year = Number(req.query.year);
    }
    if (req.query.email) {
      filter.email = req.query.email.toLowerCase();
    }
    const vacations = await Vacation.find(filter)
      .sort({ submittedAt: -1 })
      .lean();
    res.json(vacations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Get single by _id ---
router.get('/:id', async (req, res) => {
  try {
    const vacation = await Vacation.findById(req.params.id).lean();
    if (!vacation) return res.status(404).json({ error: 'Not found' });
    res.json(vacation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Create / Upsert ---
router.post('/', async (req, res) => {
  try {
    const { email, hrCode, year, vacationDays } = req.body;

    if (!email || !hrCode || !year || !vacationDays?.length) {
      return res.status(400).json({ error: 'Email, HR Code, Year and Vacation Days are required' });
    }

    // Validate no past dates
    const today = new Date().toISOString().slice(0, 10);
    const pastDays = vacationDays.filter((d) => d < today);
    if (pastDays.length > 0) {
      return res.status(400).json({
        error: `Cannot select past dates: ${pastDays.join(', ')}`,
      });
    }

    const uniqueDays = [...new Set(vacationDays)].sort();
    const vacationData = {
      email: email.toLowerCase(),
      hrCode,
      year: Number(year),
      vacationDays: uniqueDays,
      totalDays: uniqueDays.length,
      submittedAt: new Date(),
    };

    // Check for existing submission
    const existing = await Vacation.findOne({
      email: vacationData.email,
      year: vacationData.year,
    });

    let vacation;
    let isUpdate = false;
    if (existing) {
      vacation = await Vacation.findByIdAndUpdate(existing._id, vacationData, {
        new: true,
        runValidators: true,
      });
      isUpdate = true;
    } else {
      vacation = new Vacation(vacationData);
      await vacation.save();
    }

    // Send emails (non-blocking)
    sendVacationEmails(vacation.toObject(), isUpdate).catch((err) => {
      console.error('Vacation email failed:', err);
    });

    res.status(isUpdate ? 200 : 201).json({
      ...vacation.toObject(),
      isUpdate,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ error: 'Duplicate submission for this year' });
    }
    res.status(400).json({ error: err.message });
  }
});

// --- Update by _id ---
router.put('/:id', async (req, res) => {
  try {
    const vacation = await Vacation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!vacation) return res.status(404).json({ error: 'Not found' });
    res.json(vacation.toObject());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Delete by _id ---
router.delete('/:id', async (req, res) => {
  try {
    const result = await Vacation.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Clear all ---
router.delete('/', async (req, res) => {
  try {
    await Vacation.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
