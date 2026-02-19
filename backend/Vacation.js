import mongoose from 'mongoose';

const vacationSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    hrCode: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    vacationDays: {
      type: [String],
      required: true,
      validate: {
        validator: function (arr) {
          return arr.length > 0;
        },
        message: 'At least one vacation day is required',
      },
    },
    totalDays: { type: Number, required: true, min: 1 },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

vacationSchema.index({ email: 1, year: 1 }, { unique: true });

export default mongoose.model('Vacation', vacationSchema);
