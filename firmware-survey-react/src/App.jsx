import { useState, useEffect } from 'react';
import SurveyForm from './components/SurveyForm';
import ExpertiseMatrix from './components/ExpertiseMatrix';
import AllResponses from './components/AllResponses';
import VacationForm from './components/VacationForm';
import VacationAdmin from './components/VacationAdmin';
import {
  fetchSurveys,
  createSurvey,
  updateSurvey,
  deleteSurvey,
  importSurveys,
  clearAllSurveys,
  loginAdmin,
} from './data/utils';
import './App.css';

const TABS = [
  { key: 'survey', label: 'Survey Form', public: true },
  { key: 'vacations', label: 'Annual Vacations', public: true },
  { key: 'matrix', label: 'Expertise Matrix', public: false },
  { key: 'data', label: 'All Responses', public: false },
  { key: 'vacationAdmin', label: 'Vacations Admin', public: false },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('survey');
  const [surveyData, setSurveyData] = useState([]);
  const [editData, setEditData] = useState(null);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Auth state
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem('isAdmin') === 'true';
  });
  const [showLogin, setShowLogin] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const visibleTabs = isAdmin ? TABS : TABS.filter((t) => t.public);

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

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError('');
    try {
      const result = await loginAdmin(loginUsername, loginPassword);
      if (result.success) {
        setIsAdmin(true);
        localStorage.setItem('isAdmin', 'true');
        setShowLogin(false);
        setLoginUsername('');
        setLoginPassword('');
      }
    } catch (err) {
      setLoginError(err.message || 'Login failed');
    }
  }

  function handleLogout() {
    setIsAdmin(false);
    localStorage.removeItem('isAdmin');
    setActiveTab('survey');
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

      {/* Login Modal */}
      {showLogin && (
        <div className="modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Admin Login</h2>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
              {loginError && <p className="error-text">{loginError}</p>}
              <div className="btn-group">
                <button type="submit" className="btn btn-primary">
                  Login
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowLogin(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
        <div className="auth-buttons">
          {isAdmin ? (
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowLogin(true)}
            >
              Admin Login
            </button>
          )}
        </div>
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

      {activeTab === 'vacations' && <VacationForm />}

      {activeTab === 'data' && (
        <AllResponses
          surveyData={surveyData}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onImport={handleImport}
          onClearAll={handleClearAll}
        />
      )}

      {activeTab === 'vacationAdmin' && <VacationAdmin />}
    </div>
  );
}
