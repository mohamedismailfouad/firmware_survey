import { useMemo, useState } from 'react';
import {
  DEPARTMENTS,
  ALL_SKILL_MODULES,
  SKILL_VALUES,
  TITLES,
} from '../data/constants';
import { calculateGrade, getAllModules } from '../data/utils';

export default function ExpertiseMatrix({ surveyData, departmentFilter, onFilterChange }) {
  const [titleFilter, setTitleFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [expMinFilter, setExpMinFilter] = useState('');
  const [expMaxFilter, setExpMaxFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  function mapToObject(map) {
    if (map instanceof Map) return Object.fromEntries(map);
    if (map && typeof map === 'object') return map;
    return {};
  }

  const allProjects = useMemo(() => {
    const projects = [...new Set(surveyData.map((e) => e.projectName).filter(Boolean))];
    return projects.sort();
  }, [surveyData]);

  const filteredData = useMemo(() => {
    return surveyData.filter((e) => {
      // Department filter
      if (departmentFilter !== 'all' && e.department !== departmentFilter) return false;

      // Title filter
      if (titleFilter !== 'all' && e.title !== titleFilter) return false;

      // Project filter
      if (projectFilter !== 'all' && e.projectName !== projectFilter) return false;

      // Experience filter
      if (expMinFilter !== '' && e.experience < parseInt(expMinFilter)) return false;
      if (expMaxFilter !== '' && e.experience > parseInt(expMaxFilter)) return false;

      // Grade filter
      if (gradeFilter !== 'all') {
        const skills = mapToObject(e.skills);
        const customSkills = mapToObject(e.customSkills);
        const grade = calculateGrade(skills, customSkills);
        if (grade.grade !== gradeFilter) return false;
      }

      // Search filter (name, email, HR code)
      if (searchFilter) {
        const search = searchFilter.toLowerCase();
        const matchesName = e.fullName?.toLowerCase().includes(search);
        const matchesEmail = e.email?.toLowerCase().includes(search);
        const matchesHR = e.hrCode?.toLowerCase().includes(search);
        if (!matchesName && !matchesEmail && !matchesHR) return false;
      }

      return true;
    });
  }, [surveyData, departmentFilter, titleFilter, projectFilter, gradeFilter, expMinFilter, expMaxFilter, searchFilter]);

  const allModules = useMemo(
    () => getAllModules(surveyData, ALL_SKILL_MODULES),
    [surveyData]
  );

  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return { total: 0, avgExp: '0', avgScore: '0%', expertCount: 0 };
    }
    const avgExp = (
      filteredData.reduce((a, e) => a + (e.experience || 0), 0) / filteredData.length
    ).toFixed(1);

    const allGrades = filteredData.map((e) => {
      const skills = mapToObject(e.skills);
      const customSkills = mapToObject(e.customSkills);
      return calculateGrade(skills, customSkills);
    });
    const avgScore =
      Math.round(
        allGrades.reduce((a, g) => a + g.percentage, 0) / allGrades.length
      ) + '%';

    let expertCount = 0;
    filteredData.forEach((e) => {
      const skills = mapToObject(e.skills);
      const customSkills = mapToObject(e.customSkills);
      Object.values(skills).forEach((v) => {
        if (v === 'expert') expertCount++;
      });
      Object.values(customSkills).forEach((v) => {
        if (v === 'expert') expertCount++;
      });
    });

    return { total: filteredData.length, avgExp, avgScore, expertCount };
  }, [filteredData]);

  function clearFilters() {
    onFilterChange('all');
    setTitleFilter('all');
    setProjectFilter('all');
    setGradeFilter('all');
    setExpMinFilter('');
    setExpMaxFilter('');
    setSearchFilter('');
  }

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

      {/* Filters Section */}
      <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 12, marginBottom: 20 }}>
        <h3 style={{ marginBottom: 15, color: 'var(--primary)' }}>Filters</h3>

        <div className="form-grid" style={{ marginBottom: 15 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Search (Name/Email/HR)</label>
            <input
              type="text"
              placeholder="Search..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Department</label>
            <select value={departmentFilter} onChange={(e) => onFilterChange(e.target.value)}>
              <option value="all">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Title</label>
            <select value={titleFilter} onChange={(e) => setTitleFilter(e.target.value)}>
              <option value="all">All Titles</option>
              {TITLES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Project</label>
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
              <option value="all">All Projects</option>
              {allProjects.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Grade</label>
            <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
              <option value="all">All Grades</option>
              <option value="A">A (80-100%)</option>
              <option value="B">B (60-79%)</option>
              <option value="C">C (40-59%)</option>
              <option value="D">D (20-39%)</option>
              <option value="F">F (0-19%)</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Experience (Years)</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="number"
                placeholder="Min"
                min="0"
                max="40"
                value={expMinFilter}
                onChange={(e) => setExpMinFilter(e.target.value)}
                style={{ width: '50%' }}
              />
              <input
                type="number"
                placeholder="Max"
                min="0"
                max="40"
                value={expMaxFilter}
                onChange={(e) => setExpMaxFilter(e.target.value)}
                style={{ width: '50%' }}
              />
            </div>
          </div>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
          Clear All Filters
        </button>
      </div>

      <div className="matrix-container">
        <table className="matrix-table">
          <thead>
            <tr>
              <th>Engineer</th>
              <th>Email</th>
              <th>Dept</th>
              <th>Title</th>
              <th>Project</th>
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
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={7 + allModules.length} style={{ textAlign: 'center', padding: 30 }}>
                  No data matches the current filters
                </td>
              </tr>
            ) : (
              filteredData.map((eng) => {
                const skills = mapToObject(eng.skills);
                const customSkills = mapToObject(eng.customSkills);
                const grade = calculateGrade(skills, customSkills);
                const allSkills = { ...skills, ...customSkills };

                return (
                  <tr key={eng.id}>
                    <td>{eng.fullName}</td>
                    <td style={{ fontSize: '0.8rem' }}>{eng.email || '-'}</td>
                    <td>{eng.department}</td>
                    <td>{eng.title}</td>
                    <td style={{ fontSize: '0.8rem' }}>{eng.projectName}</td>
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
              })
            )}
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
