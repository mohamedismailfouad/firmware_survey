import { useMemo } from 'react';
import {
  DEPARTMENTS,
  ALL_SKILL_MODULES,
  SKILL_VALUES,
} from '../data/constants';
import { calculateGrade, getAllModules } from '../data/utils';

export default function ExpertiseMatrix({ surveyData, departmentFilter, onFilterChange }) {
  const filteredData = useMemo(
    () =>
      departmentFilter === 'all'
        ? surveyData
        : surveyData.filter((e) => e.department === departmentFilter),
    [surveyData, departmentFilter]
  );

  const allModules = useMemo(
    () => getAllModules(surveyData, ALL_SKILL_MODULES),
    [surveyData]
  );

  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return { total: 0, avgExp: '0', avgScore: '0%', expertCount: 0 };
    }
    const avgExp = (
      filteredData.reduce((a, e) => a + e.experience, 0) / filteredData.length
    ).toFixed(1);

    const allGrades = filteredData.map((e) =>
      calculateGrade(e.skills, e.customSkills)
    );
    const avgScore =
      Math.round(
        allGrades.reduce((a, g) => a + g.percentage, 0) / allGrades.length
      ) + '%';

    let expertCount = 0;
    filteredData.forEach((e) => {
      Object.values(e.skills).forEach((v) => {
        if (v === 'expert') expertCount++;
      });
      Object.values(e.customSkills || {}).forEach((v) => {
        if (v === 'expert') expertCount++;
      });
    });

    return { total: filteredData.length, avgExp, avgScore, expertCount };
  }, [filteredData]);

  return (
    <div className="card">
      <h2 className="card-title">Team Expertise Matrix</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>{stats.total}</h3>
          <p>Total Engineers</p>
        </div>
        <div className="stat-card">
          <h3>{stats.avgExp}</h3>
          <p>Avg. Years Experience</p>
        </div>
        <div className="stat-card">
          <h3>{stats.avgScore}</h3>
          <p>Avg. Skill Score</p>
        </div>
        <div className="stat-card">
          <h3>{stats.expertCount}</h3>
          <p>Expert-Level Skills</p>
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 20 }}>
        <label>Filter by Department:</label>
        <select value={departmentFilter} onChange={(e) => onFilterChange(e.target.value)}>
          <option value="all">All Departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="matrix-container">
        <table className="matrix-table">
          <thead>
            <tr>
              <th>Engineer</th>
              <th>Dept</th>
              <th>Title</th>
              <th>Exp</th>
              {allModules.map((m) => (
                <th className="rotate" key={m}>
                  {m.replace(/_/g, ' ')}
                </th>
              ))}
              <th>Score</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((eng) => {
              const grade = calculateGrade(eng.skills, eng.customSkills);
              const allSkills = { ...eng.skills, ...eng.customSkills };

              return (
                <tr key={eng.id}>
                  <td>{eng.fullName}</td>
                  <td>{eng.department}</td>
                  <td>{eng.title}</td>
                  <td>{eng.experience}y</td>
                  {allModules.map((m) => {
                    const level = allSkills[m] || 'none';
                    return (
                      <td key={m}>
                        <span className={`skill-badge skill-${level}`}>
                          {SKILL_VALUES[level]}
                        </span>
                      </td>
                    );
                  })}
                  <td>
                    <strong>{grade.percentage}%</strong>
                  </td>
                  <td>
                    <span className={`grade-badge grade-${grade.grade}`}>
                      {grade.grade}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 20 }}>
        <h4>Legend:</h4>
        <div
          style={{
            display: 'flex',
            gap: 15,
            flexWrap: 'wrap',
            marginTop: 10,
          }}
        >
          <span className="skill-badge skill-none">None (0)</span>
          <span className="skill-badge skill-learning">Learning (1)</span>
          <span className="skill-badge skill-basic">Basic (2)</span>
          <span className="skill-badge skill-proficient">Proficient (3)</span>
          <span className="skill-badge skill-expert">Expert (4)</span>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 15,
            flexWrap: 'wrap',
            marginTop: 15,
          }}
        >
          <strong>Grades:</strong>
          <span className="grade-badge grade-A">A (80-100%)</span>
          <span className="grade-badge grade-B">B (60-79%)</span>
          <span className="grade-badge grade-C">C (40-59%)</span>
          <span className="grade-badge grade-D">D (20-39%)</span>
          <span className="grade-badge grade-F">F (0-19%)</span>
        </div>
      </div>
    </div>
  );
}
