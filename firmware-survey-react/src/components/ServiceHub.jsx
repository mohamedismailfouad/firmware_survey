import { useState } from 'react';
import VacationForm from './VacationForm';
import { createServiceRequest, fetchServiceRequests } from '../data/serviceUtils';

const SERVICE_TYPES = [
  {
    key: 'annual_vacation',
    label: 'Annual Vacation Plan',
    description: 'Plan and submit your annual vacation days for the current year',
    color: '#1a5f7a',
  },
  {
    key: 'work_from_home',
    label: 'Work From Home',
    description: 'Request to work from home on specific dates',
    color: '#159895',
  },
  {
    key: 'urgent_vacation',
    label: 'Urgent Vacation',
    description: 'Request an urgent vacation (up to 3 days from today)',
    color: '#e67e22',
  },
  {
    key: 'need_help',
    label: 'Need Help',
    description: 'Request assistance or support from management',
    color: '#8e44ad',
  },
];

export default function ServiceHub() {
  const [credentials, setCredentials] = useState({ email: '', hrCode: '' });
  const [credentialsConfirmed, setCredentialsConfirmed] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [credError, setCredError] = useState('');

  // WFH state
  const [wfhDates, setWfhDates] = useState([]);
  const [wfhReason, setWfhReason] = useState('');

  // Urgent Vacation state
  const [urgentDates, setUrgentDates] = useState([]);
  const [urgentReason, setUrgentReason] = useState('');

  // Need Help state
  const [helpMessage, setHelpMessage] = useState('');

  // Edit mode tracking
  const [editingId, setEditingId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Shared
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  function handleCredentialsSubmit(e) {
    e.preventDefault();
    setCredError('');
    if (!credentials.email || !credentials.hrCode) {
      setCredError('Both Email and HR Code are required.');
      return;
    }
    setCredentialsConfirmed(true);
  }

  function handleBack() {
    setSelectedService(null);
    setSubmitStatus(null);
  }

  function handleBackToCredentials() {
    setCredentialsConfirmed(false);
    setSelectedService(null);
    setSubmitStatus(null);
    resetForms();
  }

  function resetForms() {
    setWfhDates([]);
    setWfhReason('');
    setUrgentDates([]);
    setUrgentReason('');
    setHelpMessage('');
    setSubmitStatus(null);
    setEditingId(null);
    setIsEditing(false);
  }

  async function handleSelectService(key) {
    resetForms();
    setSelectedService(key);

    // Only check for existing pending request for work_from_home (edit allowed)
    if (key === 'work_from_home') {
      setLoadingExisting(true);
      try {
        const existing = await fetchServiceRequests({
          email: credentials.email,
          type: 'work_from_home',
          status: 'pending',
        });
        if (existing.length > 0) {
          const req = existing[0];
          setEditingId(req._id);
          setIsEditing(true);
          setWfhDates(req.dates || []);
          setWfhReason(req.reason || '');
          setSubmitStatus({
            type: 'success',
            message: 'You have an existing pending request. You can edit it below and resubmit.',
          });
        }
      } catch (err) {
        // Silently fail - user can still submit new
      } finally {
        setLoadingExisting(false);
      }
    }
  }

  // --- Date helpers for WFH and Urgent Vacation ---
  function getNext30Days() {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dayOfWeek = d.getDay();
      // Skip Friday (5) and Saturday (6) - weekend for Egypt
      if (dayOfWeek === 5 || dayOfWeek === 6) continue;
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  }

  function getNext3Days() {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 5 || dayOfWeek === 6) continue;
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  function toggleDate(dateStr, dates, setDates, maxDays) {
    if (dates.includes(dateStr)) {
      setDates(dates.filter((d) => d !== dateStr));
    } else {
      if (maxDays && dates.length >= maxDays) {
        setSubmitStatus({
          type: 'error',
          message: `Maximum ${maxDays} days allowed.`,
        });
        return;
      }
      setDates([...dates, dateStr].sort());
      setSubmitStatus(null);
    }
  }

  // --- Submit handlers ---
  async function handleSubmitWFH(e) {
    e.preventDefault();
    if (wfhDates.length === 0) {
      setSubmitStatus({ type: 'error', message: 'Please select at least one date.' });
      return;
    }
    setSubmitting(true);
    setSubmitStatus(null);
    try {
      const result = await createServiceRequest({
        email: credentials.email,
        hrCode: credentials.hrCode,
        type: 'work_from_home',
        dates: wfhDates,
        reason: wfhReason,
      });
      setSubmitStatus({
        type: 'success',
        message: result.isUpdate
          ? `Work From Home request updated successfully for ${wfhDates.length} day(s). Confirmation emails sent.`
          : `Work From Home request submitted successfully for ${wfhDates.length} day(s). Confirmation emails sent.`,
      });
      setIsEditing(true);
    } catch (err) {
      setSubmitStatus({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitUrgent(e) {
    e.preventDefault();
    if (urgentDates.length === 0) {
      setSubmitStatus({ type: 'error', message: 'Please select at least one date.' });
      return;
    }
    setSubmitting(true);
    setSubmitStatus(null);
    try {
      await createServiceRequest({
        email: credentials.email,
        hrCode: credentials.hrCode,
        type: 'urgent_vacation',
        dates: urgentDates,
        reason: urgentReason,
      });
      setSubmitStatus({
        type: 'success',
        message: `Urgent Vacation request submitted successfully for ${urgentDates.length} day(s). Confirmation emails sent.`,
      });
      // Clear form after successful submit (no edit mode for urgent vacation)
      setUrgentDates([]);
      setUrgentReason('');
    } catch (err) {
      setSubmitStatus({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitHelp(e) {
    e.preventDefault();
    if (!helpMessage.trim()) {
      setSubmitStatus({ type: 'error', message: 'Please describe what help you need.' });
      return;
    }
    setSubmitting(true);
    setSubmitStatus(null);
    try {
      await createServiceRequest({
        email: credentials.email,
        hrCode: credentials.hrCode,
        type: 'need_help',
        reason: helpMessage,
      });
      setSubmitStatus({
        type: 'success',
        message: 'Your request has been submitted successfully. You will receive a confirmation email shortly.',
      });
      // Clear form after successful submit (no edit mode for need help)
      setHelpMessage('');
    } catch (err) {
      setSubmitStatus({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  // --- Step 1: Credentials ---
  if (!credentialsConfirmed) {
    return (
      <div className="card">
        <h2 className="card-title">Employee Services</h2>
        <p style={{ marginBottom: 20, color: '#666' }}>
          Enter your credentials to access available services. Both fields are required.
        </p>
        <form onSubmit={handleCredentialsSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="required">Email</label>
              <input
                type="email"
                required
                placeholder="name@azka.com.eg"
                value={credentials.email}
                onChange={(e) =>
                  setCredentials((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label className="required">HR Code</label>
              <input
                type="text"
                required
                placeholder="e.g. 1230035"
                value={credentials.hrCode}
                onChange={(e) =>
                  setCredentials((prev) => ({ ...prev, hrCode: e.target.value }))
                }
              />
            </div>
          </div>
          {credError && (
            <div className="vacation-status error" style={{ marginTop: 10 }}>
              {credError}
            </div>
          )}
          <div style={{ marginTop: 20 }}>
            <button type="submit" className="btn btn-primary">
              Continue
            </button>
          </div>
        </form>
      </div>
    );
  }

  // --- Step 2: Service Selection ---
  if (!selectedService) {
    return (
      <div>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <h2 className="card-title" style={{ margin: 0 }}>Select a Service</h2>
            <button className="btn btn-secondary btn-sm" onClick={handleBackToCredentials}>
              Change Credentials
            </button>
          </div>
          <p style={{ color: '#666', marginBottom: 5 }}>
            Logged in as: <strong>{credentials.email}</strong> (HR: <strong>{credentials.hrCode}</strong>)
          </p>
          <p style={{ color: '#999', marginBottom: 25, fontSize: '0.9rem' }}>
            Choose the service you need from the options below.
          </p>

          <div className="service-cards-grid">
            {SERVICE_TYPES.map((svc) => (
              <div
                key={svc.key}
                className="service-card"
                style={{ borderTopColor: svc.color }}
                onClick={() => handleSelectService(svc.key)}
              >
                <h3 style={{ color: svc.color }}>{svc.label}</h3>
                <p>{svc.description}</p>
                <span className="service-card-arrow" style={{ color: svc.color }}>
                  &rarr;
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Step 3: Annual Vacation (existing form) ---
  if (selectedService === 'annual_vacation') {
    return (
      <div>
        <div className="card" style={{ padding: '15px 20px', marginBottom: 15 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: 0, color: '#666' }}>
              <strong>{credentials.email}</strong> (HR: {credentials.hrCode})
            </p>
            <button className="btn btn-secondary btn-sm" onClick={handleBack}>
              Back to Services
            </button>
          </div>
        </div>
        <VacationForm
          initialEmail={credentials.email}
          initialHrCode={credentials.hrCode}
        />
      </div>
    );
  }

  // --- Step 3: Work From Home ---
  if (selectedService === 'work_from_home') {
    const availableDays = getNext30Days();
    return (
      <div>
        <div className="card" style={{ padding: '15px 20px', marginBottom: 15 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: 0, color: '#666' }}>
              <strong>{credentials.email}</strong> (HR: {credentials.hrCode})
            </p>
            <button className="btn btn-secondary btn-sm" onClick={handleBack}>
              Back to Services
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmitWFH}>
          <div className="card">
            <h2 className="card-title" style={{ color: '#159895' }}>
              {isEditing ? 'Edit Work From Home Request' : 'Request Work From Home'}
            </h2>
            {isEditing && (
              <div className="vacation-status success" style={{ marginBottom: 15 }}>
                Editing your existing request. Modify and resubmit to update.
              </div>
            )}
            {loadingExisting && (
              <p style={{ color: 'var(--primary)', marginBottom: 15 }}>Checking for existing request...</p>
            )}
            <p style={{ marginBottom: 20, color: '#666' }}>
              Select the dates you would like to work from home. You can select multiple days within the next 30 days.
            </p>

            <div className="form-group">
              <label>Reason (optional)</label>
              <textarea
                placeholder="Describe why you need to work from home..."
                value={wfhReason}
                onChange={(e) => setWfhReason(e.target.value)}
                rows={3}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <h3 style={{ color: 'var(--primary)', marginBottom: 10, marginTop: 20 }}>
              Select Dates
            </h3>
            <div className="service-date-grid">
              {availableDays.map((day) => (
                <div
                  key={day}
                  className={`service-date-chip ${wfhDates.includes(day) ? 'selected' : ''}`}
                  onClick={() => toggleDate(day, wfhDates, setWfhDates)}
                >
                  {formatDate(day)}
                </div>
              ))}
            </div>

            {wfhDates.length > 0 && (
              <div style={{ marginTop: 15 }}>
                <p style={{ color: 'var(--primary)', fontWeight: 600 }}>
                  Selected: {wfhDates.length} day(s)
                </p>
                <div className="vacation-tags">
                  {wfhDates.map((day) => (
                    <span key={day} className="vacation-tag">
                      {formatDate(day)}
                      <button
                        type="button"
                        className="vacation-tag-remove"
                        onClick={() => setWfhDates(wfhDates.filter((d) => d !== day))}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {submitStatus && (
            <div className={`vacation-status ${submitStatus.type}`}>
              {submitStatus.message}
            </div>
          )}

          <div className="btn-group" style={{ marginTop: 15 }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || wfhDates.length === 0}
            >
              {submitting ? 'Submitting...' : isEditing ? `Update WFH Request (${wfhDates.length} days)` : `Submit WFH Request (${wfhDates.length} days)`}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleBack}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // --- Step 3: Urgent Vacation ---
  if (selectedService === 'urgent_vacation') {
    const availableDays = getNext3Days();
    return (
      <div>
        <div className="card" style={{ padding: '15px 20px', marginBottom: 15 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: 0, color: '#666' }}>
              <strong>{credentials.email}</strong> (HR: {credentials.hrCode})
            </p>
            <button className="btn btn-secondary btn-sm" onClick={handleBack}>
              Back to Services
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmitUrgent}>
          <div className="card">
            <h2 className="card-title" style={{ color: '#e67e22' }}>
              Request Urgent Vacation
            </h2>
            <p style={{ marginBottom: 20, color: '#666' }}>
              Select up to 3 days starting from today for your urgent vacation request.
            </p>

            <div className="form-group">
              <label className="required">Reason</label>
              <textarea
                required
                placeholder="Please explain the reason for your urgent vacation..."
                value={urgentReason}
                onChange={(e) => setUrgentReason(e.target.value)}
                rows={3}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <h3 style={{ color: 'var(--primary)', marginBottom: 10, marginTop: 20 }}>
              Select Dates (max 3 days)
            </h3>
            {availableDays.length === 0 ? (
              <p style={{ color: '#999' }}>No available days (upcoming days are weekends).</p>
            ) : (
              <div className="service-date-grid">
                {availableDays.map((day) => (
                  <div
                    key={day}
                    className={`service-date-chip urgent ${urgentDates.includes(day) ? 'selected' : ''}`}
                    onClick={() => toggleDate(day, urgentDates, setUrgentDates, 3)}
                  >
                    {formatDate(day)}
                  </div>
                ))}
              </div>
            )}

            {urgentDates.length > 0 && (
              <div style={{ marginTop: 15 }}>
                <p style={{ color: '#e67e22', fontWeight: 600 }}>
                  Selected: {urgentDates.length} day(s)
                </p>
                <div className="vacation-tags">
                  {urgentDates.map((day) => (
                    <span key={day} className="vacation-tag" style={{ background: 'linear-gradient(135deg, #e67e22, #f39c12)' }}>
                      {formatDate(day)}
                      <button
                        type="button"
                        className="vacation-tag-remove"
                        onClick={() => setUrgentDates(urgentDates.filter((d) => d !== day))}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {submitStatus && (
            <div className={`vacation-status ${submitStatus.type}`}>
              {submitStatus.message}
            </div>
          )}

          <div className="btn-group" style={{ marginTop: 15 }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ background: '#e67e22' }}
              disabled={submitting || urgentDates.length === 0}
            >
              {submitting ? 'Submitting...' : `Submit Urgent Vacation (${urgentDates.length} days)`}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleBack}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // --- Step 3: Need Help ---
  if (selectedService === 'need_help') {
    return (
      <div>
        <div className="card" style={{ padding: '15px 20px', marginBottom: 15 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: 0, color: '#666' }}>
              <strong>{credentials.email}</strong> (HR: {credentials.hrCode})
            </p>
            <button className="btn btn-secondary btn-sm" onClick={handleBack}>
              Back to Services
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmitHelp}>
          <div className="card">
            <h2 className="card-title" style={{ color: '#8e44ad' }}>
              Need Help
            </h2>
            <p style={{ marginBottom: 20, color: '#666' }}>
              Describe the issue or assistance you need. Your request will be sent to management for review.
            </p>

            <div className="form-group">
              <label className="required">How can we help you?</label>
              <textarea
                required
                placeholder="Please describe in detail what help or support you need..."
                value={helpMessage}
                onChange={(e) => setHelpMessage(e.target.value)}
                rows={6}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
          </div>

          {submitStatus && (
            <div className={`vacation-status ${submitStatus.type}`}>
              {submitStatus.message}
            </div>
          )}

          <div className="btn-group" style={{ marginTop: 15 }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ background: '#8e44ad' }}
              disabled={submitting || !helpMessage.trim()}
            >
              {submitting ? 'Submitting...' : 'Submit Help Request'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleBack}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return null;
}
