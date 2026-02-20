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
    description: 'Request an urgent vacation (up to 2 working days)',
    color: '#e67e22',
  },
  {
    key: 'need_help',
    label: 'Need Help',
    description: 'Request assistance or support from management',
    color: '#8e44ad',
  },
  {
    key: 'my_requests',
    label: 'My Requests',
    description: 'View all your submitted requests and their current status',
    color: '#2c3e50',
  },
];

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function ServiceHub() {
  const [credentials, setCredentials] = useState({ email: '', hrCode: '' });
  const [credentialsConfirmed, setCredentialsConfirmed] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [credError, setCredError] = useState('');
  const [validating, setValidating] = useState(false);
  const [employeeInfo, setEmployeeInfo] = useState(null); // { name, department, experience }

  // WFH state
  const [wfhDates, setWfhDates] = useState([]);
  const [wfhReason, setWfhReason] = useState('');
  const [wfhAcknowledged, setWfhAcknowledged] = useState(false);

  // Urgent Vacation state
  const [urgentDates, setUrgentDates] = useState([]);
  const [urgentReason, setUrgentReason] = useState('');

  // Need Help state
  const [helpMessage, setHelpMessage] = useState('');

  // Edit mode tracking
  const [editingId, setEditingId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Skill matrix
  const [skillData, setSkillData] = useState(null);
  const [loadingSkills, setLoadingSkills] = useState(false);

  // My Requests
  const [myRequests, setMyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Shared
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  async function handleCredentialsSubmit(e) {
    e.preventDefault();
    setCredError('');
    if (!credentials.email || !credentials.hrCode) {
      setCredError('Both Email and HR Code are required.');
      return;
    }
    setValidating(true);
    try {
      const resp = await fetch(
        `${API_BASE}/api/employees/validate?email=${encodeURIComponent(credentials.email)}&hrCode=${encodeURIComponent(credentials.hrCode)}`
      );
      const data = await resp.json();
      if (!resp.ok || !data.valid) {
        setCredError(data.error || 'Employee not found. Please check your email and HR code.');
        return;
      }
      setEmployeeInfo({ name: data.name, department: data.department, experience: data.experience });
      setCredentialsConfirmed(true);

      // Fetch skill matrix in background
      setLoadingSkills(true);
      try {
        const surveyResp = await fetch(
          `${API_BASE}/api/surveys?email=${encodeURIComponent(credentials.email)}`
        );
        if (surveyResp.ok) {
          const surveys = await surveyResp.json();
          if (surveys.length > 0) {
            setSkillData(surveys[0]);
          }
        }
      } catch {
        // Skill data is optional
      } finally {
        setLoadingSkills(false);
      }
    } catch (err) {
      setCredError('Failed to validate credentials. Please try again.');
    } finally {
      setValidating(false);
    }
  }

  function handleBack() {
    setSelectedService(null);
    setSubmitStatus(null);
  }

  function handleBackToCredentials() {
    setCredentialsConfirmed(false);
    setSelectedService(null);
    setSubmitStatus(null);
    setEmployeeInfo(null);
    setSkillData(null);
    resetForms();
  }

  function resetForms() {
    setWfhDates([]);
    setWfhReason('');
    setWfhAcknowledged(false);
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

    // Load request history for "my_requests" view
    if (key === 'my_requests') {
      setLoadingRequests(true);
      try {
        const requests = await fetchServiceRequests({ email: credentials.email });
        setMyRequests(requests);
      } catch {
        setMyRequests([]);
      } finally {
        setLoadingRequests(false);
      }
      return;
    }

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
  // Format date as YYYY-MM-DD using LOCAL time (not UTC) to avoid timezone shift
  function toLocalDateStr(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function getNext30Days() {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      // WFH allows any day including weekends
      days.push(toLocalDateStr(d));
    }
    return days;
  }

  function getNextWorkdays(count) {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let i = 0;
    while (days.length < count) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dayOfWeek = d.getDay();
      // Skip Friday (5) and Saturday (6) - weekends
      if (dayOfWeek !== 5 && dayOfWeek !== 6) {
        days.push(toLocalDateStr(d));
      }
      i++;
      if (i > 14) break; // Safety limit
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

  // --- Skill matrix helpers ---
  const SKILL_LEVELS = {
    expert: { label: 'Expert', color: '#27ae60', bg: '#e8f8ef', icon: '★★★★' },
    proficient: { label: 'Proficient', color: '#2980b9', bg: '#e8f4fd', icon: '★★★' },
    basic: { label: 'Basic', color: '#f39c12', bg: '#fef9e7', icon: '★★' },
    learning: { label: 'Learning', color: '#e67e22', bg: '#fdf2e9', icon: '★' },
    none: { label: 'None', color: '#95a5a6', bg: '#f2f3f4', icon: '' },
  };

  const SKILL_CATEGORIES = [
    { name: 'Metering & Protocol', keys: ['Metering', 'DLMS', 'ANSI', 'IEC62056-21', 'Tariff', 'Calendar', 'LoadProfile', 'Predictor', 'Limiter', 'Disconnector'] },
    { name: 'Communication', keys: ['RF_APP', 'RF_Drv', 'RFID_APP', 'RFID_Drv', 'PLC', 'GPRS_APP', 'GPRS_Drv', 'IR', 'WiFi', 'Bluetooth', 'NB_IoT', 'Console'] },
    { name: 'Security', keys: ['Security', 'AES', 'SHA', 'MD5', 'RSA', 'ECC', 'HMAC', 'ECDSA', 'TLS_SSL', 'KeyManagement', 'SecureBoot'] },
    { name: 'System & Memory', keys: ['Bootloader', 'RTOS', 'LowPowerMode', 'PowerManagement', 'EEPROM', 'FLASH', 'BinaryDelta', 'Compression'] },
    { name: 'Peripherals & HW', keys: ['Display_APP', 'Display_Drv', 'Keypad', 'TouchKeypad', 'Tampers', 'GPIO', 'UART', 'SPI', 'I2C', 'ADC', 'Timer', 'DMA', 'Interrupt', 'RTC', 'Watchdog', 'CRC'] },
  ];

  function getSkillLevel(survey, skillName) {
    const skills = survey.skills instanceof Map ? Object.fromEntries(survey.skills) : (survey.skills || {});
    const custom = survey.customSkills instanceof Map ? Object.fromEntries(survey.customSkills) : (survey.customSkills || {});
    return skills[skillName] || custom[skillName] || 'none';
  }

  function calculateGradeFromSurvey(survey) {
    const skills = survey.skills instanceof Map ? Object.fromEntries(survey.skills) : (survey.skills || {});
    const custom = survey.customSkills instanceof Map ? Object.fromEntries(survey.customSkills) : (survey.customSkills || {});
    const all = { ...skills, ...custom };
    const vals = { none: 0, learning: 1, basic: 2, proficient: 3, expert: 4 };
    const values = Object.values(all).map((v) => vals[v] || 0);
    if (values.length === 0) return { percentage: 0, grade: 'F' };
    const total = values.reduce((a, b) => a + b, 0);
    const max = values.length * 4;
    const pct = Math.round((total / max) * 100);
    let grade = 'F';
    if (pct >= 80) grade = 'A';
    else if (pct >= 60) grade = 'B';
    else if (pct >= 40) grade = 'C';
    else if (pct >= 20) grade = 'D';
    return { percentage: pct, grade };
  }

  function renderSkillMatrix() {
    if (loadingSkills) {
      return (
        <div className="card" style={{ marginTop: 15, textAlign: 'center', padding: 20 }}>
          <p style={{ color: '#999' }}>Loading skill matrix...</p>
        </div>
      );
    }
    if (!skillData) return null;

    const { percentage, grade } = calculateGradeFromSurvey(skillData);
    const gradeColors = { A: '#27ae60', B: '#2980b9', C: '#f39c12', D: '#e67e22', F: '#e74c3c' };

    // Gather custom skills not in standard categories
    const custom = skillData.customSkills instanceof Map ? Object.fromEntries(skillData.customSkills) : (skillData.customSkills || {});
    const allStandardKeys = SKILL_CATEGORIES.flatMap((c) => c.keys);
    const customKeys = Object.keys(custom).filter((k) => !allStandardKeys.includes(k));

    return (
      <div className="card" style={{ marginTop: 15 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
          <h3 style={{ color: 'var(--primary)', margin: 0 }}>Your Skill Matrix</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '0.85rem', color: '#666' }}>Score: {percentage}%</span>
            <span style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: 20,
              fontWeight: 700,
              fontSize: '1rem',
              color: '#fff',
              background: gradeColors[grade] || '#999',
            }}>
              Grade {grade}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 15, fontSize: '0.8rem' }}>
          {Object.entries(SKILL_LEVELS).filter(([k]) => k !== 'none').map(([key, info]) => (
            <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: info.color, display: 'inline-block' }} />
              {info.label}
            </span>
          ))}
        </div>

        {SKILL_CATEGORIES.map((cat) => {
          const activeSkills = cat.keys.filter((k) => getSkillLevel(skillData, k) !== 'none');
          if (activeSkills.length === 0) return null;
          return (
            <div key={cat.name} style={{ marginBottom: 12 }}>
              <h4 style={{ color: '#555', margin: '0 0 6px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {cat.name}
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {cat.keys.map((skill) => {
                  const level = getSkillLevel(skillData, skill);
                  if (level === 'none') return null;
                  const info = SKILL_LEVELS[level];
                  return (
                    <span
                      key={skill}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: '0.8rem',
                        background: info.bg,
                        color: info.color,
                        border: `1px solid ${info.color}30`,
                        fontWeight: 500,
                      }}
                      title={`${skill}: ${info.label}`}
                    >
                      {skill.replace(/_/g, ' ')} {info.icon}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}

        {customKeys.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ color: '#555', margin: '0 0 6px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Custom Skills
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {customKeys.map((skill) => {
                const level = custom[skill];
                const info = SKILL_LEVELS[level] || SKILL_LEVELS.none;
                if (level === 'none') return null;
                return (
                  <span
                    key={skill}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: '0.8rem',
                      background: info.bg,
                      color: info.color,
                      border: `1px solid ${info.color}30`,
                      fontWeight: 500,
                    }}
                    title={`${skill}: ${info.label}`}
                  >
                    {skill.replace(/_/g, ' ')} {info.icon}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {skillData.projectName && (
          <p style={{ margin: '10px 0 0', fontSize: '0.85rem', color: '#888' }}>
            Current Project: <strong style={{ color: '#555' }}>{skillData.projectName}</strong>
          </p>
        )}
      </div>
    );
  }

  // --- Step 1: Credentials ---
  if (!credentialsConfirmed) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: 15 }}>
          <img src="/azka_logo.png" alt="AZKA" style={{ height: 60, borderRadius: 12, marginBottom: 10 }} />
        </div>
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
            <button type="submit" className="btn btn-primary" disabled={validating}>
              {validating ? 'Validating...' : 'Continue'}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src="/azka_logo.png" alt="AZKA" style={{ height: 36, borderRadius: 8 }} />
              <h2 className="card-title" style={{ margin: 0 }}>Select a Service</h2>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleBackToCredentials}>
              Change Credentials
            </button>
          </div>
          {employeeInfo && (
            <p style={{ color: 'var(--primary)', marginBottom: 5, fontSize: '1.05rem' }}>
              Welcome, <strong>{employeeInfo.name}</strong> ({employeeInfo.department}{employeeInfo.experience != null ? `, ${employeeInfo.experience} yr${employeeInfo.experience !== 1 ? 's' : ''} exp` : ''})
            </p>
          )}
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

        {renderSkillMatrix()}
      </div>
    );
  }

  // --- Step 3: Annual Vacation (existing form) ---
  if (selectedService === 'annual_vacation') {
    return (
      <div>
        <div className="card" style={{ padding: '15px 20px', marginBottom: 15 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/azka_logo.png" alt="AZKA" style={{ height: 28, borderRadius: 6 }} />
              <p style={{ margin: 0, color: '#666' }}>
                <strong>{employeeInfo?.name || credentials.email}</strong> &mdash; {employeeInfo?.department || ''} (HR: {credentials.hrCode})
              </p>
            </div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/azka_logo.png" alt="AZKA" style={{ height: 28, borderRadius: 6 }} />
              <p style={{ margin: 0, color: '#666' }}>
                <strong>{employeeInfo?.name || credentials.email}</strong> &mdash; {employeeInfo?.department || ''} (HR: {credentials.hrCode})
              </p>
            </div>
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

          <div className="card" style={{ marginTop: 15 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', color: '#333' }}>
              <input
                type="checkbox"
                checked={wfhAcknowledged}
                onChange={(e) => setWfhAcknowledged(e.target.checked)}
                style={{ marginTop: 4, transform: 'scale(1.2)' }}
              />
              <span style={{ lineHeight: 1.5 }}>
                I acknowledge that I clearly understand my assigned tasks for the work-from-home day(s),
                I have prepared all required tools and equipment, and I commit to reviewing and reporting
                my completed work at the end of each day.
              </span>
            </label>
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
              disabled={submitting || wfhDates.length === 0 || !wfhAcknowledged}
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
    const availableDays = getNextWorkdays(2);
    return (
      <div>
        <div className="card" style={{ padding: '15px 20px', marginBottom: 15 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/azka_logo.png" alt="AZKA" style={{ height: 28, borderRadius: 6 }} />
              <p style={{ margin: 0, color: '#666' }}>
                <strong>{employeeInfo?.name || credentials.email}</strong> &mdash; {employeeInfo?.department || ''} (HR: {credentials.hrCode})
              </p>
            </div>
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
              Select up to 2 working days for your urgent vacation request. Fridays and Saturdays (weekends) are excluded.
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
              Select Dates (max 2 working days)
            </h3>
            {availableDays.length === 0 ? (
              <p style={{ color: '#999' }}>No available working days found.</p>
            ) : (
              <div className="service-date-grid">
                {availableDays.map((day) => (
                  <div
                    key={day}
                    className={`service-date-chip urgent ${urgentDates.includes(day) ? 'selected' : ''}`}
                    onClick={() => toggleDate(day, urgentDates, setUrgentDates, 2)}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/azka_logo.png" alt="AZKA" style={{ height: 28, borderRadius: 6 }} />
              <p style={{ margin: 0, color: '#666' }}>
                <strong>{employeeInfo?.name || credentials.email}</strong> &mdash; {employeeInfo?.department || ''} (HR: {credentials.hrCode})
              </p>
            </div>
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

  // --- Step 3: My Requests ---
  if (selectedService === 'my_requests') {
    const statusColors = {
      pending: { bg: '#fff3cd', color: '#856404', label: 'Pending' },
      approved: { bg: '#d4edda', color: '#155724', label: 'Approved' },
      rejected: { bg: '#f8d7da', color: '#721c24', label: 'Rejected' },
    };
    const typeLabels = {
      work_from_home: 'Work From Home',
      urgent_vacation: 'Urgent Vacation',
      need_help: 'Need Help',
    };
    const typeColors = {
      work_from_home: '#159895',
      urgent_vacation: '#e67e22',
      need_help: '#8e44ad',
    };

    return (
      <div>
        <div className="card" style={{ padding: '15px 20px', marginBottom: 15 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/azka_logo.png" alt="AZKA" style={{ height: 28, borderRadius: 6 }} />
              <p style={{ margin: 0, color: '#666' }}>
                <strong>{employeeInfo?.name || credentials.email}</strong> &mdash; {employeeInfo?.department || ''} (HR: {credentials.hrCode})
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleBack}>
              Back to Services
            </button>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title" style={{ color: '#2c3e50' }}>My Requests</h2>
          <p style={{ marginBottom: 20, color: '#666' }}>
            View the status of all your submitted service requests.
          </p>

          {loadingRequests ? (
            <p style={{ textAlign: 'center', color: '#999', padding: 20 }}>Loading your requests...</p>
          ) : myRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
              <p style={{ fontSize: '1.1rem' }}>No requests found.</p>
              <p>Submit a request from the services menu to see it here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {myRequests.map((req) => {
                const status = statusColors[req.status] || statusColors.pending;
                const typeColor = typeColors[req.type] || '#666';
                return (
                  <div
                    key={req._id}
                    style={{
                      border: '1px solid #e0e0e0',
                      borderLeft: `4px solid ${typeColor}`,
                      borderRadius: 8,
                      padding: 15,
                      background: '#fafafa',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, color: typeColor, fontSize: '0.95rem' }}>
                        {typeLabels[req.type] || req.type}
                      </span>
                      <span
                        style={{
                          padding: '3px 12px',
                          borderRadius: 20,
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          background: status.bg,
                          color: status.color,
                        }}
                      >
                        {status.label}
                      </span>
                    </div>

                    {req.dates && req.dates.length > 0 && (
                      <div style={{ marginBottom: 6 }}>
                        <span style={{ fontSize: '0.85rem', color: '#555' }}>
                          <strong>Dates:</strong>{' '}
                          {req.dates.map((d) => {
                            const date = new Date(d + 'T00:00:00');
                            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                          }).join(', ')}
                          {' '}({req.dates.length} day{req.dates.length !== 1 ? 's' : ''})
                        </span>
                      </div>
                    )}

                    {req.reason && (
                      <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#666' }}>
                        <strong>Reason:</strong> {req.reason}
                      </p>
                    )}

                    {req.adminNote && (
                      <p style={{ margin: '4px 0', fontSize: '0.85rem', color: status.color, fontStyle: 'italic' }}>
                        <strong>Admin Note:</strong> {req.adminNote}
                      </p>
                    )}

                    <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#999' }}>
                      Submitted: {new Date(req.submittedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
