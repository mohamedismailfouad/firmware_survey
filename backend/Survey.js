import mongoose from 'mongoose';

const surveySchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    timestamp: { type: String, required: true },

    // Personal info
    fullName: { type: String, required: true, trim: true },
    hrCode: { type: String, required: true, unique: true, trim: true },
    title: {
      type: String,
      required: true,
      enum: ['Junior', 'Senior', 'TeamLead', 'Manager'],
    },
    experience: { type: Number, required: true, min: 0, max: 40 },
    department: {
      type: String,
      required: true,
      enum: ['DLMS', 'PREPAID', 'FLOW', 'COMMUNICATION', 'TOOLING'],
    },
    projectName: { type: String, required: true, trim: true },

    // Current work
    currentModules: { type: [String], default: [] },
    otherCurrentModule: { type: String, default: '' },
    taskDescription: { type: String, default: '' },
    deliveryDate: { type: String, default: '' },

    // Skills (dynamic keys like Metering, DLMS, etc.)
    skills: { type: Map, of: String, default: {} },

    // Custom skills (user-added, max 10)
    customSkills: { type: Map, of: String, default: {} },

    // Feedback
    gainingExperience: { type: String, enum: ['yes', 'no', ''], default: '' },
    willingToChange: { type: String, enum: ['yes', 'no', ''], default: '' },
    challenges: { type: String, default: '' },
    trainingNeeds: { type: String, default: '' },
    toolsNeeded: { type: String, default: '' },
    careerGoals: { type: String, default: '' },
    suggestions: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Survey', surveySchema);
