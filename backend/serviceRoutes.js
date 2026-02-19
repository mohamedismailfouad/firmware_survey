import express from 'express';
import ServiceRequest from './ServiceRequest.js';

const router = express.Router();

const TYPE_LABELS = {
  work_from_home: 'Work From Home',
  urgent_vacation: 'Urgent Vacation',
  need_help: 'Need Help',
};

// --- Helper: send service request emails ---
async function sendServiceEmail(request, isUpdate) {
  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.default.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const action = isUpdate ? 'Updated' : 'New';
  const typeLabel = TYPE_LABELS[request.type] || request.type;

  let datesHtml = '';
  if (request.dates && request.dates.length > 0) {
    const formattedDates = request.dates
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
    datesHtml = `
      <div style="background: #e8f4f8; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #1a5f7a; margin-top: 0;">Requested Dates (${request.dates.length} day${request.dates.length > 1 ? 's' : ''})</h3>
        <p style="line-height: 1.8;">${formattedDates}</p>
      </div>`;
  }

  let reasonHtml = '';
  if (request.reason) {
    reasonHtml = `
      <div style="background: #f0f8ff; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #1a5f7a; margin-top: 0;">Reason / Details</h3>
        <p style="line-height: 1.6;">${request.reason.replace(/\n/g, '<br>')}</p>
      </div>`;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1a5f7a, #159895); padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
        <h2 style="color: white; margin: 0;">${action} Service Request: ${typeLabel}</h2>
      </div>
      <div style="background: #ffffff; padding: 25px; border: 1px solid #e0e0e0;">
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #1a5f7a; margin-top: 0;">Employee Details</h3>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${request.email}</p>
          <p style="margin: 5px 0;"><strong>HR Code:</strong> ${request.hrCode}</p>
        </div>
        <div style="background: #e8f4f8; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #1a5f7a; margin-top: 0;">Request Type</h3>
          <p style="font-size: 1.1rem; font-weight: 600; color: #159895;">${typeLabel}</p>
        </div>
        ${datesHtml}
        ${reasonHtml}
        <p style="color: #666; font-size: 13px; text-align: center;">
          Submitted on ${new Date(request.submittedAt).toLocaleString()}
        </p>
      </div>
      <div style="background: #f8f9fa; padding: 15px; border-radius: 0 0 12px 12px; text-align: center; border: 1px solid #e0e0e0; border-top: none;">
        <p style="color: #999; font-size: 12px; margin: 0;">AZKA Firmware Team - Service Request System</p>
      </div>
    </div>
  `;

  const subject = `${action} ${typeLabel} Request: ${request.email}`;

  // Send to employee
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: request.email,
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

// --- Stats ---
router.get('/stats', async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;

    const requests = await ServiceRequest.find(filter).lean();

    const byType = {};
    const byStatus = { pending: 0, approved: 0, rejected: 0 };

    requests.forEach((r) => {
      byType[r.type] = (byType[r.type] || 0) + 1;
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    });

    res.json({
      totalRequests: requests.length,
      byType,
      byStatus,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Get all service requests ---
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.email) filter.email = req.query.email.toLowerCase();

    const requests = await ServiceRequest.find(filter)
      .sort({ submittedAt: -1 })
      .lean();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Get single ---
router.get('/:id', async (req, res) => {
  try {
    const request = await ServiceRequest.findById(req.params.id).lean();
    if (!request) return res.status(404).json({ error: 'Not found' });
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Create ---
router.post('/', async (req, res) => {
  try {
    const { email, hrCode, type, dates, reason } = req.body;

    if (!email || !hrCode || !type) {
      return res.status(400).json({ error: 'Email, HR Code, and Request Type are required' });
    }

    // Validate type-specific requirements
    if (type === 'work_from_home') {
      if (!dates || dates.length === 0) {
        return res.status(400).json({ error: 'Please select at least one date for Work From Home' });
      }
    }

    if (type === 'urgent_vacation') {
      if (!dates || dates.length === 0) {
        return res.status(400).json({ error: 'Please select at least one date for Urgent Vacation' });
      }
      if (dates.length > 3) {
        return res.status(400).json({ error: 'Urgent Vacation cannot exceed 3 days' });
      }
      // Validate dates are within 3 days from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() + 3);
      for (const d of dates) {
        const dateObj = new Date(d + 'T00:00:00');
        if (dateObj < today) {
          return res.status(400).json({ error: `Cannot select past date: ${d}` });
        }
        if (dateObj > maxDate) {
          return res.status(400).json({
            error: `Urgent vacation dates must be within 3 days from today. ${d} is too far.`,
          });
        }
      }
    }

    if (type === 'need_help') {
      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ error: 'Please describe what help you need' });
      }
    }

    const requestData = {
      email: email.toLowerCase(),
      hrCode,
      type,
      dates: dates ? [...new Set(dates)].sort() : [],
      reason: reason || '',
      status: 'pending',
      submittedAt: new Date(),
    };

    const serviceRequest = new ServiceRequest(requestData);
    await serviceRequest.save();

    // Send emails (non-blocking)
    sendServiceEmail(serviceRequest.toObject(), false).catch((err) => {
      console.error('Service request email failed:', err);
    });

    res.status(201).json(serviceRequest.toObject());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Update status ---
router.put('/:id/status', async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const request = await ServiceRequest.findByIdAndUpdate(
      req.params.id,
      { status, adminNote: adminNote || '' },
      { new: true, runValidators: true }
    );
    if (!request) return res.status(404).json({ error: 'Not found' });
    res.json(request.toObject());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Delete ---
router.delete('/:id', async (req, res) => {
  try {
    const result = await ServiceRequest.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Clear all ---
router.delete('/', async (req, res) => {
  try {
    await ServiceRequest.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
