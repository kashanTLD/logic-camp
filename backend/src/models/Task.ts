import mongoose, { Schema, Document } from 'mongoose';
import { ITaskStatus } from './TaskStatus';

interface ITaskComment{
sender_id: string,
message:string
}
// Task interface
export interface ITask extends Document {
  project_id: mongoose.Types.ObjectId;
  goal_id?: mongoose.Types.ObjectId;
  tech_employee_id?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  comments?: ITaskComment[];
  est_time?: number;
  act_time?: number;
  status: ITaskStatus;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// Task schema
const TaskSchema: Schema = new Schema({
  project_id: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project ID is required'],
    index: true
  },
  goal_id: {
    type: Schema.Types.ObjectId,
    ref: 'Goal',
    index: true
  },
  tech_employee_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    validate: {
      validator: async function(v: mongoose.Types.ObjectId) {
        if (!v) return true; // Optional field
        const User = mongoose.model('User');
        const user = await User.findById(v);
        return user && (user.role === 'tech' || user.role === 'admin' || user.role === 'manager');
      },
      message: 'Tech employee must have tech, admin, or manager role'
    }
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  comments: {
    type: String,
    trim: true,
    maxlength: [2000, 'Comments cannot exceed 2000 characters']
  },
  est_time: {
    type: Number,
    min: [0, 'Estimated time cannot be negative'],
    validate: {
      validator: function(v: number) {
        return v == null || v >= 0;
      },
      message: 'Estimated time must be a positive number'
    }
  },
  act_time: {
    type: Number,
    min: [0, 'Actual time cannot be negative'],
    validate: {
      validator: function(v: number) {
        return v == null || v >= 0;
      },
      message: 'Actual time must be a positive number'
    }
  },
  status: {
    type: Schema.Types.ObjectId,
    index: true
  },
  completed_at: {
    type: Date,
    validate: {
      validator: function(v: Date) {
        return this.status === 'completed' ? v != null : v == null;
      },
      message: 'Completed date is required when status is completed'
    }
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  },
  collection: 'tasks'
});

// Compound indexes for performance optimization
TaskSchema.index({ project_id: 1, status: 1 });
TaskSchema.index({ goal_id: 1, status: 1 });
TaskSchema.index({ tech_employee_id: 1, status: 1 });
TaskSchema.index({ status: 1, created_at: -1 });
TaskSchema.index({ completed_at: -1 });

// Virtual for time variance
TaskSchema.virtual('time_variance').get(function() {
  if (this.est_time && this.act_time) {
    return (this.act_time as number) - (this.est_time as number);
  }
  return null;
});

// Virtual for time efficiency
TaskSchema.virtual('time_efficiency').get(function() {
  if (this.est_time && this.act_time && (this.est_time as number) > 0) {
    return Math.round(((this.est_time as number) / (this.act_time as number)) * 100);
  }
  return null;
});

// Pre-save middleware
TaskSchema.pre('save', function(next) {
  // Auto-set completed_at when status changes to completed
  if (this.isModified('status')) {
    if (this.status === 'completed' && !this.completed_at) {
      this.completed_at = new Date();
    } else if (this.status !== 'completed') {
      this.completed_at = undefined;
    }
  }
  next();
});

// Instance methods
TaskSchema.methods.toJSON = function() {
  const taskObject = this.toObject({ virtuals: true });
  return taskObject;
};

TaskSchema.methods.markCompleted = function() {
  this.status = 'completed';
  this.completed_at = new Date();
  return this.save();
};

TaskSchema.methods.addTimeEntry = function(hours: number) {
  this.act_time = (this.act_time || 0) + hours;
  return this.save();
};

// Static methods
TaskSchema.statics.findByProject = function(projectId: string) {
  return this.find({ project_id: projectId })
    .populate('tech_employee_id', 'name email role')
    .populate('goal_id', 'title');
};

TaskSchema.statics.findByEmployee = function(employeeId: string) {
  return this.find({ tech_employee_id: employeeId })
    .populate('project_id', 'name status')
    .populate('goal_id', 'title');
};

TaskSchema.statics.findByGoal = function(goalId: string) {
  return this.find({ goal_id: goalId })
    .populate('tech_employee_id', 'name email role');
};

TaskSchema.statics.findOverdueTasks = function() {
  // Tasks that are not completed and have been in progress for more than estimated time
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - 24); // 24 hours ago
  
  return this.find({
    status: { $in: ['pending', 'in_progress'] },
    created_at: { $lt: cutoffDate },
    est_time: { $exists: true, $ne: null }
  });
};

TaskSchema.statics.getTaskStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avg_est_time: { $avg: '$est_time' },
        avg_act_time: { $avg: '$act_time' },
        total_est_time: { $sum: '$est_time' },
        total_act_time: { $sum: '$act_time' }
      }
    }
  ]);
};

TaskSchema.statics.getEmployeeWorkload = function() {
  return this.aggregate([
    {
      $match: {
        tech_employee_id: { $exists: true },
        status: { $in: ['pending', 'in_progress'] }
      }
    },
    {
      $group: {
        _id: '$tech_employee_id',
        task_count: { $sum: 1 },
        total_est_time: { $sum: '$est_time' },
        pending_tasks: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        in_progress_tasks: {
          $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'employee'
      }
    },
    {
      $unwind: '$employee'
    },
    {
      $project: {
        employee_name: '$employee.name',
        employee_email: '$employee.email',
        task_count: 1,
        total_est_time: 1,
        pending_tasks: 1,
        in_progress_tasks: 1
      }
    }
  ]);
};

export default mongoose.model<ITask>('Task', TaskSchema);
