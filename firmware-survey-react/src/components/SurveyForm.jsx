import { useState } from 'react';
import {
  SKILL_LEVELS,
  SKILL_CATEGORIES,
  TITLES,
  DEPARTMENTS,
  CURRENT_MODULES,
} from '../data/constants';

const EMPTY_FORM = {
  fullName: '',
  email: '',
  hrCode: '',
  title: '',
  experience: '',
  department: '',
  projectName: '',
  currentModules: [],
  otherCurrentModule: '',
  taskDescription: '',
  deliveryDate: '',
  skills: {},
  customModules: [],
  gainingExperience: '',
  willingToChange: '',
  challenges: '',
  trainingNeeds: '',
  toolsNeeded: '',
  careerGoals: '',
  suggestions: '',
};

export default function SurveyForm({ surveyData, onSubmit, editData, onClearEdit }) {
  const [form, setForm] = useState(() => {
    if (editData) return formFromEngineer(editData);
    return { ...EMPTY_FORM, skills: {}, customModules: [] };
  });

  // When editData changes externally, update form
  const [prevEditId, setPrevEditId] = useState(editData?.id);
  if (editData && editData.id !== prevEditId) {
    setForm(formFromEngineer(editData));
    setPrevEditId(editData.id);
  } else if (!editData && prevEditId) {
    setPrevEditId(null);
  }

  function formFromEngineer(eng) {
    return {
      fullName: eng.fullName || '',
      email: eng.email || '',
      hrCode: eng.hrCode || '',
      title: eng.title || '',
      experience: eng.experience ?? '',
      department: eng.department || '',
      projectName: eng.projectName || '',
      currentModules: eng.currentModules || [],
      otherCurrentModule: eng.otherCurrentModule || '',
      taskDescription: eng.taskDescription || '',
      deliveryDate: eng.deliveryDate || '',
      skills: { ...eng.skills },
      customModules: Object.entries(eng.customSkills || {}).map(
        ([name, level], i) => ({ id: i + 1, name, level })
      ),
      gainingExperience: eng.gainingExperience || '',
      willingToChange: eng.willingToChange || '',
      challenges: eng.challenges || '',
      trainingNeeds: eng.trainingNeeds || '',
      toolsNeeded: eng.toolsNeeded || '',
      careerGoals: eng.careerGoals || '',
      suggestions: eng.suggestions || '',
    };
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateSkill(key, value) {
    setForm((prev) => ({
      ...prev,
      skills: { ...prev.skills, [key]: value },
    }));
  }

  function handleMultiSelect(e) {
    const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
    updateField('currentModules', selected);
  }

  function addCustomModule() {
    if (form.customModules.length >= 10) {
      alert('Maximum 10 custom modules allowed');
      return;
    }
    setForm((prev) => ({
      ...prev,
      customModules: [
        ...prev.customModules,
        { id: Date.now(), name: '', level: 'none' },
      ],
    }));
  }

  function removeCustomModule(id) {
    setForm((prev) => ({
      ...prev,
      customModules: prev.customModules.filter((m) => m.id !== id),
    }));
  }

  function updateCustomModule(id, field, value) {
    setForm((prev) => ({
      ...prev,
      customModules: prev.customModules.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      ),
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();

    const customSkills = {};
    form.customModules.forEach((m) => {
      if (m.name.trim()) {
        customSkills[m.name.trim()] = m.level;
      }
    });

    const engineer = {
      id: editData?.id || Date.now(),
      timestamp: new Date().toISOString(),
      fullName: form.fullName,
      email: form.email,
      hrCode: form.hrCode,
      title: form.title,
      experience: parseInt(form.experience),
      department: form.department,
      projectName: form.projectName,
      currentModules: form.currentModules,
      otherCurrentModule: form.otherCurrentModule,
      taskDescription: form.taskDescription,
      deliveryDate: form.deliveryDate,
      skills: form.skills,
      customSkills,
      gainingExperience: form.gainingExperience,
      willingToChange: form.willingToChange,
      challenges: form.challenges,
      trainingNeeds: form.trainingNeeds,
      toolsNeeded: form.toolsNeeded,
      careerGoals: form.careerGoals,
      suggestions: form.suggestions,
    };

    const existingIndex = surveyData.findIndex(
      (e) => e.hrCode === engineer.hrCode && (!editData || e.id !== editData.id)
    );
    if (existingIndex >= 0) {
      if (!confirm('An entry with this HR code exists. Update it?')) return;
    }

    onSubmit(engineer);
    clearForm();
  }

  function clearForm() {
    setForm({ ...EMPTY_FORM, skills: {}, customModules: [] });
    if (onClearEdit) onClearEdit();
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Personal Information */}
      <div className="card">
        <h2 className="card-title">Personal Information</h2>
        <div className="form-grid">
          <div className="form-group">
            <label className="required">Full Name</label>
            <input
              type="text"
              required
              placeholder="Enter your full name"
              value={form.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="required">Email</label>
            <input
              type="email"
              required
              placeholder="Enter your email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="required">HR Code</label>
            <input
              type="text"
              required
              placeholder="Enter your HR code"
              value={form.hrCode}
              onChange={(e) => updateField('hrCode', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="required">Title / Position</label>
            <select
              required
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
            >
              <option value="">Select Title</option>
              {TITLES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="required">Years of Experience (Firmware)</label>
            <input
              type="number"
              required
              min="0"
              max="40"
              placeholder="Years"
              value={form.experience}
              onChange={(e) => updateField('experience', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="required">Department (CELL)</label>
            <select
              required
              value={form.department}
              onChange={(e) => updateField('department', e.target.value)}
            >
              <option value="">Select Department</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="required">Current Project Name</label>
            <input
              type="text"
              required
              placeholder="Project you're working on"
              value={form.projectName}
              onChange={(e) => updateField('projectName', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Current Work Assignment */}
      <div className="card">
        <h2 className="card-title">Current Work Assignment</h2>
        <div className="form-grid">
          <div className="form-group">
            <label>Current Working Module(s)</label>
            <select
              multiple
              size="5"
              value={form.currentModules}
              onChange={handleMultiSelect}
            >
              {CURRENT_MODULES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <small>Hold Ctrl/Cmd to select multiple</small>
          </div>
          <div className="form-group">
            <label>Other Module (if not listed)</label>
            <input
              type="text"
              placeholder="Specify other module"
              value={form.otherCurrentModule}
              onChange={(e) => updateField('otherCurrentModule', e.target.value)}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Task Description / Issue</label>
          <textarea
            placeholder="Describe your current task, issue, or request..."
            value={form.taskDescription}
            onChange={(e) => updateField('taskDescription', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Expected Delivery Date</label>
          <input
            type="date"
            value={form.deliveryDate}
            onChange={(e) => updateField('deliveryDate', e.target.value)}
          />
        </div>
      </div>

      {/* Skills Assessment */}
      <div className="card">
        <h2 className="card-title">Skills Assessment - Firmware Modules</h2>
        <p style={{ marginBottom: 20, color: '#666' }}>
          Rate your expertise level for each module:{' '}
          <strong>None</strong> (no experience) |{' '}
          <strong>Learning</strong> (currently learning) |{' '}
          <strong>Basic</strong> (can work with guidance) |{' '}
          <strong>Proficient</strong> (can work independently) |{' '}
          <strong>Expert</strong> (can mentor others)
        </p>

        <div className="skills-section">
          {SKILL_CATEGORIES.map((category) => (
            <div className="skills-category" key={category.title}>
              <h3>{category.title}</h3>
              <div className="skills-grid">
                {category.skills.map((skill) => (
                  <div className="skill-item" key={skill.key}>
                    <label>{skill.label}</label>
                    <select
                      value={form.skills[skill.key] || 'none'}
                      onChange={(e) => updateSkill(skill.key, e.target.value)}
                    >
                      {SKILL_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Custom Modules */}
          <div className="custom-modules">
            <h3 style={{ marginBottom: 15, color: 'var(--primary)' }}>
              Custom Modules (Add up to 10)
            </h3>
            <p style={{ marginBottom: 15, color: '#666' }}>
              Add any modules not listed above:
            </p>
            {form.customModules.map((mod) => (
              <div className="custom-module-row" key={mod.id}>
                <input
                  type="text"
                  placeholder="Module name"
                  value={mod.name}
                  onChange={(e) =>
                    updateCustomModule(mod.id, 'name', e.target.value)
                  }
                />
                <select
                  value={mod.level}
                  onChange={(e) =>
                    updateCustomModule(mod.id, 'level', e.target.value)
                  }
                >
                  {SKILL_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => removeCustomModule(mod.id)}
                >
                  &times;
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-success"
              onClick={addCustomModule}
              style={{ marginTop: 10 }}
            >
              + Add Custom Module
            </button>
          </div>
        </div>
      </div>

      {/* Team Feedback */}
      <div className="card">
        <h2 className="card-title">Team Feedback & Development</h2>
        <div className="form-group">
          <label>What challenges are you facing in your team?</label>
          <textarea
            placeholder="Describe any challenges, blockers, or issues..."
            value={form.challenges}
            onChange={(e) => updateField('challenges', e.target.value)}
          />
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="required">
              Are you gaining new experience in your current role?
            </label>
            <div className="radio-group">
              <div className="radio-item">
                <input
                  type="radio"
                  name="gainingExperience"
                  id="exp-yes"
                  value="yes"
                  required
                  checked={form.gainingExperience === 'yes'}
                  onChange={(e) =>
                    updateField('gainingExperience', e.target.value)
                  }
                />
                <label htmlFor="exp-yes">Yes</label>
              </div>
              <div className="radio-item">
                <input
                  type="radio"
                  name="gainingExperience"
                  id="exp-no"
                  value="no"
                  checked={form.gainingExperience === 'no'}
                  onChange={(e) =>
                    updateField('gainingExperience', e.target.value)
                  }
                />
                <label htmlFor="exp-no">No</label>
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="required">
              Are you willing to change teams if needed?
            </label>
            <div className="radio-group">
              <div className="radio-item">
                <input
                  type="radio"
                  name="willingToChange"
                  id="change-yes"
                  value="yes"
                  required
                  checked={form.willingToChange === 'yes'}
                  onChange={(e) =>
                    updateField('willingToChange', e.target.value)
                  }
                />
                <label htmlFor="change-yes">Yes</label>
              </div>
              <div className="radio-item">
                <input
                  type="radio"
                  name="willingToChange"
                  id="change-no"
                  value="no"
                  checked={form.willingToChange === 'no'}
                  onChange={(e) =>
                    updateField('willingToChange', e.target.value)
                  }
                />
                <label htmlFor="change-no">No</label>
              </div>
            </div>
          </div>
        </div>
        <div className="form-group">
          <label>
            What training or learning opportunities would you like?
          </label>
          <textarea
            placeholder="Any specific training, courses, or skills you want to develop..."
            value={form.trainingNeeds}
            onChange={(e) => updateField('trainingNeeds', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>
            What tools or resources would help improve your productivity?
          </label>
          <textarea
            placeholder="Software, hardware, documentation, etc..."
            value={form.toolsNeeded}
            onChange={(e) => updateField('toolsNeeded', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>
            Career Goals (Where do you see yourself in 2-3 years?)
          </label>
          <textarea
            placeholder="Your professional aspirations..."
            value={form.careerGoals}
            onChange={(e) => updateField('careerGoals', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Suggestions for Team/Process Improvement</label>
          <textarea
            placeholder="Any ideas to improve team collaboration, processes, or workflows..."
            value={form.suggestions}
            onChange={(e) => updateField('suggestions', e.target.value)}
          />
        </div>
      </div>

      <div className="btn-group">
        <button type="submit" className="btn btn-primary">
          Submit Survey
        </button>
        <button type="button" className="btn btn-secondary" onClick={clearForm}>
          Clear Form
        </button>
      </div>
    </form>
  );
}
