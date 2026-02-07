import { useRef, useState } from 'react';
import { ALL_SKILL_MODULES, SKILL_VALUES } from '../data/constants';
import { calculateGrade, exportJSON, exportCSV, getAllModules } from '../data/utils';

export default function AllResponses({
  surveyData,
  onEdit,
  onDelete,
  onImport,
  onClearAll,
}) {
  const fileInputRef = useRef(null);
  const [viewingEngineer, setViewingEngineer] = useState(null);

  function mapToObject(map) {
    if (map instanceof Map) return Object.fromEntries(map);
    if (map && typeof map === 'object') return map;
    return {};
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (ev) {
      try {
        const imported = JSON.parse(ev.target.result);
        if (Array.isArray(imported)) {
          const merge = confirm(
            'Merge with existing data? (Cancel to replace)'
          );
          onImport(imported, merge);
          alert(`Imported ${imported.length} records successfully!`);
        } else {
          alert('Invalid file format');
        }
      } catch (err) {
        alert('Error parsing file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleExportCSV() {
    const allModules = getAllModules(surveyData, ALL_SKILL_MODULES);
    exportCSV(surveyData, allModules);
  }

  function renderViewModal() {
    if (!viewingEngineer) return null;

    const eng = viewingEngineer;
    const skills = mapToObject(eng.skills);
    const customSkills = mapToObject(eng.customSkills);
    const grade = calculateGrade(skills, customSkills);

    const filledSkills = Object.entries(skills).filter(
      ([, level]) => level && level !== 'none'
    );
    const filledCustomSkills = Object.entries(customSkills).filter(
      ([, level]) => level && level !== 'none'
    );

    return (
      <div className="modal-overlay" onClick={() => setViewingEngineer(null)}>
        <div
          className="modal-content"
          style={{ maxWidth: 700, maxHeight: '90vh', overflow: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 style={{ marginBottom: 20 }}>
            {eng.fullName}{' '}
            <span className={`grade-badge grade-${grade.grade}`}>
              {grade.grade} ({grade.percentage}%)
            </span>
          </h2>

          <div style={{ marginBottom: 20 }}>
            <h3 style={{ color: 'var(--primary)', borderBottom: '2px solid var(--accent)', paddingBottom: 5, marginBottom: 10 }}>
              Personal Information
            </h3>
            <p><strong>Email:</strong> {eng.email || 'N/A'}</p>
            <p><strong>HR Code:</strong> {eng.hrCode}</p>
            <p><strong>Title:</strong> {eng.title}</p>
            <p><strong>Experience:</strong> {eng.experience} years</p>
            <p><strong>Department:</strong> {eng.department}</p>
            <p><strong>Project:</strong> {eng.projectName}</p>
            <p><strong>Submitted:</strong> {new Date(eng.timestamp).toLocaleString()}</p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h3 style={{ color: 'var(--primary)', borderBottom: '2px solid var(--accent)', paddingBottom: 5, marginBottom: 10 }}>
              Current Work
            </h3>
            <p><strong>Current Modules:</strong> {eng.currentModules?.join(', ') || 'N/A'}</p>
            <p><strong>Other Module:</strong> {eng.otherCurrentModule || 'N/A'}</p>
            <p><strong>Task Description:</strong> {eng.taskDescription || 'N/A'}</p>
            <p><strong>Delivery Date:</strong> {eng.deliveryDate || 'N/A'}</p>
          </div>

          {(filledSkills.length > 0 || filledCustomSkills.length > 0) && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ color: 'var(--primary)', borderBottom: '2px solid var(--accent)', paddingBottom: 5, marginBottom: 10 }}>
                Skills (Non-None)
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {filledSkills.map(([skill, level]) => (
                  <span
                    key={skill}
                    className={`skill-badge skill-${level}`}
                    style={{ fontSize: '0.85rem' }}
                  >
                    {skill}: {level}
                  </span>
                ))}
                {filledCustomSkills.map(([skill, level]) => (
                  <span
                    key={skill}
                    className={`skill-badge skill-${level}`}
                    style={{ fontSize: '0.85rem', border: '1px dashed var(--primary)' }}
                  >
                    {skill}: {level} (custom)
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <h3 style={{ color: 'var(--primary)', borderBottom: '2px solid var(--accent)', paddingBottom: 5, marginBottom: 10 }}>
              Feedback
            </h3>
            <p><strong>Gaining Experience:</strong> {eng.gainingExperience || 'N/A'}</p>
            <p><strong>Willing to Change Teams:</strong> {eng.willingToChange || 'N/A'}</p>
            <p><strong>Challenges:</strong> {eng.challenges || 'N/A'}</p>
            <p><strong>Training Needs:</strong> {eng.trainingNeeds || 'N/A'}</p>
            <p><strong>Tools Needed:</strong> {eng.toolsNeeded || 'N/A'}</p>
            <p><strong>Career Goals:</strong> {eng.careerGoals || 'N/A'}</p>
            <p><strong>Suggestions:</strong> {eng.suggestions || 'N/A'}</p>
          </div>

          <div className="btn-group" style={{ justifyContent: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={() => setViewingEngineer(null)}
            >
              Close
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                onEdit(eng);
                setViewingEngineer(null);
              }}
            >
              Edit
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="card-title">All Survey Responses</h2>

      {renderViewModal()}

      <div className="engineer-list">
        {surveyData.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: 40 }}>
            No survey responses yet.
          </p>
        ) : (
          surveyData.map((eng) => {
            const skills = mapToObject(eng.skills);
            const customSkills = mapToObject(eng.customSkills);
            const grade = calculateGrade(skills, customSkills);
            return (
              <div className="engineer-card" key={eng.id}>
                <div className="engineer-info">
                  <h4>
                    {eng.fullName}{' '}
                    <span className={`grade-badge grade-${grade.grade}`}>
                      {grade.grade}
                    </span>
                  </h4>
                  <p>
                    {eng.title} | {eng.department} | {eng.experience} years |
                    HR: {eng.hrCode}
                  </p>
                  <p>
                    {eng.email && <>{eng.email} | </>}
                    Project: {eng.projectName} | Submitted:{' '}
                    {new Date(eng.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <div className="engineer-actions">
                  <button
                    onClick={() => setViewingEngineer(eng)}
                    style={{ background: 'var(--secondary)', color: 'white' }}
                  >
                    View
                  </button>
                  <button
                    onClick={() => onEdit(eng)}
                    style={{ background: 'var(--warning)' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          'Are you sure you want to delete this entry?'
                        )
                      ) {
                        onDelete(eng.id);
                      }
                    }}
                    style={{ background: 'var(--danger)', color: 'white' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="btn-group">
        <button
          className="btn btn-secondary"
          onClick={() => exportJSON(surveyData)}
        >
          Export JSON
        </button>
        <button className="btn btn-secondary" onClick={handleExportCSV}>
          Export CSV
        </button>
        <button className="btn btn-secondary" onClick={handleImportClick}>
          Import Data
        </button>
        <button
          className="btn btn-secondary"
          style={{ background: '#dc3545', color: 'white' }}
          onClick={() => {
            if (
              confirm(
                'Are you sure you want to delete ALL survey data? This cannot be undone.'
              )
            ) {
              onClearAll();
            }
          }}
        >
          Clear All Data
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".json"
        onChange={handleFileChange}
      />
    </div>
  );
}
