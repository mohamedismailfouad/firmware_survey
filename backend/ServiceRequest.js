import mongoose from 'mongoose';

const serviceRequestSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    hrCode: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ['work_from_home', 'urgent_vacation', 'need_help'],
    },
    dates: [String], // YYYY-MM-DD format, for WFH and urgent vacation
    reason: { type: String, trim: true },
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'approved', 'rejected'],
    },
    adminNote: { type: String, trim: true },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

serviceRequestSchema.index({ email: 1, type: 1, submittedAt: -1 });

export default mongoose.model('ServiceRequest', serviceRequestSchema);
