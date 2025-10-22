import mongoose, { Schema, Document } from 'mongoose';

// Project Status interface
export interface IProjectStatus extends Document {
  project_id: mongoose.Types.ObjectId;
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  changed_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

// Project Status schema
const ProjectStatusSchema: Schema = new Schema({
  project_id: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project ID is required'],
    index: true
  },
  status: {
    type: String,
    enum: {
      values: ['todo', 'in_progress', 'review', 'completed', 'cancelled'],
      message: 'Status must be one of: todo, in_progress, review, completed, cancelled'
    },
    required: [true, 'Status is required'],
    default: 'todo',
    index: true
  },
  changed_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Changed by user ID is required'],
    index: true
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  },
  collection: 'project_statuses'
});

// Compound indexes for performance
ProjectStatusSchema.index({ project_id: 1, created_at: -1 });
ProjectStatusSchema.index({ status: 1, created_at: -1 });
ProjectStatusSchema.index({ changed_by: 1, created_at: -1 });

export default mongoose.model<IProjectStatus>('ProjectStatus', ProjectStatusSchema);
