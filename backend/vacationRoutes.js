import express from 'express';
import Vacation from './Vacation.js';
import { EMPLOYEES, findEmployee, findEmployeeByEmail, getTeamLeadEmail } from './employees.js';

const router = express.Router();

// --- Helper: send vacation confirmation emails ---
async function sendVacationEmails(vacation, employee, isUpdate) {
  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.default.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const fromName = process.env.EMAIL_FROM_NAME || 'AZKA Firmware Team';
  const fromAddress = process.env.EMAIL_USER;
  const ccList = [process.env.EMAIL_CC, getTeamLeadEmail(employee.department)].filter(Boolean);
  const ccAddress = ccList.join(', ');
  const action = isUpdate ? 'Updated' : 'New';
  const expText = employee.experience != null ? `${employee.experience} year${employee.experience !== 1 ? 's' : ''}` : 'N/A';

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
        <p style="font-size: 1.1rem; margin-bottom: 20px;">Dear <strong>${employee.name}</strong>,</p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #1a5f7a; margin-top: 0;">Employee Details</h3>
          <p style="margin: 5px 0;"><strong>Name:</strong> ${employee.name}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${vacation.email}</p>
          <p style="margin: 5px 0;"><strong>HR Code:</strong> ${vacation.hrCode}</p>
          <p style="margin: 5px 0;"><strong>Department:</strong> ${employee.department}</p>
          <p style="margin: 5px 0;"><strong>Experience:</strong> ${expText}</p>
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

  const subject = `${action} Vacation: ${employee.name} (${employee.department}) - ${vacation.totalDays} days (${vacation.year})`;

  // Send to employee + CC
  await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: vacation.email,
    cc: ccAddress,
    subject,
    html,
  });

  // Send to admin
  await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: fromAddress,
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

// --- Vacation Reminders (called daily by cron) ---
const REMINDER_MILESTONES = [30, 20, 10, 5, 3, 1];
const MANAGER_EMAIL = 'mohamed.essa@azka.com.eg';

router.get('/reminders/check', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);
    const currentYear = today.getFullYear();

    // Build milestone date strings (dates that are X days from today)
    const milestoneDates = {};
    REMINDER_MILESTONES.forEach((days) => {
      const target = new Date(today);
      target.setDate(target.getDate() + days);
      milestoneDates[target.toISOString().slice(0, 10)] = days;
    });

    // Fetch all vacations for the current year
    const vacations = await Vacation.find({ year: currentYear }).lean();

    // Find employees with vacation days matching any milestone
    const reminders = [];
    for (const vac of vacations) {
      const employee = findEmployeeByEmail(vac.email);
      if (!employee) continue;

      for (const day of vac.vacationDays) {
        if (day < todayStr) continue; // Skip past days
        const daysAway = milestoneDates[day];
        if (daysAway != null) {
          reminders.push({
            employee,
            vacation: vac,
            vacationDay: day,
            daysAway,
            teamLead: getTeamLeadEmail(employee.department),
          });
        }
      }
    }

    if (reminders.length === 0) {
      return res.json({ message: 'No reminders to send today', sent: 0 });
    }

    // Group reminders by employee for a cleaner email
    const grouped = {};
    for (const r of reminders) {
      const key = r.employee.email;
      if (!grouped[key]) {
        grouped[key] = { employee: r.employee, vacation: r.vacation, teamLead: r.teamLead, days: [] };
      }
      grouped[key].days.push({ date: r.vacationDay, daysAway: r.daysAway });
    }

    // Set up email transporter
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const fromName = process.env.EMAIL_FROM_NAME || 'AZKA Firmware Team';
    const fromAddress = process.env.EMAIL_USER;
    let sentCount = 0;

    for (const [email, data] of Object.entries(grouped)) {
      const { employee, vacation, teamLead, days } = data;
      const expText = employee.experience != null ? `${employee.experience} year${employee.experience !== 1 ? 's' : ''}` : 'N/A';
      const teamLeadEmployee = teamLead ? EMPLOYEES.find((e) => e.email.toLowerCase() === teamLead.toLowerCase()) : null;
      const teamLeadName = teamLeadEmployee ? teamLeadEmployee.name : null;

      const upcomingRows = days
        .sort((a, b) => a.daysAway - b.daysAway)
        .map((d) => {
          const date = new Date(d.date + 'T00:00:00');
          const formatted = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
          const urgency = d.daysAway <= 3 ? '#e74c3c' : d.daysAway <= 10 ? '#e67e22' : '#1a5f7a';
          return `<tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${formatted}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: center;">
              <span style="background: ${urgency}; color: white; padding: 3px 10px; border-radius: 12px; font-weight: 600; font-size: 0.85rem;">
                ${d.daysAway} day${d.daysAway !== 1 ? 's' : ''}
              </span>
            </td>
          </tr>`;
        })
        .join('');

      // All vacation days for context
      const allDaysFormatted = vacation.vacationDays
        .filter((d) => d >= todayStr)
        .sort()
        .map((d) => {
          const date = new Date(d + 'T00:00:00');
          return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        })
        .join(', ');

      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 650px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #e67e22, #f39c12); padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
            <h2 style="color: white; margin: 0;">Upcoming Vacation Reminder</h2>
          </div>
          <div style="background: #ffffff; padding: 25px; border: 1px solid #e0e0e0;">
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #1a5f7a; margin-top: 0;">Employee Profile</h3>
              <p style="margin: 5px 0;"><strong>Name:</strong> ${employee.name}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${employee.email}</p>
              <p style="margin: 5px 0;"><strong>HR Code:</strong> ${vacation.hrCode}</p>
              <p style="margin: 5px 0;"><strong>Department:</strong> ${employee.department}</p>
              <p style="margin: 5px 0;"><strong>Title:</strong> ${employee.title || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>Experience:</strong> ${expText}</p>
              ${teamLeadName ? `<p style="margin: 5px 0;"><strong>Team Lead:</strong> ${teamLeadName}</p>` : ''}
            </div>

            <div style="background: #fef9e7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #e67e22; margin-top: 0;">Upcoming Vacation Days</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #f8f9fa;">
                    <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #ddd;">Date</th>
                    <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #ddd;">Days Away</th>
                  </tr>
                </thead>
                <tbody>${upcomingRows}</tbody>
              </table>
            </div>

            <div style="background: #e8f4f8; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #1a5f7a; margin-top: 0;">
                Full Vacation Plan (${vacation.totalDays} day${vacation.totalDays > 1 ? 's' : ''}) - Year ${vacation.year}
              </h3>
              <p style="line-height: 1.8; color: #555;">${allDaysFormatted}</p>
            </div>

            <p style="color: #666; font-size: 13px; text-align: center;">
              Reminder generated on ${new Date().toLocaleString()}
            </p>
          </div>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 0 0 12px 12px; text-align: center; border: 1px solid #e0e0e0; border-top: none;">
            <p style="color: #999; font-size: 12px; margin: 0;">AZKA Firmware Team - Vacation Planning System</p>
          </div>
        </div>
      `;

      const closestDay = days.sort((a, b) => a.daysAway - b.daysAway)[0];
      const subject = `Vacation Reminder: ${employee.name} (${employee.department}) - ${closestDay.daysAway} day${closestDay.daysAway !== 1 ? 's' : ''} away`;

      // Build CC list: team lead
      const ccList = [teamLead].filter(Boolean);

      // Send to manager
      await transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: MANAGER_EMAIL,
        cc: ccList.join(', '),
        subject,
        html,
      });

      sentCount++;
    }

    res.json({
      message: `Sent ${sentCount} reminder email(s)`,
      sent: sentCount,
      date: todayStr,
      reminders: Object.entries(grouped).map(([email, data]) => ({
        employee: data.employee.name,
        department: data.employee.department,
        days: data.days,
      })),
    });
  } catch (err) {
    console.error('Reminder check failed:', err);
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

    // Validate employee credentials
    const employee = findEmployee(email, hrCode);
    if (!employee) {
      return res.status(400).json({ error: 'Employee not found. Please check your email and HR code.' });
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

    // Send emails (await to ensure delivery before serverless shutdown)
    try {
      await sendVacationEmails(vacation.toObject(), employee, isUpdate);
    } catch (emailErr) {
      console.error('Vacation email failed:', emailErr);
    }

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
