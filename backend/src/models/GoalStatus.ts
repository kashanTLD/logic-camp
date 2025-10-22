import mongoose, { Schema, Document } from 'mongoose';

// Goal Status interface
export interface IGoalStatus extends Document {
  goal_id: mongoose.Types.ObjectId;
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  changed_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

// Goal Status schema
const GoalStatusSchema: Schema = new Schema({
  goal_id: {
    type: Schema.Types.ObjectId,
    ref: 'Goal',
    required: [true, 'Goal ID is required'],
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
  collection: 'goal_statuses'
});

// Compound indexes for performance
GoalStatusSchema.index({ goal_id: 1, created_at: -1 });
GoalStatusSchema.index({ status: 1, created_at: -1 });
GoalStatusSchema.index({ changed_by: 1, created_at: -1 });

export default mongoose.model<IGoalStatus>('GoalStatus', GoalStatusSchema);
