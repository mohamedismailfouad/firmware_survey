import { useState, useEffect, useMemo } from 'react';
import {
  fetchVacations,
  deleteVacation,
  fetchVacationStats,
  exportVacationsJSON,
  exportVacationsCSV,
} from '../data/vacationUtils';
import {
  fetchServiceRequests,
  deleteServiceRequest,
  updateServiceStatus,
  fetchServiceStats,
} from '../data/serviceUtils';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const TYPE_LABELS = {
  work_from_home: 'Work From Home',
  urgent_vacation: 'Urgent Vacation',
  need_help: 'Need Help',
};

const STATUS_COLORS = {
  pending: '#e67e22',
  approved: '#27ae60',
  rejected: '#e74c3c',
};

export default function VacationAdmin() {
  const [adminTab, setAdminTab] = useState('vacations');
  const [vacations, setVacations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [searchFilter, setSearchFilter] = useState('');
  const [viewingVacation, setViewingVacation] = useState(null);

  // Service requests state
  const [serviceRequests, setServiceRequests] = useState([]);
  const [serviceStats, setServiceStats] = useState(null);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceTypeFilter, setServiceTypeFilter] = useState('');
  const [serviceStatusFilter, setServiceStatusFilter] = useState('');
  const [serviceSearchFilter, setServiceSearchFilter] = useState('');
  const [viewingService, setViewingService] = useState(null);

  useEffect(() => {
    loadData();
  }, [yearFilter]);

  useEffect(() => {
    if (adminTab === 'services') {
      loadServiceData();
    }
  }, [adminTab, serviceTypeFilter, serviceStatusFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const [vacData, statsData] = await Promise.all([
        fetchVacations({ year: yearFilter }),
        fetchVacationStats(yearFilter),
      ]);
      setVacations(vacData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load vacation data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadServiceData() {
    setServiceLoading(true);
    try {
      const filters = {};
      if (serviceTypeFilter) filters.type = serviceTypeFilter;
      if (serviceStatusFilter) filters.status = serviceStatusFilter;
      const [reqData, statsData] = await Promise.all([
        fetchServiceRequests(filters),
        fetchServiceStats(),
      ]);
      setServiceRequests(reqData);
      setServiceStats(statsData);
    } catch (err) {
      console.error('Failed to load service requests:', err);
    } finally {
      setServiceLoading(false);
    }
  }

  async function handleDeleteService(id, email) {
    if (!confirm(`Delete service request from "${email}"?`)) return;
    try {
      await deleteServiceRequest(id);
      await loadServiceData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function handleStatusChange(id, newStatus) {
    try {
      await updateServiceStatus(id, newStatus);
      await loadServiceData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  const filteredServiceRequests = useMemo(() => {
    return serviceRequests.filter((r) => {
      if (serviceSearchFilter) {
        const s = serviceSearchFilter.toLowerCase();
        if (
          !r.email.toLowerCase().includes(s) &&
          !r.hrCode.toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    });
  }, [serviceRequests, serviceSearchFilter]);

  const filteredVacations = useMemo(() => {
    return vacations.filter((v) => {
      if (searchFilter) {
        const s = searchFilter.toLowerCase();
        if (
          !v.email.toLowerCase().includes(s) &&
          !v.hrCode.toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    });
  }, [vacations, searchFilter]);

  async function handleDelete(id, email) {
    if (!confirm(`Delete vacation request for "${email}"?`)) return;
    try {
      await deleteVacation(id);
      await loadData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function groupDaysByMonth(days) {
    const grouped = {};
    days.forEach((d) => {
      const date = new Date(d + 'T00:00:00');
      const key = `${MONTH_FULL[date.getMonth()]} ${date.getFullYear()}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(d);
    });
    return Object.entries(grouped);
  }

  if (loading && adminTab === 'vacations') {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <h3 style={{ color: 'var(--primary)' }}>Loading vacation data...</h3>
      </div>
    );
  }

  const maxMonthly = stats
    ? Math.max(...stats.monthlyDistribution, 1)
    : 1;

  return (
    <div>
      {/* Admin Sub-Tabs */}
      <div className="admin-sub-tabs">
        <button
          className={`admin-sub-tab ${adminTab === 'vacations' ? 'active' : ''}`}
          onClick={() => setAdminTab('vacations')}
        >
          Vacations
        </button>
        <button
          className={`admin-sub-tab ${adminTab === 'services' ? 'active' : ''}`}
          onClick={() => setAdminTab('services')}
        >
          Service Requests
        </button>
      </div>

    {adminTab === 'vacations' && (
    <div>
      {/* Stats Dashboard */}
      {stats && (
        <div className="card">
          <h2 className="card-title">Vacation Dashboard - {yearFilter}</h2>

          <div className="stats-grid">
            <div className="stat-card">
              <h3>{stats.totalSubmissions}</h3>
              <p>Total Submissions</p>
            </div>
            <div className="stat-card">
              <h3>{stats.totalVacationDays}</h3>
              <p>Total Vacation Days</p>
            </div>
            <div className="stat-card">
              <h3>{stats.averageDaysPerPerson}</h3>
              <p>Avg Days / Person</p>
            </div>
          </div>

          {/* Monthly Distribution Chart */}
          <div className="vacation-monthly-chart">
            <h3 style={{ color: 'var(--primary)', marginBottom: 15 }}>
              Monthly Distribution
            </h3>
            <div className="monthly-bars">
              {stats.monthlyDistribution.map((count, i) => (
                <div key={i} className="monthly-bar-col">
                  <div
                    className="monthly-bar"
                    style={{
                      height: `${Math.max((count / maxMonthly) * 150, count > 0 ? 10 : 0)}px`,
                    }}
                  >
                    {count > 0 && (
                      <span className="monthly-bar-label">{count}</span>
                    )}
                  </div>
                  <span className="monthly-bar-month">{MONTH_NAMES[i]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Overlap Alerts */}
          {stats.overlapDates.length > 0 && (
            <div className="vacation-overlap-section">
              <h3 style={{ color: 'var(--danger)', marginBottom: 15 }}>
                Vacation Overlap Alerts
              </h3>
              <p style={{ color: '#666', marginBottom: 15, fontSize: '0.9rem' }}>
                Dates where 2 or more team members are on vacation simultaneously.
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.9rem',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: 'var(--primary)',
                        color: 'white',
                      }}
                    >
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>
                        Date
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>
                        People
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>
                        Employees
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.overlapDates.slice(0, 10).map((o) => (
                      <tr
                        key={o.date}
                        style={{
                          borderBottom: '1px solid #eee',
                          background:
                            o.totalPeople >= 4
                              ? '#fff5f5'
                              : o.totalPeople >= 3
                                ? '#fff9e6'
                                : 'white',
                        }}
                      >
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                          {formatDate(o.date)}
                        </td>
                        <td
                          style={{
                            padding: '10px 12px',
                            textAlign: 'center',
                          }}
                        >
                          <span
                            className="vacation-day-badge"
                            style={{
                              background:
                                o.totalPeople >= 4
                                  ? 'var(--danger)'
                                  : o.totalPeople >= 3
                                    ? 'var(--warning)'
                                    : 'var(--accent)',
                            }}
                          >
                            {o.totalPeople}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {o.employees.join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top Employees */}
          {stats.topEmployees.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ color: 'var(--primary)', marginBottom: 15 }}>
                Top Vacation Days
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.9rem',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: 'var(--primary)',
                        color: 'white',
                      }}
                    >
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>
                        #
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>
                        Email
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>
                        HR Code
                      </th>
                      <th
                        style={{
                          padding: '10px 12px',
                          textAlign: 'center',
                        }}
                      >
                        Days
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topEmployees.map((emp, i) => (
                      <tr
                        key={emp.email}
                        style={{ borderBottom: '1px solid #eee' }}
                      >
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                          {i + 1}
                        </td>
                        <td style={{ padding: '10px 12px' }}>{emp.email}</td>
                        <td style={{ padding: '10px 12px' }}>{emp.hrCode}</td>
                        <td
                          style={{
                            padding: '10px 12px',
                            textAlign: 'center',
                          }}
                        >
                          <span className="vacation-day-badge">
                            {emp.totalDays}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters & List */}
      <div className="card">
        <h2 className="card-title">All Vacation Requests</h2>

        <div
          style={{
            background: '#f8f9fa',
            padding: 20,
            borderRadius: 12,
            marginBottom: 20,
          }}
        >
          <h3 style={{ marginBottom: 15, color: 'var(--primary)' }}>
            Filters
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Search</label>
              <input
                type="text"
                placeholder="Search by email or HR code..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Year</label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(Number(e.target.value))}
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <p style={{ color: '#666', marginBottom: 15 }}>
          Showing {filteredVacations.length} of {vacations.length} requests
        </p>

        {filteredVacations.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 40,
              color: '#999',
            }}
          >
            <h3>No vacation requests found</h3>
            <p>Try adjusting your filters or wait for employees to submit.</p>
          </div>
        ) : (
          <div className="engineer-list">
            {filteredVacations.map((v) => (
              <div className="engineer-card" key={v._id}>
                <div className="engineer-info">
                  <h4>
                    {v.email}{' '}
                    <span className="vacation-day-badge">
                      {v.totalDays} days
                    </span>
                  </h4>
                  <p>HR: {v.hrCode}</p>
                  <p style={{ color: '#999', fontSize: '0.85rem' }}>
                    Submitted:{' '}
                    {new Date(v.submittedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="engineer-actions">
                  <button
                    className="btn btn-sm"
                    style={{
                      background: 'var(--secondary)',
                      color: 'white',
                    }}
                    onClick={() => setViewingVacation(v)}
                  >
                    View
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{
                      background: 'var(--danger)',
                      color: 'white',
                    }}
                    onClick={() => handleDelete(v._id, v.email)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="btn-group" style={{ marginTop: 20 }}>
          <button
            className="btn btn-secondary"
            onClick={() => exportVacationsJSON(filteredVacations)}
            disabled={filteredVacations.length === 0}
          >
            Export JSON
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => exportVacationsCSV(filteredVacations)}
            disabled={filteredVacations.length === 0}
          >
            Export CSV
          </button>
          <button className="btn btn-primary" onClick={loadData}>
            Refresh
          </button>
        </div>
      </div>

      {/* View Modal */}
      {viewingVacation && (
        <div
          className="modal-overlay"
          onClick={() => setViewingVacation(null)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 600, maxHeight: '80vh', overflow: 'auto' }}
          >
            <h2
              style={{
                color: 'var(--primary)',
                marginBottom: 20,
                borderBottom: '2px solid var(--accent)',
                paddingBottom: 10,
              }}
            >
              Vacation Details
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 15,
                marginBottom: 20,
              }}
            >
              <div>
                <strong style={{ color: '#666' }}>Email</strong>
                <p style={{ margin: '4px 0' }}>{viewingVacation.email}</p>
              </div>
              <div>
                <strong style={{ color: '#666' }}>HR Code</strong>
                <p style={{ margin: '4px 0' }}>{viewingVacation.hrCode}</p>
              </div>
              <div>
                <strong style={{ color: '#666' }}>Year</strong>
                <p style={{ margin: '4px 0' }}>{viewingVacation.year}</p>
              </div>
              <div>
                <strong style={{ color: '#666' }}>Total Days</strong>
                <p style={{ margin: '4px 0' }}>
                  <span className="vacation-day-badge">
                    {viewingVacation.totalDays}
                  </span>
                </p>
              </div>
            </div>

            <h3 style={{ color: 'var(--primary)', marginBottom: 10 }}>
              Vacation Days
            </h3>
            {groupDaysByMonth(viewingVacation.vacationDays).map(
              ([month, days]) => (
                <div key={month} style={{ marginBottom: 15 }}>
                  <h4 style={{ color: 'var(--secondary)', marginBottom: 8 }}>
                    {month} ({days.length} days)
                  </h4>
                  <div className="vacation-tags">
                    {days.map((day) => (
                      <span
                        key={day}
                        className="vacation-tag"
                        style={{ cursor: 'default' }}
                      >
                        {formatDate(day)}
                      </span>
                    ))}
                  </div>
                </div>
              )
            )}

            <div style={{ textAlign: 'right', marginTop: 20 }}>
              <button
                className="btn btn-secondary"
                onClick={() => setViewingVacation(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    )}

    {/* ========== SERVICE REQUESTS TAB ========== */}
    {adminTab === 'services' && (
    <div>
      {/* Service Stats */}
      {serviceStats && (
        <div className="card">
          <h2 className="card-title">Service Requests Overview</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>{serviceStats.totalRequests}</h3>
              <p>Total Requests</p>
            </div>
            <div className="stat-card">
              <h3>{serviceStats.byStatus?.pending || 0}</h3>
              <p>Pending</p>
            </div>
            <div className="stat-card">
              <h3>{serviceStats.byStatus?.approved || 0}</h3>
              <p>Approved</p>
            </div>
            <div className="stat-card">
              <h3>{serviceStats.byStatus?.rejected || 0}</h3>
              <p>Rejected</p>
            </div>
          </div>

          {serviceStats.byType && Object.keys(serviceStats.byType).length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ color: 'var(--primary)', marginBottom: 15 }}>
                By Type
              </h3>
              <div className="stats-grid">
                {Object.entries(serviceStats.byType).map(([type, count]) => (
                  <div className="stat-card" key={type}>
                    <h3>{count}</h3>
                    <p>{TYPE_LABELS[type] || type}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Service Requests List */}
      <div className="card">
        <h2 className="card-title">All Service Requests</h2>

        <div
          style={{
            background: '#f8f9fa',
            padding: 20,
            borderRadius: 12,
            marginBottom: 20,
          }}
        >
          <h3 style={{ marginBottom: 15, color: 'var(--primary)' }}>Filters</h3>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <div className="form-group">
              <label>Search</label>
              <input
                type="text"
                placeholder="Search by email or HR code..."
                value={serviceSearchFilter}
                onChange={(e) => setServiceSearchFilter(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select
                value={serviceTypeFilter}
                onChange={(e) => setServiceTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="work_from_home">Work From Home</option>
                <option value="urgent_vacation">Urgent Vacation</option>
                <option value="need_help">Need Help</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                value={serviceStatusFilter}
                onChange={(e) => setServiceStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {serviceLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <h3 style={{ color: 'var(--primary)' }}>Loading service requests...</h3>
          </div>
        ) : (
          <>
            <p style={{ color: '#666', marginBottom: 15 }}>
              Showing {filteredServiceRequests.length} of {serviceRequests.length} requests
            </p>

            {filteredServiceRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                <h3>No service requests found</h3>
                <p>Try adjusting your filters.</p>
              </div>
            ) : (
              <div className="engineer-list">
                {filteredServiceRequests.map((r) => (
                  <div className="engineer-card" key={r._id}>
                    <div className="engineer-info">
                      <h4>
                        {r.email}{' '}
                        <span
                          className="vacation-day-badge"
                          style={{
                            background: STATUS_COLORS[r.status],
                          }}
                        >
                          {r.status}
                        </span>
                      </h4>
                      <p>
                        <strong>{TYPE_LABELS[r.type] || r.type}</strong> | HR: {r.hrCode}
                      </p>
                      {r.dates && r.dates.length > 0 && (
                        <p style={{ fontSize: '0.85rem', color: '#666' }}>
                          {r.dates.length} day(s): {r.dates.map((d) => formatDate(d)).join(', ')}
                        </p>
                      )}
                      <p style={{ color: '#999', fontSize: '0.85rem' }}>
                        Submitted:{' '}
                        {new Date(r.submittedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="engineer-actions">
                      <button
                        className="btn btn-sm"
                        style={{ background: 'var(--secondary)', color: 'white' }}
                        onClick={() => setViewingService(r)}
                      >
                        View
                      </button>
                      {r.status === 'pending' && (
                        <>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#27ae60', color: 'white' }}
                            onClick={() => handleStatusChange(r._id, 'approved')}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#e74c3c', color: 'white' }}
                            onClick={() => handleStatusChange(r._id, 'rejected')}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        className="btn btn-sm"
                        style={{ background: 'var(--danger)', color: 'white' }}
                        onClick={() => handleDeleteService(r._id, r.email)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="btn-group" style={{ marginTop: 20 }}>
              <button className="btn btn-primary" onClick={loadServiceData}>
                Refresh
              </button>
            </div>
          </>
        )}
      </div>

      {/* Service View Modal */}
      {viewingService && (
        <div
          className="modal-overlay"
          onClick={() => setViewingService(null)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 600, maxHeight: '80vh', overflow: 'auto' }}
          >
            <h2
              style={{
                color: 'var(--primary)',
                marginBottom: 20,
                borderBottom: '2px solid var(--accent)',
                paddingBottom: 10,
              }}
            >
              Service Request Details
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 15,
                marginBottom: 20,
              }}
            >
              <div>
                <strong style={{ color: '#666' }}>Email</strong>
                <p style={{ margin: '4px 0' }}>{viewingService.email}</p>
              </div>
              <div>
                <strong style={{ color: '#666' }}>HR Code</strong>
                <p style={{ margin: '4px 0' }}>{viewingService.hrCode}</p>
              </div>
              <div>
                <strong style={{ color: '#666' }}>Type</strong>
                <p style={{ margin: '4px 0', fontWeight: 600 }}>
                  {TYPE_LABELS[viewingService.type] || viewingService.type}
                </p>
              </div>
              <div>
                <strong style={{ color: '#666' }}>Status</strong>
                <p style={{ margin: '4px 0' }}>
                  <span
                    className="vacation-day-badge"
                    style={{ background: STATUS_COLORS[viewingService.status] }}
                  >
                    {viewingService.status}
                  </span>
                </p>
              </div>
            </div>

            {viewingService.dates && viewingService.dates.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ color: 'var(--primary)', marginBottom: 10 }}>
                  Requested Dates ({viewingService.dates.length} days)
                </h3>
                <div className="vacation-tags">
                  {viewingService.dates.map((day) => (
                    <span
                      key={day}
                      className="vacation-tag"
                      style={{ cursor: 'default' }}
                    >
                      {formatDate(day)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {viewingService.reason && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ color: 'var(--primary)', marginBottom: 10 }}>
                  Reason / Details
                </h3>
                <div
                  style={{
                    background: '#f8f9fa',
                    padding: 15,
                    borderRadius: 8,
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.6,
                  }}
                >
                  {viewingService.reason}
                </div>
              </div>
            )}

            <p style={{ color: '#999', fontSize: '0.85rem' }}>
              Submitted: {new Date(viewingService.submittedAt).toLocaleString()}
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              {viewingService.status === 'pending' && (
                <>
                  <button
                    className="btn btn-sm"
                    style={{ background: '#27ae60', color: 'white' }}
                    onClick={() => {
                      handleStatusChange(viewingService._id, 'approved');
                      setViewingService(null);
                    }}
                  >
                    Approve
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{ background: '#e74c3c', color: 'white' }}
                    onClick={() => {
                      handleStatusChange(viewingService._id, 'rejected');
                      setViewingService(null);
                    }}
                  >
                    Reject
                  </button>
                </>
              )}
              <button
                className="btn btn-secondary"
                onClick={() => setViewingService(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    )}
    </div>
  );
}
