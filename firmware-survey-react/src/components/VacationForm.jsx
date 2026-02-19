import { useState, useEffect, useRef } from 'react';
import VacationCalendar from './VacationCalendar';
import { createVacation, fetchVacations } from '../data/vacationUtils';

export default function VacationForm({ initialEmail = '', initialHrCode = '' }) {
  const [form, setForm] = useState({
    email: initialEmail,
    hrCode: initialHrCode,
  });
  const [selectedDays, setSelectedDays] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const autoLoaded = useRef(false);

  const currentYear = new Date().getFullYear();

  // Auto-load existing vacation when credentials are provided from ServiceHub
  useEffect(() => {
    if (initialEmail && initialHrCode && !autoLoaded.current) {
      autoLoaded.current = true;
      handleLoadExisting();
    }
  }, [initialEmail, initialHrCode]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleToggleDay(dateStr) {
    setSelectedDays((prev) =>
      prev.includes(dateStr)
        ? prev.filter((d) => d !== dateStr)
        : [...prev, dateStr].sort()
    );
  }

  function handleRemoveDay(dateStr) {
    setSelectedDays((prev) => prev.filter((d) => d !== dateStr));
  }

  function clearAll() {
    setSelectedDays([]);
    setSubmitStatus(null);
    // Don't exit editMode - the record still exists in DB.
    // User is just clearing the calendar selection, not canceling the edit.
  }

  function resetForm() {
    setForm({ email: initialEmail || '', hrCode: initialHrCode || '' });
    setSelectedDays([]);
    setSubmitStatus(null);
    setEditMode(false);
  }

  async function handleLoadExisting() {
    if (!form.email && !form.hrCode) {
      setSubmitStatus({
        type: 'error',
        message: 'Please enter your Email or HR Code to load your existing vacation.',
      });
      return;
    }

    setLoadingExisting(true);
    setSubmitStatus(null);
    try {
      const filters = { year: currentYear };
      if (form.email) filters.email = form.email;

      const results = await fetchVacations(filters);

      let match = null;
      if (form.email) {
        match = results.find(
          (v) => v.email.toLowerCase() === form.email.toLowerCase()
        );
      }
      if (!match && form.hrCode) {
        const allResults = await fetchVacations({ year: currentYear });
        match = allResults.find(
          (v) => v.hrCode.toLowerCase() === form.hrCode.toLowerCase()
        );
      }

      if (match) {
        setForm({
          email: match.email,
          hrCode: match.hrCode,
        });
        setSelectedDays([...match.vacationDays].sort());
        setEditMode(true);
        setSubmitStatus({
          type: 'success',
          message: `Loaded your existing vacation request (${match.totalDays} days). You can now edit your days and resubmit.`,
        });
      } else if (!initialEmail) {
        // Only show "not found" error when user manually clicked Load button
        setSubmitStatus({
          type: 'error',
          message: 'No existing vacation request found for this email/HR code. You can submit a new one.',
        });
      }
      // If auto-loading from ServiceHub and no match found, stay silent - let user create new
    } catch (err) {
      setSubmitStatus({ type: 'error', message: err.message });
    } finally {
      setLoadingExisting(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (selectedDays.length === 0) {
      setSubmitStatus({
        type: 'error',
        message: 'Please select at least one vacation day.',
      });
      return;
    }

    setSubmitting(true);
    setSubmitStatus(null);
    try {
      const result = await createVacation({
        ...form,
        year: currentYear,
        vacationDays: selectedDays,
      });

      const isUpdate = result.isUpdate;
      setSubmitStatus({
        type: 'success',
        message: isUpdate
          ? `Vacation request updated successfully! ${selectedDays.length} day(s) recorded. Confirmation emails sent.`
          : `Vacation request submitted successfully! ${selectedDays.length} day(s) recorded. Confirmation emails sent to you and the admin.`,
      });
      // Stay in edit mode - record now exists in the database,
      // so any future submit is an update. Keep days visible.
      setEditMode(true);
    } catch (err) {
      setSubmitStatus({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  function getMonthSummary() {
    const months = {};
    selectedDays.forEach((d) => {
      const date = new Date(d + 'T00:00:00');
      const key = date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
      months[key] = (months[key] || 0) + 1;
    });
    return Object.entries(months);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="card">
        <h2 className="card-title">
          {editMode ? 'Edit Vacation Request' : 'Annual Vacation Request'} {currentYear}
        </h2>
        <p style={{ marginBottom: 20, color: '#666' }}>
          {editMode
            ? 'Edit your vacation days below. Add or remove days, then click Update to save changes.'
            : 'Select your planned vacation days for ' + currentYear + '. A confirmation email will be sent to you and the admin upon submission.'}
        </p>

        {editMode && !submitStatus && (
          <div className="vacation-status success" style={{ marginBottom: 20 }}>
            Editing mode - Modify your days and click &quot;Update Vacation Request&quot; to save.
          </div>
        )}

        <div className="form-grid">
          <div className="form-group">
            <label className="required">Email</label>
            <input
              type="email"
              required
              placeholder="name@azka.com.eg"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              disabled={editMode || !!initialEmail}
            />
          </div>
          <div className="form-group">
            <label className="required">HR Code</label>
            <input
              type="text"
              required
              placeholder="e.g. 1230035"
              value={form.hrCode}
              onChange={(e) => updateField('hrCode', e.target.value)}
              disabled={editMode || !!initialHrCode}
            />
          </div>
        </div>

        {!editMode && (
          <div style={{ marginTop: 15, paddingTop: 15, borderTop: '1px solid #eee' }}>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: 10 }}>
              Already submitted? Load your existing request to edit it.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleLoadExisting}
              disabled={loadingExisting}
              style={{ fontSize: '0.9rem' }}
            >
              {loadingExisting ? 'Loading...' : 'Load My Existing Vacation'}
            </button>
          </div>
        )}

        {editMode && (
          <div style={{ marginTop: 15 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={resetForm}
              style={{ fontSize: '0.85rem' }}
            >
              Cancel Editing
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">Select Vacation Days</h2>
        <p style={{ marginBottom: 15, color: '#666', fontSize: '0.9rem' }}>
          Click on dates to select or deselect them. Only future dates can be
          selected.
        </p>

        <VacationCalendar
          selectedDays={selectedDays}
          onToggleDay={handleToggleDay}
          year={currentYear}
        />

        <div className="vacation-summary">
          <div className="stats-grid" style={{ marginTop: 20 }}>
            <div className="stat-card">
              <h3>{selectedDays.length}</h3>
              <p>Total Days Selected</p>
            </div>
            {getMonthSummary().map(([month, count]) => (
              <div className="stat-card" key={month}>
                <h3>{count}</h3>
                <p>{month}</p>
              </div>
            ))}
          </div>
        </div>

        {selectedDays.length > 0 && (
          <div className="vacation-days-list">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <h3 style={{ color: 'var(--primary)', margin: 0 }}>
                Selected Days ({selectedDays.length}):
              </h3>
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  background: 'var(--danger)',
                  color: 'white',
                  fontSize: '0.8rem',
                }}
                onClick={clearAll}
              >
                Clear All
              </button>
            </div>
            <div className="vacation-tags">
              {selectedDays.map((day) => (
                <span key={day} className="vacation-tag">
                  {formatDate(day)}
                  <button
                    type="button"
                    className="vacation-tag-remove"
                    onClick={() => handleRemoveDay(day)}
                    title="Remove this day"
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
          disabled={submitting || selectedDays.length === 0}
        >
          {submitting
            ? 'Submitting...'
            : editMode
              ? `Update Vacation Request (${selectedDays.length} days)`
              : `Submit Vacation Request (${selectedDays.length} days)`}
        </button>
        <button type="button" className="btn btn-secondary" onClick={clearAll}>
          Clear Selection
        </button>
      </div>
    </form>
  );
}
