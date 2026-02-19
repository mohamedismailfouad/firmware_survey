const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/services';

export async function fetchServiceRequests(filters = {}) {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.status) params.set('status', filters.status);
  if (filters.email) params.set('email', filters.email);

  const url = params.toString() ? `${API_BASE}?${params}` : API_BASE;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch service requests');
  return res.json();
}

export async function createServiceRequest(data) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.error || 'Failed to submit service request');
  }
  return result;
}

export async function updateServiceStatus(id, status, adminNote) {
  const res = await fetch(`${API_BASE}/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, adminNote }),
  });
  if (!res.ok) throw new Error('Failed to update status');
  return res.json();
}

export async function deleteServiceRequest(id) {
  const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete service request');
  return res.json();
}

export async function fetchServiceStats() {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch service stats');
  return res.json();
}
