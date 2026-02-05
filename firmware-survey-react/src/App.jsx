import { useState, useEffect } from 'react';
import SurveyForm from './components/SurveyForm';
import ExpertiseMatrix from './components/ExpertiseMatrix';
import AllResponses from './components/AllResponses';
import {
  fetchSurveys,
  createSurvey,
  updateSurvey,
  deleteSurvey,
  importSurveys,
  clearAllSurveys,
} from './data/utils';
import './App.css';

const TABS = [
  { key: 'survey', label: 'Survey Form' },
  { key: 'matrix', label: 'Expertise Matrix' },
  { key: 'data', label: 'All Responses' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('survey');
  const [surveyData, setSurveyData] = useState([]);
  const [editData, setEditData] = useState(null);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const isAdmin = new URLSearchParams(window.location.search).get('admin') === 'true';
  const visibleTabs = isAdmin ? TABS : TABS.filter((t) => t.key === 'survey');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const data = await fetchSurveys();
      setSurveyData(data);
    } catch (err) {
      console.error('Failed to load surveys:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(engineer) {
    try {
      const existing = surveyData.find((e) => e.hrCode === engineer.hrCode);
      if (existing) {
        await updateSurvey(engineer.hrCode, engineer);
      } else {
        await createSurvey(engineer);
      }
      await loadData();
      setEditData(null);
      alert('Survey submitted successfully!');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  function handleEdit(eng) {
    setEditData(eng);
    setActiveTab('survey');
  }

  async function handleDelete(id) {
    try {
      await deleteSurvey(id);
      await loadData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function handleImport(imported, merge) {
    try {
      await importSurveys(imported, merge);
      await loadData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function handleClearAll() {
    try {
      await clearAllSurveys();
      setSurveyData([]);
      alert('All data cleared');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="header">
          <img src="/azka_logo.png" alt="AZKA Logo" className="header-logo" />
          <h1>AZKA Firmware Team Survey</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <img src="/azka_logo.png" alt="AZKA Logo" className="header-logo" />
        <h1>AZKA Firmware Team Survey</h1>
        <p>Skills Assessment & Team Identification System</p>
      </div>

      <div className="tabs">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'survey' && (
        <SurveyForm
          surveyData={surveyData}
          onSubmit={handleSubmit}
          editData={editData}
          onClearEdit={() => setEditData(null)}
        />
      )}

      {activeTab === 'matrix' && (
        <ExpertiseMatrix
          surveyData={surveyData}
          departmentFilter={departmentFilter}
          onFilterChange={setDepartmentFilter}
        />
      )}

      {activeTab === 'data' && (
        <AllResponses
          surveyData={surveyData}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onImport={handleImport}
          onClearAll={handleClearAll}
        />
      )}
    </div>
  );
}
