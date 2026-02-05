import { useRef } from 'react';
import { ALL_SKILL_MODULES } from '../data/constants';
import { calculateGrade, exportJSON, exportCSV, getAllModules } from '../data/utils';

export default function AllResponses({
  surveyData,
  onEdit,
  onDelete,
  onImport,
  onClearAll,
}) {
  const fileInputRef = useRef(null);

  function viewEngineer(eng) {
    const grade = calculateGrade(eng.skills, eng.customSkills);
    alert(
      `Name: ${eng.fullName}
HR Code: ${eng.hrCode}
Title: ${eng.title}
Experience: ${eng.experience} years
Department: ${eng.department}
Project: ${eng.projectName}
Current Modules: ${eng.currentModules?.join(', ') || 'N/A'}
Task: ${eng.taskDescription || 'N/A'}
Delivery: ${eng.deliveryDate || 'N/A'}

Grade: ${grade.grade} (${grade.percentage}%)

Gaining Experience: ${eng.gainingExperience || 'N/A'}
Willing to Change: ${eng.willingToChange || 'N/A'}

Challenges: ${eng.challenges || 'N/A'}
Training Needs: ${eng.trainingNeeds || 'N/A'}
Career Goals: ${eng.careerGoals || 'N/A'}`
    );
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

  return (
    <div className="card">
      <h2 className="card-title">All Survey Responses</h2>

      <div className="engineer-list">
        {surveyData.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: 40 }}>
            No survey responses yet.
          </p>
        ) : (
          surveyData.map((eng) => {
            const grade = calculateGrade(eng.skills, eng.customSkills);
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
                    Project: {eng.projectName} | Submitted:{' '}
                    {new Date(eng.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <div className="engineer-actions">
                  <button
                    onClick={() => viewEngineer(eng)}
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
