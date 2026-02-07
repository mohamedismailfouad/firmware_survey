import { SKILL_VALUES } from './constants';

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/surveys';

// --- API functions ---

export async function fetchSurveys() {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error('Failed to fetch surveys');
  return res.json();
}

export async function createSurvey(engineer) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(engineer),
  });
  if (res.status === 409) {
    throw new Error('HR Code already exists');
  }
  if (!res.ok) throw new Error('Failed to create survey');
  return res.json();
}

export async function updateSurvey(hrCode, engineer) {
  const res = await fetch(`${API_BASE}/${hrCode}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(engineer),
  });
  if (!res.ok) throw new Error('Failed to update survey');
  return res.json();
}

export async function deleteSurvey(id) {
  const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete survey');
  return res.json();
}

export async function clearAllSurveys() {
  const res = await fetch(API_BASE, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear data');
  return res.json();
}

export async function importSurveys(data, merge) {
  const res = await fetch(`${API_BASE}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, merge }),
  });
  if (!res.ok) throw new Error('Failed to import');
  return res.json();
}

export async function loginAdmin(username, password) {
  const API_URL = import.meta.env.VITE_API_URL || '';
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Invalid credentials');
  }
  return res.json();
}

// --- Pure client-side functions (unchanged) ---

export function calculateGrade(skills, customSkills = {}) {
  const allSkills = { ...skills, ...customSkills };
  const values = Object.values(allSkills).map((v) => SKILL_VALUES[v] || 0);
  if (values.length === 0) return { score: 0, grade: 'F', percentage: 0 };

  const total = values.reduce((a, b) => a + b, 0);
  const max = values.length * 4;
  const percentage = Math.round((total / max) * 100);

  let grade;
  if (percentage >= 80) grade = 'A';
  else if (percentage >= 60) grade = 'B';
  else if (percentage >= 40) grade = 'C';
  else if (percentage >= 20) grade = 'D';
  else grade = 'F';

  return { score: total, grade, percentage };
}

export function exportJSON(surveyData) {
  const blob = new Blob([JSON.stringify(surveyData, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `azka_firmware_survey_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function mapToObject(map) {
  if (map instanceof Map) return Object.fromEntries(map);
  if (map && typeof map === 'object') return map;
  return {};
}

function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportCSV(surveyData, allModules) {
  if (surveyData.length === 0) {
    alert('No data to export');
    return;
  }

  // Header row
  const headers = [
    'Name',
    'Email',
    'HR Code',
    'Title',
    'Experience',
    'Department',
    'Project',
    ...allModules,
    'Score',
    'Grade',
  ];

  let csv = headers.join(',') + '\n';

  surveyData.forEach((eng) => {
    const skills = mapToObject(eng.skills);
    const customSkills = mapToObject(eng.customSkills);
    const allSkills = { ...skills, ...customSkills };
    const grade = calculateGrade(skills, customSkills);

    const row = [
      escapeCSV(eng.fullName),
      escapeCSV(eng.email || ''),
      escapeCSV(eng.hrCode),
      escapeCSV(eng.title),
      eng.experience || 0,
      escapeCSV(eng.department),
      escapeCSV(eng.projectName),
      ...allModules.map((m) => SKILL_VALUES[allSkills[m]] || 0),
      `${grade.percentage}%`,
      grade.grade,
    ];

    csv += row.join(',') + '\n';
  });

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `azka_firmware_matrix_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function getAllModules(surveyData, baseModules) {
  const allModules = [...baseModules];
  surveyData.forEach((e) => {
    Object.keys(e.customSkills || {}).forEach((m) => {
      if (!allModules.includes(m)) allModules.push(m);
    });
  });
  return allModules;
}
