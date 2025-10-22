import mongoose, { Schema, Document } from 'mongoose';

// Notification interface
export interface INotification extends Document {
  user_id: mongoose.Types.ObjectId;
  triggered_by?: mongoose.Types.ObjectId;
  notification_type_id: mongoose.Types.ObjectId;
  entity_id?: mongoose.Types.ObjectId;
  entity_type?: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  is_read: boolean;
  read_at?: Date;
  created_at: Date;
}

// Notification schema
const NotificationSchema: Schema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  triggered_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  notification_type_id: {
    type: Schema.Types.ObjectId,
    ref: 'NotificationType',
    required: [true, 'Notification type ID is required'],
    index: true
  },
  entity_id: {
    type: Schema.Types.ObjectId,
    index: true
  },
  entity_type: {
    type: String,
    trim: true,
    enum: {
      values: [
        'projects', 'tasks', 'goals', 'leads', 'customers', 
        'files', 'upsells', 'messages', 'users'
      ],
      message: 'Entity type must be a valid collection name'
    }
  },
  type: {
    type: String,
    enum: {
      values: ['info', 'warning', 'success', 'error'],
      message: 'Type must be one of: info, warning, success, error'
    },
    default: 'info'
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  is_read: {
    type: Boolean,
    default: false,
    index: true
  },
  read_at: {
    type: Date,
    validate: {
      validator: function(v: Date) {
        // read_at should be set only when is_read is true
        return this.is_read ? v != null : v == null;
      },
      message: 'Read date should be set only when notification is read'
    }
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: false 
  },
  collection: 'notifications'
});

// Compound indexes for performance optimization
NotificationSchema.index({ user_id: 1, is_read: 1 });
NotificationSchema.index({ user_id: 1, created_at: -1 });
NotificationSchema.index({ triggered_by: 1, created_at: -1 });
NotificationSchema.index({ entity_type: 1, entity_id: 1 });
NotificationSchema.index({ created_at: -1 });

// TTL index to automatically delete old read notifications after 90 days
NotificationSchema.index(
  { read_at: 1 }, 
  { 
    expireAfterSeconds: 7776000, // 90 days
    partialFilterExpression: { is_read: true }
  }
);

// Virtual for time since creation
NotificationSchema.virtual('time_ago').get(function() {
  const now = new Date();
  const created = new Date((this as any).created_at as Date);
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return created.toLocaleDateString();
});

// Pre-save middleware
NotificationSchema.pre('save', function(next) {
  // Auto-set read_at when is_read changes to true
  if (this.isModified('is_read')) {
    if (this.is_read && !this.read_at) {
      this.read_at = new Date();
    } else if (!this.is_read) {
      this.read_at = undefined;
    }
  }
  next();
});

// Instance methods
NotificationSchema.methods.toJSON = function() {
  const notificationObject = this.toObject({ virtuals: true });
  return notificationObject;
};

NotificationSchema.methods.markAsRead = function() {
  this.is_read = true;
  this.read_at = new Date();
  return this.save();
};

NotificationSchema.methods.markAsUnread = function() {
  this.is_read = false;
  this.read_at = undefined;
  return this.save();
};

// Static methods
NotificationSchema.statics.findByUser = function(userId: string, limit = 50) {
  return this.find({ user_id: userId })
    .populate('notification_type_id', 'key template')
    .populate('triggered_by', 'name email')
    .sort({ created_at: -1 })
    .limit(limit);
};

NotificationSchema.statics.findUnreadByUser = function(userId: string) {
  return this.find({ 
    user_id: userId, 
    is_read: false 
  })
  .populate('notification_type_id', 'key template')
  .populate('triggered_by', 'name email')
  .sort({ created_at: -1 });
};

NotificationSchema.statics.getUnreadCount = function(userId: string) {
  return this.countDocuments({ 
    user_id: userId, 
    is_read: false 
  });
};

NotificationSchema.statics.markAllAsRead = function(userId: string) {
  return this.updateMany(
    { user_id: userId, is_read: false },
    { 
      is_read: true, 
      read_at: new Date() 
    }
  );
};

NotificationSchema.statics.findByEntity = function(entityType: string, entityId: string) {
  return this.find({ 
    entity_type: entityType, 
    entity_id: entityId 
  })
  .populate('user_id', 'name email')
  .populate('triggered_by', 'name email')
  .sort({ created_at: -1 });
};

NotificationSchema.statics.createNotification = async function(
  userId: string,
  notificationTypeKey: string,
  title: string,
  type: 'info' | 'warning' | 'success' | 'error' = 'info',
  triggeredBy?: string,
  entityId?: string,
  entityType?: string
) {
  const NotificationType = mongoose.model('NotificationType');
  const notificationType = await NotificationType.findOne({ key: notificationTypeKey });
  
  if (!notificationType) {
    throw new Error(`Notification type '${notificationTypeKey}' not found`);
  }

  return this.create({
    user_id: userId,
    triggered_by: triggeredBy,
    notification_type_id: notificationType._id,
    entity_id: entityId,
    entity_type: entityType,
    type,
    title
  });
};

NotificationSchema.statics.getNotificationStats = function(userId?: string) {
  const matchConditions = userId ? { user_id: new mongoose.Types.ObjectId(userId) } : {};
  
  return this.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: {
          type: '$type',
          is_read: '$is_read'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.type',
        total: { $sum: '$count' },
        read: {
          $sum: {
            $cond: [{ $eq: ['$_id.is_read', true] }, '$count', 0]
          }
        },
        unread: {
          $sum: {
            $cond: [{ $eq: ['$_id.is_read', false] }, '$count', 0]
          }
        }
      }
    }
  ]);
};

NotificationSchema.statics.cleanupOldNotifications = function(days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return this.deleteMany({
    is_read: true,
    read_at: { $lt: cutoffDate }
  });
};

export default mongoose.model<INotification>('Notification', NotificationSchema);
