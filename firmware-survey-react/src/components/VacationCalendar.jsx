import { useState, useMemo } from 'react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function VacationCalendar({ selectedDays, onToggleDay, year, allowWeekends = false }) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(year || new Date().getFullYear());
  const [notification, setNotification] = useState('');

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const grid = [];

    for (let i = 0; i < firstDay; i++) {
      grid.push({ date: null, key: `empty-${i}` });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(currentYear, currentMonth, d).getDay();
      grid.push({
        date: dateStr,
        day: d,
        isPast: dateStr < todayStr,
        isToday: dateStr === todayStr,
        isSelected: selectedDays.includes(dateStr),
        isWeekend: dayOfWeek === 5 || dayOfWeek === 6,
      });
    }
    return grid;
  }, [currentMonth, currentYear, selectedDays, todayStr]);

  function handleDayClick(dayInfo) {
    if (!dayInfo.date) return;
    if (dayInfo.isPast) {
      setNotification('Cannot select past dates. Only future dates are allowed.');
      setTimeout(() => setNotification(''), 3000);
      return;
    }
    if (dayInfo.isWeekend && !allowWeekends) {
      setNotification('Friday and Saturday are weekends and cannot be selected as vacation days.');
      setTimeout(() => setNotification(''), 3000);
      return;
    }
    onToggleDay(dayInfo.date);
  }

  function navigateMonth(delta) {
    let newMonth = currentMonth + delta;
    let newYear = currentYear;
    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  }

  function goToToday() {
    setCurrentMonth(new Date().getMonth());
    setCurrentYear(new Date().getFullYear());
  }

  return (
    <div className="vacation-calendar">
      {notification && (
        <div className="vacation-notification">{notification}</div>
      )}

      <div className="calendar-nav">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => navigateMonth(-1)}
        >
          &laquo; Prev
        </button>
        <div className="calendar-nav-center">
          <h3 className="calendar-month-title">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h3>
          <button
            type="button"
            className="btn btn-sm"
            onClick={goToToday}
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          >
            Today
          </button>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => navigateMonth(1)}
        >
          Next &raquo;
        </button>
      </div>

      <div className="calendar-grid">
        {DAY_NAMES.map((d) => (
          <div key={d} className="calendar-day-header">
            {d}
          </div>
        ))}
        {calendarDays.map((dayInfo) => (
          <div
            key={dayInfo.key || dayInfo.date}
            className={[
              'calendar-day',
              !dayInfo.date ? 'empty' : '',
              dayInfo.isPast ? 'past' : '',
              dayInfo.isToday ? 'today' : '',
              dayInfo.isSelected ? 'selected' : '',
              dayInfo.isWeekend && !dayInfo.isSelected ? 'weekend' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => dayInfo.date && handleDayClick(dayInfo)}
          >
            {dayInfo.day || ''}
          </div>
        ))}
      </div>

      <div className="calendar-legend">
        <span className="legend-item">
          <span className="legend-dot selected"></span> Selected
        </span>
        <span className="legend-item">
          <span className="legend-dot today"></span> Today
        </span>
        <span className="legend-item">
          <span className="legend-dot weekend"></span> Weekend
        </span>
        <span className="legend-item">
          <span className="legend-dot past"></span> Past
        </span>
      </div>
    </div>
  );
}
