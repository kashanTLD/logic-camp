import mongoose, { Schema, Document } from 'mongoose';

// Activity Log interface
export interface IActivityLog extends Document {
  changed_by: mongoose.Types.ObjectId;
  entity_id: mongoose.Types.ObjectId;
  entity_type: string;
  action: 'create' | 'update' | 'delete' | 'view';
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  created_at: Date;
}

// Activity Log schema
const ActivityLogSchema: Schema = new Schema({
  changed_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Changed by user ID is required'],
    index: true
  },
  entity_id: {
    type: Schema.Types.ObjectId,
    required: [true, 'Entity ID is required'],
    index: true
  },
  entity_type: {
    type: String,
    required: [true, 'Entity type is required'],
    enum: {
      values: [
        'users', 'customers', 'leads', 'projects', 'project_services', 
        'goals', 'tasks', 'files', 'notifications', 'notification_types',
        'messages', 'message_attachments', 'business_directories', 
        'customer_charge_details', 'upsells'
      ],
      message: 'Entity type must be a valid collection name'
    },
    index: true
  },
  action: {
    type: String,
    enum: {
      values: ['create', 'update', 'delete', 'view'],
      message: 'Action must be one of: create, update, delete, view'
    },
    required: [true, 'Action is required'],
    index: true
  },
  old_data: {
    type: Schema.Types.Mixed,
    default: null
  },
  new_data: {
    type: Schema.Types.Mixed,
    default: null
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: false 
  },
  collection: 'activity_logs'
});

// Compound indexes for performance optimization
ActivityLogSchema.index({ entity_type: 1, entity_id: 1 });
ActivityLogSchema.index({ changed_by: 1, created_at: -1 });
ActivityLogSchema.index({ entity_type: 1, action: 1, created_at: -1 });
ActivityLogSchema.index({ created_at: -1 }); // For time-based queries

// TTL index to automatically delete old logs after 2 years (optional)
ActivityLogSchema.index({ created_at: 1 }, { expireAfterSeconds: 63072000 }); // 2 years

// Pre-save middleware
ActivityLogSchema.pre('save', function(next) {
  // Sanitize sensitive data from logs
  if (this.old_data) {
    this.old_data = (this as any).sanitizeData(this.old_data);
  }
  if (this.new_data) {
    this.new_data = (this as any).sanitizeData(this.new_data);
  }
  next();
});

// Instance methods
ActivityLogSchema.methods.sanitizeData = function(data: any) {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveFields = ['password', 'card_number', 'cvv', 'ssn', 'tax_id'];
  const sanitized = { ...data };
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });
  
  return sanitized;
};

ActivityLogSchema.methods.toJSON = function() {
  const logObject = this.toObject();
  return logObject;
};

// Static methods
ActivityLogSchema.statics.findByEntity = function(entityType: string, entityId: string) {
  return this.find({ 
    entity_type: entityType, 
    entity_id: entityId 
  })
  .populate('changed_by', 'name email role')
  .sort({ created_at: -1 });
};

ActivityLogSchema.statics.findByUser = function(userId: string, limit = 50) {
  return this.find({ changed_by: userId })
    .sort({ created_at: -1 })
    .limit(limit)
    .populate('changed_by', 'name email role');
};

ActivityLogSchema.statics.findByAction = function(action: string, limit = 100) {
  return this.find({ action })
    .sort({ created_at: -1 })
    .limit(limit)
    .populate('changed_by', 'name email role');
};

ActivityLogSchema.statics.getActivitySummary = function(startDate?: Date, endDate?: Date) {
  const matchConditions: any = {};
  
  if (startDate || endDate) {
    matchConditions.created_at = {};
    if (startDate) matchConditions.created_at.$gte = startDate;
    if (endDate) matchConditions.created_at.$lte = endDate;
  }
  
  return this.aggregate([
    ...(Object.keys(matchConditions).length > 0 ? [{ $match: matchConditions }] : []),
    {
      $group: {
        _id: {
          entity_type: '$entity_type',
          action: '$action'
        },
        count: { $sum: 1 },
        users: { $addToSet: '$changed_by' }
      }
    },
    {
      $group: {
        _id: '$_id.entity_type',
        actions: {
          $push: {
            action: '$_id.action',
            count: '$count',
            unique_users: { $size: '$users' }
          }
        },
        total_activities: { $sum: '$count' }
      }
    },
    {
      $sort: { total_activities: -1 }
    }
  ]);
};

ActivityLogSchema.statics.getUserActivityStats = function(userId: string, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        changed_by: new mongoose.Types.ObjectId(userId),
        created_at: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$created_at' }
        },
        activities: { $sum: 1 },
        actions: { $addToSet: '$action' },
        entities: { $addToSet: '$entity_type' }
      }
    },
    {
      $project: {
        date: '$_id',
        activities: 1,
        unique_actions: { $size: '$actions' },
        unique_entities: { $size: '$entities' }
      }
    },
    {
      $sort: { date: 1 }
    }
  ]);
};

ActivityLogSchema.statics.getRecentActivity = function(limit = 50) {
  return this.find()
    .sort({ created_at: -1 })
    .limit(limit)
    .populate('changed_by', 'name email role')
    .select('-old_data -new_data'); // Exclude detailed data for overview
};

// Static method to create activity log
ActivityLogSchema.statics.createLog = function(
  changedBy: string, 
  entityId: string, 
  entityType: string, 
  action: string, 
  oldData?: any, 
  newData?: any
) {
  return this.create({
    changed_by: changedBy,
    entity_id: entityId,
    entity_type: entityType,
    action,
    old_data: oldData,
    new_data: newData
  });
};

export default mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
