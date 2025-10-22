import mongoose, { Schema, Document } from 'mongoose';
import { IFile } from './File';
import { IGoalStatus } from './GoalStatus';

// Goal interface
export interface IGoal extends Document {
  project_id: mongoose.Types.ObjectId;
  support_employee_id?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: IGoalStatus;
  files: IFile[];
  created_at: Date;
  updated_at: Date;
}

// Goal schema
const GoalSchema: Schema = new Schema({
  project_id: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project ID is required'],
    index: true
  },
  support_employee_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    validate: {
      validator: async function(v: mongoose.Types.ObjectId) {
        if (!v) return true; // Optional field
        const User = mongoose.model('User');
        const user = await User.findById(v);
        return user && (user.role === 'support' || user.role === 'admin' || user.role === 'manager');
      },
      message: 'Support employee must have support, admin, or manager role'
    }
  },
  title: {
    type: String,
    required: [true, 'Goal title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  files: [{
    type: Schema.Types.ObjectId,
  }],
  status:{
    type:Schema.Types.ObjectId,
    index: true
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  },
  collection: 'goals'
});

// Compound indexes
GoalSchema.index({ project_id: 1, created_at: -1 });
GoalSchema.index({ support_employee_id: 1, created_at: -1 });

// Virtual for task count
GoalSchema.virtual('task_count', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'goal_id',
  count: true
});

// Instance methods
GoalSchema.methods.toJSON = function() {
  const goalObject = this.toObject({ virtuals: true });
  return goalObject;
};

GoalSchema.methods.getTaskProgress = async function() {
  const Task = mongoose.model('Task');
  const tasks = await Task.find({ goal_id: this._id });
  
  if (tasks.length === 0) return { total: 0, completed: 0, percentage: 0 };
  
  const completed = tasks.filter(task => task.status === 'completed').length;
  const percentage = Math.round((completed / tasks.length) * 100);
  
  return {
    total: tasks.length,
    completed,
    percentage
  };
};

// Static methods
GoalSchema.statics.findByProject = function(projectId: string) {
  return this.find({ project_id: projectId }).populate('support_employee_id', 'name email role');
};

GoalSchema.statics.findBySupportEmployee = function(employeeId: string) {
  return this.find({ support_employee_id: employeeId }).populate('project_id', 'name status');
};

GoalSchema.statics.getGoalStats = function() {
  return this.aggregate([
    {
      $lookup: {
        from: 'tasks',
        localField: '_id',
        foreignField: 'goal_id',
        as: 'tasks'
      }
    },
    {
      $project: {
        title: 1,
        project_id: 1,
        support_employee_id: 1,
        total_tasks: { $size: '$tasks' },
        completed_tasks: {
          $size: {
            $filter: {
              input: '$tasks',
              cond: { $eq: ['$$this.status', 'completed'] }
            }
          }
        }
      }
    },
    {
      $project: {
        title: 1,
        project_id: 1,
        support_employee_id: 1,
        total_tasks: 1,
        completed_tasks: 1,
        completion_percentage: {
          $cond: [
            { $eq: ['$total_tasks', 0] },
            0,
            { $multiply: [{ $divide: ['$completed_tasks', '$total_tasks'] }, 100] }
          ]
        }
      }
    }
  ]);
};

export default mongoose.model<IGoal>('Goal', GoalSchema);
