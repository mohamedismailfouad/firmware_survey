import { useState, useEffect, useMemo, Fragment } from 'react';
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

// ============ EMPLOYEE REGISTRY (for matrix display names & departments) ============
const EMPLOYEE_MAP = {
  'omar.mahmoud@azka.com.eg': { name: 'Omar Mahmoud', dept: 'DLMS' },
  'mohamed.hamed@azka.com.eg': { name: 'Mohamed Elsayed', dept: 'DLMS' },
  'hesham.galal@azka.com.eg': { name: 'Hesham Galal', dept: 'DLMS' },
  'abdelrahman.moussa@azka.com.eg': { name: 'Abdelrahman Moussa', dept: 'DLMS' },
  'ahmed.hamamsy@azka.com.eg': { name: 'Ahmed ElHamamsy', dept: 'DLMS' },
  'saeed.elfayoumy@azka.com.eg': { name: 'Saeed Elfayoumy', dept: 'DLMS' },
  'ahmed.hassan@azka.com.eg': { name: 'Ahmed Hassan', dept: 'DLMS' },
  'nourhan.refaie@azka.com.eg': { name: 'Nourhan Alrefaei', dept: 'DLMS' },
  'mervat.abdelrahman@azka.com.eg': { name: 'Mervat Abdelrahman', dept: 'Flow' },
  'ali.morsy@azka.com.eg': { name: 'Ali Morsy', dept: 'Flow' },
  'hossam.abdullah@azka.com.eg': { name: 'Hossam Abdullah', dept: 'Flow' },
  'mohamed.taman@azka.com.eg': { name: 'Mohamed Taman', dept: 'Flow' },
  'mohamed.merdan@azka.com.eg': { name: 'Mohamed Merdan', dept: 'Flow' },
  'mohamed.shaheen@azka.com.eg': { name: 'Mohamed Shahin', dept: 'Flow' },
  'nahla.hussin@azka.com.eg': { name: 'Nahla Hussien', dept: 'Flow' },
  'ahmed.elsayed@azka.com.eg': { name: 'Ahmed ElSayed', dept: 'Flow' },
  'muaaz.rashad@azka.com.eg': { name: 'Muaaz Rashad', dept: 'Flow' },
  'samar.mohamed@azka.com.eg': { name: 'Samar Mohamed', dept: 'Flow' },
  'moustafa.abdelwahab@azka.com.eg': { name: 'Mostafa Abdelwahab', dept: 'Flow' },
  'ahmed.lotfy@azka.com.eg': { name: 'Ahmed Lotfy', dept: 'Flow' },
  'ahmed.gaber@azka.com.eg': { name: 'Ahmed Gaber', dept: 'Prepaid' },
  'ahmed.elhossiny@azka.com.eg': { name: 'Ahmed Elhossiny', dept: 'Prepaid' },
  'ahmed.abdelnaby@azka.com.eg': { name: 'Ahmed Abdelnaby', dept: 'Prepaid' },
  'nour.ashraf@azka.com.eg': { name: 'Nour Ashraf', dept: 'Prepaid' },
  'hassan.hafez@azka.com.eg': { name: 'Hassan Hafez', dept: 'Prepaid' },
  'ahmed.abdeltawab@azka.com.eg': { name: 'Ahmed Elzoughby', dept: 'R&D' },
  'mohamed.medhat@azka.com.eg': { name: 'Mohamed Medhat', dept: 'R&D' },
  'mahmoud.youness@azka.com.eg': { name: 'Mahmoud Youness', dept: 'R&D' },
  'saif.eldin@azka.com.eg': { name: 'Sief Eldin', dept: 'R&D' },
  'mohamed.magdy@azka.com.eg': { name: 'Mohamed Magdy', dept: 'R&D' },
  'abdelrahman.kadah@azka.com.eg': { name: 'Abdelrahman Kadah', dept: 'R&D' },
  'moemen.ahmed@azka.com.eg': { name: 'Momen Ahmed', dept: 'R&D' },
  'mohamed.essa@azka.com.eg': { name: 'Mohamed Essa', dept: 'Management' },
};

const DEPT_COLORS = {
  DLMS: '#1a5f7a',
  Flow: '#159895',
  Prepaid: '#e67e22',
  'R&D': '#8e44ad',
  Management: '#2c3e50',
};

const DEPT_ORDER = ['DLMS', 'Flow', 'Prepaid', 'R&D', 'Management'];

// ============ VACATION MATRIX COMPONENT ============
function VacationMatrix({ vacations, year, month, onMonthChange, onYearChange, tooltip, onTooltip }) {
  // Build a lookup: dateStr -> [emails]
  const dateMap = useMemo(() => {
    const map = {};
    vacations.forEach((v) => {
      v.vacationDays.forEach((d) => {
        if (!map[d]) map[d] = [];
        map[d].push(v.email);
      });
    });
    return map;
  }, [vacations]);

  // Build per-employee vacation set
  const employeeVacDays = useMemo(() => {
    const map = {};
    vacations.forEach((v) => {
      if (!map[v.email]) map[v.email] = new Set();
      v.vacationDays.forEach((d) => map[v.email].add(d));
    });
    return map;
  }, [vacations]);

  // Get all employees who have vacations, grouped by department
  const groupedEmployees = useMemo(() => {
    const emails = Object.keys(employeeVacDays);
    const groups = {};
    DEPT_ORDER.forEach((dept) => { groups[dept] = []; });

    emails.forEach((email) => {
      const info = EMPLOYEE_MAP[email.toLowerCase()];
      const dept = info?.dept || 'Other';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push({ email, name: info?.name || email.split('@')[0], dept });
    });

    return DEPT_ORDER
      .filter((dept) => groups[dept]?.length > 0)
      .map((dept) => ({ dept, employees: groups[dept] }));
  }, [employeeVacDays]);

  // Get days in the selected month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Check if a day is a weekend (Fri=5, Sat=6)
  function isWeekend(day) {
    const d = new Date(year, month, day);
    const dow = d.getDay();
    return dow === 5 || dow === 6;
  }

  // Format date to YYYY-MM-DD
  function toDateStr(day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Count total vacation days for employee in this month
  function monthTotal(email) {
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = toDateStr(d);
      if (employeeVacDays[email]?.has(ds)) count++;
    }
    return count;
  }

  // Get overlap count for a day
  function overlapCount(day) {
    const ds = toDateStr(day);
    return dateMap[ds]?.length || 0;
  }

  // Compute month-level stats
  const monthStats = useMemo(() => {
    let totalDays = 0;
    let peakOverlap = 0;
    let peakDate = '';
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = toDateStr(d);
      const count = dateMap[ds]?.length || 0;
      totalDays += count;
      if (count > peakOverlap) {
        peakOverlap = count;
        peakDate = ds;
      }
    }
    const employeesOnVac = new Set();
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = toDateStr(d);
      (dateMap[ds] || []).forEach((e) => employeesOnVac.add(e));
    }
    return { totalDays, peakOverlap, peakDate, uniqueEmployees: employeesOnVac.size };
  }, [dateMap, daysInMonth, month, year]);

  // Annual summary per employee
  const annualSummary = useMemo(() => {
    return Object.entries(employeeVacDays).map(([email, daysSet]) => {
      const info = EMPLOYEE_MAP[email.toLowerCase()];
      return {
        email,
        name: info?.name || email.split('@')[0],
        dept: info?.dept || 'Other',
        total: daysSet.size,
        byMonth: MONTH_NAMES.map((_, mi) => {
          let count = 0;
          const dim = new Date(year, mi + 1, 0).getDate();
          for (let d = 1; d <= dim; d++) {
            const ds = `${year}-${String(mi + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            if (daysSet.has(ds)) count++;
          }
          return count;
        }),
      };
    }).sort((a, b) => b.total - a.total);
  }, [employeeVacDays, year]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <>
      {/* Month Stats Cards */}
      <div className="card">
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <span>Vacation Matrix - {MONTH_FULL[month]} {year}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={year} onChange={(e) => onYearChange(Number(e.target.value))} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.9rem' }}>
              {[2024, 2025, 2026, 2027, 2028].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </h2>

        {/* Month selector pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {MONTH_NAMES.map((m, i) => (
            <button
              key={i}
              onClick={() => onMonthChange(i)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: i === month ? '2px solid var(--primary)' : '1px solid #ddd',
                background: i === month ? 'var(--primary)' : 'white',
                color: i === month ? 'white' : '#555',
                fontWeight: i === month ? 700 : 400,
                cursor: 'pointer',
                fontSize: '0.85rem',
                transition: 'all 0.15s',
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Stats row */}
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <h3>{monthStats.totalDays}</h3>
            <p>Vacation Days</p>
          </div>
          <div className="stat-card">
            <h3>{monthStats.uniqueEmployees}</h3>
            <p>Employees on Vacation</p>
          </div>
          <div className="stat-card">
            <h3>{monthStats.peakOverlap}</h3>
            <p>Peak Overlap</p>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 15, flexWrap: 'wrap', marginBottom: 15, fontSize: '0.8rem', color: '#666' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 16, height: 16, borderRadius: 3, background: '#27ae60', display: 'inline-block' }}></span> Vacation (1 person)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 16, height: 16, borderRadius: 3, background: '#e67e22', display: 'inline-block' }}></span> Overlap (2-3)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 16, height: 16, borderRadius: 3, background: '#e74c3c', display: 'inline-block' }}></span> High Overlap (4+)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 16, height: 16, borderRadius: 3, background: '#f0f0f0', border: '1px solid #ddd', display: 'inline-block' }}></span> Weekend
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 16, height: 16, borderRadius: 3, background: 'white', border: '2px solid #2980b9', display: 'inline-block' }}></span> Today
          </span>
        </div>
      </div>

      {/* Matrix Grid */}
      <div className="card" style={{ overflow: 'auto', position: 'relative' }}>
        <h2 className="card-title">Daily View - {MONTH_FULL[month]} {year}</h2>

        {groupedEmployees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            <h3>No vacation data for {year}</h3>
            <p>Employees need to submit their vacation plans first.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '0.78rem', width: '100%', minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', left: 0, zIndex: 2, background: '#1a5f7a', color: 'white', padding: '8px 10px', textAlign: 'left', minWidth: 150 }}>
                    Employee
                  </th>
                  {days.map((d) => {
                    const we = isWeekend(d);
                    const ds = toDateStr(d);
                    const isToday = ds === todayStr;
                    const oc = overlapCount(d);
                    return (
                      <th
                        key={d}
                        style={{
                          padding: '4px 0',
                          textAlign: 'center',
                          minWidth: 28,
                          background: isToday ? '#2980b9' : we ? '#95a5a6' : '#1a5f7a',
                          color: 'white',
                          fontSize: '0.72rem',
                          fontWeight: isToday ? 800 : 400,
                          borderLeft: '1px solid rgba(255,255,255,0.15)',
                        }}
                      >
                        <div>{d}</div>
                        <div style={{ fontSize: '0.6rem', opacity: 0.7 }}>
                          {['Su','Mo','Tu','We','Th','Fr','Sa'][new Date(year, month, d).getDay()]}
                        </div>
                        {oc >= 2 && (
                          <div style={{
                            fontSize: '0.6rem',
                            background: oc >= 4 ? '#e74c3c' : '#e67e22',
                            borderRadius: 8,
                            padding: '0 4px',
                            margin: '2px auto 0',
                            width: 'fit-content',
                          }}>
                            {oc}
                          </div>
                        )}
                      </th>
                    );
                  })}
                  <th style={{ background: '#1a5f7a', color: 'white', padding: '8px 6px', textAlign: 'center', minWidth: 40 }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {groupedEmployees.map(({ dept, employees }) => (
                  <Fragment key={dept}>
                    {/* Department header row */}
                    <tr>
                      <td
                        colSpan={days.length + 2}
                        style={{
                          background: DEPT_COLORS[dept] || '#666',
                          color: 'white',
                          padding: '6px 10px',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {dept} ({employees.length})
                      </td>
                    </tr>
                    {/* Employee rows */}
                    {employees.map((emp) => {
                      const mt = monthTotal(emp.email);
                      return (
                        <tr key={emp.email} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{
                            position: 'sticky',
                            left: 0,
                            zIndex: 1,
                            background: 'white',
                            padding: '6px 10px',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            borderRight: `3px solid ${DEPT_COLORS[emp.dept] || '#ccc'}`,
                            fontSize: '0.82rem',
                          }}>
                            {emp.name}
                          </td>
                          {days.map((d) => {
                            const ds = toDateStr(d);
                            const we = isWeekend(d);
                            const isToday = ds === todayStr;
                            const onVac = employeeVacDays[emp.email]?.has(ds);
                            const oc = dateMap[ds]?.length || 0;

                            let bg = 'white';
                            let borderColor = 'transparent';
                            if (we && !onVac) bg = '#f5f5f5';
                            if (onVac) {
                              bg = oc >= 4 ? '#e74c3c' : oc >= 2 ? '#e67e22' : '#27ae60';
                            }
                            if (isToday) borderColor = '#2980b9';

                            return (
                              <td
                                key={d}
                                style={{
                                  padding: 0,
                                  textAlign: 'center',
                                  borderLeft: '1px solid #f0f0f0',
                                  position: 'relative',
                                }}
                                onMouseEnter={(e) => {
                                  if (onVac || (dateMap[ds]?.length || 0) > 0) {
                                    const rect = e.target.getBoundingClientRect();
                                    onTooltip({
                                      x: rect.left + rect.width / 2,
                                      y: rect.top - 5,
                                      date: ds,
                                      employee: emp.name,
                                      isOnVac: onVac,
                                      overlap: dateMap[ds] || [],
                                    });
                                  }
                                }}
                                onMouseLeave={() => onTooltip(null)}
                              >
                                <div style={{
                                  width: '100%',
                                  height: 26,
                                  background: bg,
                                  border: isToday ? `2px solid ${borderColor}` : 'none',
                                  borderRadius: isToday ? 4 : 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: onVac ? 'white' : 'transparent',
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                }}>
                                  {onVac && (oc >= 2 ? oc : '')}
                                </div>
                              </td>
                            );
                          })}
                          <td style={{
                            textAlign: 'center',
                            fontWeight: 700,
                            padding: '4px 6px',
                            background: mt > 0 ? '#e8f8f5' : 'white',
                            color: mt > 0 ? '#1a5f7a' : '#ccc',
                            fontSize: '0.85rem',
                          }}>
                            {mt || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
                {/* Overlap summary row */}
                <tr style={{ borderTop: '2px solid #1a5f7a' }}>
                  <td style={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 1,
                    background: '#f8f9fa',
                    padding: '6px 10px',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    color: '#1a5f7a',
                  }}>
                    Total on Leave
                  </td>
                  {days.map((d) => {
                    const ds = toDateStr(d);
                    const oc = dateMap[ds]?.length || 0;
                    const we = isWeekend(d);
                    return (
                      <td key={d} style={{
                        textAlign: 'center',
                        padding: '4px 0',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        background: oc >= 4 ? '#fdedec' : oc >= 2 ? '#fef9e7' : '#f8f9fa',
                        color: oc >= 4 ? '#e74c3c' : oc >= 2 ? '#e67e22' : oc > 0 ? '#27ae60' : (we ? '#bbb' : '#ddd'),
                        borderLeft: '1px solid #f0f0f0',
                      }}>
                        {oc || (we ? '-' : '')}
                      </td>
                    );
                  })}
                  <td style={{ textAlign: 'center', fontWeight: 700, background: '#f8f9fa', color: '#1a5f7a', fontSize: '0.85rem' }}>
                    {monthStats.totalDays}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Annual Overview Heatmap */}
      <div className="card">
        <h2 className="card-title">Annual Overview - {year}</h2>
        <p style={{ color: '#666', marginBottom: 15, fontSize: '0.88rem' }}>
          Monthly breakdown per employee. Darker = more vacation days.
        </p>

        {annualSummary.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#999' }}>No data</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '0.82rem', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ background: '#1a5f7a', color: 'white', padding: '8px 10px', textAlign: 'left', minWidth: 150, position: 'sticky', left: 0, zIndex: 2 }}>Employee</th>
                  <th style={{ background: '#1a5f7a', color: 'white', padding: '8px 6px', textAlign: 'left', minWidth: 60 }}>Dept</th>
                  {MONTH_NAMES.map((m) => (
                    <th key={m} style={{ background: '#1a5f7a', color: 'white', padding: '8px 6px', textAlign: 'center', minWidth: 38 }}>{m}</th>
                  ))}
                  <th style={{ background: '#1a5f7a', color: 'white', padding: '8px 8px', textAlign: 'center', minWidth: 45 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {annualSummary.map((emp) => (
                  <tr key={emp.email} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '7px 10px', fontWeight: 500, position: 'sticky', left: 0, background: 'white', zIndex: 1, borderRight: `3px solid ${DEPT_COLORS[emp.dept] || '#ccc'}` }}>
                      {emp.name}
                    </td>
                    <td style={{ padding: '7px 6px', fontSize: '0.75rem', color: DEPT_COLORS[emp.dept] || '#666', fontWeight: 600 }}>
                      {emp.dept}
                    </td>
                    {emp.byMonth.map((count, mi) => {
                      const intensity = count === 0 ? 0 : Math.min(count / 8, 1);
                      const r = Math.round(26 + (39 - 26) * (1 - intensity));
                      const g = Math.round(174 + (152 - 174) * (1 - intensity));
                      const b = Math.round(96 + (149 - 96) * (1 - intensity));
                      return (
                        <td
                          key={mi}
                          style={{
                            textAlign: 'center',
                            padding: '4px 2px',
                            background: count > 0 ? `rgba(${r}, ${g}, ${b}, ${0.3 + intensity * 0.7})` : 'white',
                            color: count > 0 ? (intensity > 0.5 ? 'white' : '#333') : '#ddd',
                            fontWeight: count > 0 ? 700 : 400,
                            fontSize: '0.8rem',
                            cursor: count > 0 ? 'pointer' : 'default',
                            borderLeft: '1px solid #f0f0f0',
                          }}
                          onClick={() => { if (count > 0) onMonthChange(mi); }}
                        >
                          {count || '-'}
                        </td>
                      );
                    })}
                    <td style={{
                      textAlign: 'center',
                      fontWeight: 800,
                      padding: '7px 8px',
                      background: emp.total > 15 ? '#fdedec' : emp.total > 10 ? '#fef9e7' : '#e8f8f5',
                      color: emp.total > 15 ? '#e74c3c' : emp.total > 10 ? '#e67e22' : '#1a5f7a',
                      fontSize: '0.9rem',
                    }}>
                      {emp.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x,
          top: tooltip.y,
          transform: 'translate(-50%, -100%)',
          background: '#1a2332',
          color: 'white',
          padding: '8px 14px',
          borderRadius: 8,
          fontSize: '0.78rem',
          zIndex: 1000,
          pointerEvents: 'none',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          maxWidth: 250,
          lineHeight: 1.5,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 3 }}>
            {new Date(tooltip.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
          {tooltip.isOnVac && <div style={{ color: '#2ecc71' }}>{tooltip.employee} is on vacation</div>}
          {tooltip.overlap.length > 1 && (
            <div style={{ marginTop: 3, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 3 }}>
              <span style={{ color: '#e67e22' }}>{tooltip.overlap.length} people on leave:</span>
              <div style={{ color: '#bbb' }}>
                {tooltip.overlap.map((e) => EMPLOYEE_MAP[e.toLowerCase()]?.name || e.split('@')[0]).join(', ')}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

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

  // Matrix state
  const [matrixMonth, setMatrixMonth] = useState(new Date().getMonth());
  const [matrixTooltip, setMatrixTooltip] = useState(null);

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

  if (loading && (adminTab === 'vacations' || adminTab === 'matrix')) {
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
          className={`admin-sub-tab ${adminTab === 'matrix' ? 'active' : ''}`}
          onClick={() => setAdminTab('matrix')}
        >
          Vacation Matrix
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

    {/* ========== VACATION MATRIX TAB ========== */}
    {adminTab === 'matrix' && (
    <div>
      <VacationMatrix
        vacations={vacations}
        year={yearFilter}
        month={matrixMonth}
        onMonthChange={setMatrixMonth}
        onYearChange={setYearFilter}
        tooltip={matrixTooltip}
        onTooltip={setMatrixTooltip}
      />
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
