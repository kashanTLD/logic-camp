import mongoose, { Schema, Document } from 'mongoose';

// Notification Type interface
export interface INotificationType extends Document {
  key: string;
  description?: string;
  template: string;
  created_at: Date;
  updated_at: Date;
}

// Notification Type schema
const NotificationTypeSchema: Schema = new Schema({
  key: {
    type: String,
    required: [true, 'Notification type key is required'],
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: [100, 'Key cannot exceed 100 characters'],
    match: [/^[a-z0-9_]+$/, 'Key can only contain lowercase letters, numbers, and underscores']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  template: {
    type: String,
    required: [true, 'Notification template is required'],
    trim: true,
    maxlength: [2000, 'Template cannot exceed 2000 characters']
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  },
  collection: 'notification_types'
});

// Indexes are already defined in the schema field definitions above

// Instance methods
NotificationTypeSchema.methods.toJSON = function() {
  const typeObject = this.toObject();
  return typeObject;
};

NotificationTypeSchema.methods.renderTemplate = function(variables: Record<string, any>): string {
  let rendered = this.template;
  
  // Simple template variable replacement
  Object.keys(variables).forEach(key => {
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    rendered = rendered.replace(placeholder, variables[key] || '');
  });
  
  return rendered;
};

// Static methods
NotificationTypeSchema.statics.findByKey = function(key: string) {
  return this.findOne({ key: key.toLowerCase() });
};

NotificationTypeSchema.statics.getActiveTypes = function() {
  return this.find().sort({ key: 1 });
};

// Pre-defined notification types
NotificationTypeSchema.statics.seedDefaultTypes = async function() {
  const defaultTypes = [
    {
      key: 'project_created',
      description: 'Notification when a new project is created',
      template: 'New project "{{project_name}}" has been created and assigned to {{manager_name}}.'
    },
    {
      key: 'task_assigned',
      description: 'Notification when a task is assigned to a user',
      template: 'You have been assigned a new task: "{{task_title}}" in project "{{project_name}}".'
    },
    {
      key: 'task_completed',
      description: 'Notification when a task is completed',
      template: 'Task "{{task_title}}" has been completed by {{employee_name}}.'
    },
    {
      key: 'project_status_changed',
      description: 'Notification when project status changes',
      template: 'Project "{{project_name}}" status has been changed from {{old_status}} to {{new_status}}.'
    },
    {
      key: 'lead_converted',
      description: 'Notification when a lead is converted to customer',
      template: 'Lead "{{customer_name}}" has been successfully converted to a customer by {{agent_name}}.'
    },
    {
      key: 'payment_received',
      description: 'Notification when payment is received',
      template: 'Payment of ${{amount}} has been received for project "{{project_name}}".'
    },
    {
      key: 'goal_created',
      description: 'Notification when a new goal is created',
      template: 'New goal "{{goal_title}}" has been created for project "{{project_name}}".'
    },
    {
      key: 'file_uploaded',
      description: 'Notification when a file is uploaded to a project',
      template: '{{uploader_name}} has uploaded a new file "{{file_name}}" to project "{{project_name}}".'
    },
    {
      key: 'project_overdue',
      description: 'Notification when a project becomes overdue',
      template: 'Project "{{project_name}}" is overdue. Expected completion date was {{end_date}}.'
    },
    {
      key: 'upsell_opportunity',
      description: 'Notification for upsell opportunities',
      template: 'Upsell opportunity of ${{amount}} identified for project "{{project_name}}".'
    }
  ];

  for (const type of defaultTypes) {
    await this.findOneAndUpdate(
      { key: type.key },
      type,
      { upsert: true, new: true }
    );
  }
};

export default mongoose.model<INotificationType>('NotificationType', NotificationTypeSchema);
