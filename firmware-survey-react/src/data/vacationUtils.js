const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/vacations';

export async function fetchVacations(filters = {}) {
  const params = new URLSearchParams();
  if (filters.year) params.set('year', filters.year);
  if (filters.email) params.set('email', filters.email);

  const url = params.toString() ? `${API_BASE}?${params}` : API_BASE;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch vacations');
  return res.json();
}

export async function createVacation(data) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.error || 'Failed to submit vacation');
  }
  return result;
}

export async function updateVacation(id, data) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update vacation');
  return res.json();
}

export async function deleteVacation(id) {
  const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete vacation');
  return res.json();
}

export async function fetchVacationStats(year) {
  const url = year ? `${API_BASE}/stats?year=${year}` : `${API_BASE}/stats`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch vacation stats');
  return res.json();
}

export function exportVacationsJSON(vacations) {
  const blob = new Blob([JSON.stringify(vacations, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `azka_vacations_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportVacationsCSV(vacations) {
  if (vacations.length === 0) return;
  let csv =
    '\uFEFF' +
    'Email,HR Code,Year,Total Days,Vacation Days,Submitted At\n';
  vacations.forEach((v) => {
    csv += `"${v.email}","${v.hrCode}",${v.year},${v.totalDays},"${v.vacationDays.join('; ')}","${new Date(v.submittedAt).toLocaleString()}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `azka_vacations_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
