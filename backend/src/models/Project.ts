import mongoose, { Schema, Document } from 'mongoose';
import { IGoal } from './Goal';
import { IProjectService } from './ProjectService';
import { IProjectStatus } from './ProjectStatus';


interface IProjectComment{
sender_id: string,
message:string
}
// Project interface
export interface IProject extends Document {
  customer_id: mongoose.Types.ObjectId;
  manager: mongoose.Types.ObjectId;
  support: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  status: IProjectStatus;
  services: IProjectService[];
  goals?: IGoal[];
  total_amount?: number;
  sale_price?: number;
  monthly_recurring_amount?: number;
  monthly_recurring_date?: Date;
  end_date?: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  customer_reviews?: string;
  support_reviews?: string;
  tech_reviews?: string;
  activation_date?: Date;
  project_comments?: IProjectComment[];
  created_at: Date;
  updated_at: Date;
}

// Project schema
const ProjectSchema: Schema = new Schema({
  customer_id: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer ID is required'],
    index: true
  },
  manager_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Project manager ID is required'],
    index: true
  },
  support_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Support employee ID is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [200, 'Project name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  status: {
    type: Schema.Types.ObjectId,
    index: true
  },
  services: [{
    type: Schema.Types.ObjectId,
  }],
  goals: [{
    type: Schema.Types.ObjectId,
    ref: 'Goal'
  }],
  total_amount: {
    type: Number,
    min: [0, 'Total amount cannot be negative'],
    validate: {
      validator: function(v: number) {
        return v == null || v >= 0;
      },
      message: 'Total amount must be a positive number'
    }
  },
  sale_price: {
    type: Number,
    min: [0, 'Sale price cannot be negative'],
    validate: {
      validator: function(v: number) {
        return v == null || v >= 0;
      },
      message: 'Sale price must be a positive number'
    }
  },
  monthly_recurring_amount: {
    type: Number,
    min: [0, 'Monthly recurring amount cannot be negative'],
    validate: {
      validator: function(v: number) {
        return v == null || v >= 0;
      },
      message: 'Monthly recurring amount must be a positive number'
    }
  },
  monthly_recurring_date: {
    type: Number,
    min: [1, 'Monthly recurring date must be between 1 and 31'],
    max: [31, 'Monthly recurring date must be between 1 and 31'],
    validate: {
      validator: function(v: number) {
        return v == null || (v >= 1 && v <= 31);
      },
      message: 'Monthly recurring date must be between 1 and 31'
    }
  },
  end_date: {
    type: Date,
    validate: {
      validator: function(v: Date) {
        return v == null || v > new Date();
      },
      message: 'End date must be in the future'
    }
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'critical'],
      message: 'Priority must be one of: low, medium, high, critical'
    },
    default: 'medium'
  },
  customer_reviews: {
    type: String,
    maxlength: [2000, 'Customer reviews cannot exceed 2000 characters']
  },
  support_reviews: {
    type: String,
    maxlength: [2000, 'Support reviews cannot exceed 2000 characters']
  },
  tech_reviews: {
    type: String,
    maxlength: [2000, 'Tech reviews cannot exceed 2000 characters']
  },
  activation_data: {
    type: Schema.Types.Mixed,
    default: {}
  },
  project_comments: {
    type: String,
    maxlength: [2000, 'Project comments cannot exceed 2000 characters']
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  },
  collection: 'projects'
});

// Compound indexes for performance optimization
ProjectSchema.index({ customer_id: 1, status: 1 });
ProjectSchema.index({ user_id: 1, status: 1 });
ProjectSchema.index({ status: 1, priority: 1 });
ProjectSchema.index({ status: 1, created_at: -1 });
ProjectSchema.index({ end_date: 1, status: 1 });
ProjectSchema.index({ monthly_recurring_date: 1, status: 1 });

// Virtual for project duration
ProjectSchema.virtual('duration').get(function(this: IProject) {
  if (this.end_date) {
    const now = new Date();
    const endDate = new Date(this.end_date);
    return Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Virtual for total project value
ProjectSchema.virtual('total_project_value').get(function(this: IProject) {
  let total = 0;
  if (this.total_amount) total += this.total_amount;
  if (this.sale_price) total += this.sale_price;
  return total;
});

// Pre-save middleware
ProjectSchema.pre('save', function(next) {
  // Validate that end_date is after creation date for new projects
  if (this.isNew && this.end_date && this.end_date <= new Date()) {
    return next(new Error('End date must be in the future'));
  }
  next();
});

// Instance methods
ProjectSchema.methods.toJSON = function() {
  const projectObject = this.toObject({ virtuals: true });
  return projectObject;
};

ProjectSchema.methods.calculateProgress = async function() {
  const Task = mongoose.model('Task');
  const tasks = await Task.find({ project_id: this._id });
  
  if (tasks.length === 0) return 0;
  
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  return Math.round((completedTasks / tasks.length) * 100);
};

ProjectSchema.methods.getProjectTeam = async function() {
  const Task = mongoose.model('Task');
  const Goal = mongoose.model('Goal');
  
  const [tasks, goals] = await Promise.all([
    Task.find({ project_id: this._id }).populate('tech_employee_id', 'name email role'),
    Goal.find({ project_id: this._id }).populate('support_employee_id', 'name email role')
  ]);
  
  const teamMembers = new Set();
  
  // Add project manager
  teamMembers.add(this.user_id.toString());
  
  // Add tech employees from tasks
  tasks.forEach(task => {
    if (task.tech_employee_id) {
      teamMembers.add(task.tech_employee_id._id.toString());
    }
  });
  
  // Add support employees from goals
  goals.forEach(goal => {
    if (goal.support_employee_id) {
      teamMembers.add(goal.support_employee_id._id.toString());
    }
  });
  
  return Array.from(teamMembers);
};

// Static methods
ProjectSchema.statics.findActiveProjects = function() {
  return this.find({ 
    status: { $in: ['planning', 'in_progress'] }
  });
};

ProjectSchema.statics.findByCustomer = function(customerId: string) {
  return this.find({ customer_id: customerId });
};

ProjectSchema.statics.findByManager = function(managerId: string) {
  return this.find({ user_id: managerId });
};

ProjectSchema.statics.findOverdueProjects = function() {
  return this.find({
    end_date: { $lt: new Date() },
    status: { $in: ['planning', 'in_progress', 'on_hold'] }
  });
};

ProjectSchema.statics.getProjectStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        total_value: { $sum: '$total_amount' },
        avg_value: { $avg: '$total_amount' }
      }
    }
  ]);
};

ProjectSchema.statics.getRecurringRevenue = function() {
  return this.aggregate([
    {
      $match: {
        monthly_recurring_amount: { $gt: 0 },
        status: { $in: ['in_progress', 'completed'] }
      }
    },
    {
      $group: {
        _id: null,
        total_mrr: { $sum: '$monthly_recurring_amount' },
        count: { $sum: 1 }
      }
    }
  ]);
};

export default mongoose.model<IProject>('Project', ProjectSchema);
