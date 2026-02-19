import { useState } from 'react';
import VacationCalendar from './VacationCalendar';
import { DEPARTMENTS } from '../data/constants';
import { createVacation } from '../data/vacationUtils';

export default function VacationForm() {
  const [form, setForm] = useState({
    email: '',
    fullName: '',
    hrCode: '',
    department: '',
  });
  const [selectedDays, setSelectedDays] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const currentYear = new Date().getFullYear();

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
      setForm({ email: '', fullName: '', hrCode: '', department: '' });
      setSelectedDays([]);
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
        <h2 className="card-title">Annual Vacation Request {currentYear}</h2>
        <p style={{ marginBottom: 20, color: '#666' }}>
          Select your planned vacation days for {currentYear}. A confirmation
          email will be sent to you and the admin upon submission.
        </p>

        <div className="form-grid">
          <div className="form-group">
            <label className="required">Full Name</label>
            <input
              type="text"
              required
              placeholder="Enter your full name"
              value={form.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="required">Email</label>
            <input
              type="email"
              required
              placeholder="name@azka.com.eg"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
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
            />
          </div>
          <div className="form-group">
            <label className="required">Department</label>
            <select
              required
              value={form.department}
              onChange={(e) => updateField('department', e.target.value)}
            >
              <option value="">Select Department</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
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
          {submitting ? 'Submitting...' : `Submit Vacation Request (${selectedDays.length} days)`}
        </button>
        <button type="button" className="btn btn-secondary" onClick={clearAll}>
          Clear Selection
        </button>
      </div>
    </form>
  );
}
