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

export function exportCSV(surveyData, allModules) {
  if (surveyData.length === 0) {
    alert('No data to export');
    return;
  }

  let csv =
    'Name,HR Code,Title,Experience,Department,Project,' +
    allModules.join(',') +
    ',Score,Grade\n';

  surveyData.forEach((eng) => {
    const grade = calculateGrade(eng.skills, eng.customSkills);
    const allSkills = { ...eng.skills, ...eng.customSkills };

    csv += `"${eng.fullName}","${eng.hrCode}","${eng.title}",${eng.experience},"${eng.department}","${eng.projectName}",`;
    csv += allModules.map((m) => SKILL_VALUES[allSkills[m]] || 0).join(',');
    csv += `,${grade.percentage}%,${grade.grade}\n`;
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
