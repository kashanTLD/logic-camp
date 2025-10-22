import mongoose, { Schema, Document } from 'mongoose';

// Message interface
export interface IMessage extends Document {
  sender_id: mongoose.Types.ObjectId;
  reply_to_id?: mongoose.Types.ObjectId;
  content: string;
  mentions: mongoose.Types.ObjectId[];
  is_pinned: boolean;
  pinned_by?: mongoose.Types.ObjectId;
  is_deleted: boolean;
  deleted_at?: Date;
  has_attachment: boolean;
  created_at: Date;
  updated_at: Date;
}

// Message schema
const MessageSchema: Schema = new Schema({
  sender_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender ID is required'],
    index: true
  },
  reply_to_id: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    index: true
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [5000, 'Message content cannot exceed 5000 characters']
  },
  mentions: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  is_pinned: {
    type: Boolean,
    default: false,
    index: true
  },
  pinned_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: function(v: mongoose.Types.ObjectId) {
        // pinned_by should be set only when is_pinned is true
        return this.is_pinned ? v != null : v == null;
      },
      message: 'Pinned by should be set only when message is pinned'
    }
  },
  is_deleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deleted_at: {
    type: Date,
    validate: {
      validator: function(v: Date) {
        // deleted_at should be set only when is_deleted is true
        return this.is_deleted ? v != null : v == null;
      },
      message: 'Deleted date should be set only when message is deleted'
    }
  },
  has_attachment: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  },
  collection: 'messages'
});

// Compound indexes for performance optimization
MessageSchema.index({ sender_id: 1, created_at: -1 });
MessageSchema.index({ reply_to_id: 1, created_at: 1 });
MessageSchema.index({ is_deleted: 1, created_at: -1 });
MessageSchema.index({ is_pinned: 1, created_at: -1 });
MessageSchema.index({ mentions: 1, created_at: -1 });

// Virtual for reply count
MessageSchema.virtual('reply_count', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'reply_to_id',
  count: true
});

// Virtual for time since creation
MessageSchema.virtual('time_ago').get(function() {
  const now = new Date();
  const created = new Date(this.created_at as Date);
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
MessageSchema.pre('save', function(next) {
  // Auto-set deleted_at when is_deleted changes to true
  if (this.isModified('is_deleted')) {
    if (this.is_deleted && !this.deleted_at) {
      this.deleted_at = new Date();
    } else if (!this.is_deleted) {
      this.deleted_at = undefined;
    }
  }

  // Auto-set pinned_by when is_pinned changes to true (if not already set)
  if (this.isModified('is_pinned')) {
    if (!this.is_pinned) {
      this.pinned_by = undefined;
    }
  }

  // Extract mentions from content
  if (this.isModified('content')) {
    (this as any).extractMentions();
  }

  next();
});

// Instance methods
MessageSchema.methods.toJSON = function() {
  const messageObject = this.toObject({ virtuals: true });
  
  // Don't return deleted messages content
  if (this.is_deleted) {
    messageObject.content = '[Message deleted]';
  }
  
  return messageObject;
};

MessageSchema.methods.extractMentions = function() {
  // Extract @mentions from content (simple regex pattern)
  const mentionPattern = /@(\w+)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionPattern.exec(this.content)) !== null) {
    // In a real application, you would look up users by username/email
    // For now, we'll just store the mention text
    mentions.push(match[1]);
  }
  
  // This is a simplified implementation
  // In production, you'd want to resolve usernames to ObjectIds
};

MessageSchema.methods.softDelete = function(deletedBy?: string) {
  this.is_deleted = true;
  this.deleted_at = new Date();
  return this.save();
};

MessageSchema.methods.pin = function(pinnedBy: string) {
  this.is_pinned = true;
  this.pinned_by = pinnedBy;
  return this.save();
};

MessageSchema.methods.unpin = function() {
  this.is_pinned = false;
  this.pinned_by = undefined;
  return this.save();
};

MessageSchema.methods.getReplies = function() {
  return mongoose.model('Message').find({ 
    reply_to_id: this._id,
    is_deleted: false 
  })
  .populate('sender_id', 'name email')
  .sort({ created_at: 1 });
};

MessageSchema.methods.getThread = async function() {
  const Message = mongoose.model('Message');
  
  // Get the root message
  let rootMessage: any = this;
  while (rootMessage.reply_to_id) {
    rootMessage = await Message.findById(rootMessage.reply_to_id);
    if (!rootMessage) break;
  }
  
  // Get all messages in the thread
  const threadMessages = await Message.find({
    $or: [
      { _id: rootMessage._id },
      { reply_to_id: rootMessage._id }
    ],
    is_deleted: false
  })
  .populate('sender_id', 'name email')
  .sort({ created_at: 1 });
  
  return threadMessages;
};

// Static methods
MessageSchema.statics.findActive = function(limit = 50) {
  return this.find({ is_deleted: false })
    .populate('sender_id', 'name email role')
    .populate('reply_to_id', 'content sender_id')
    .sort({ created_at: -1 })
    .limit(limit);
};

MessageSchema.statics.findBySender = function(senderId: string, limit = 50) {
  return this.find({ 
    sender_id: senderId,
    is_deleted: false 
  })
  .populate('reply_to_id', 'content sender_id')
  .sort({ created_at: -1 })
  .limit(limit);
};

MessageSchema.statics.findPinnedMessages = function() {
  return this.find({ 
    is_pinned: true,
    is_deleted: false 
  })
  .populate('sender_id', 'name email')
  .populate('pinned_by', 'name email')
  .sort({ created_at: -1 });
};

MessageSchema.statics.findWithAttachments = function() {
  return this.find({ 
    has_attachment: true,
    is_deleted: false 
  })
  .populate('sender_id', 'name email')
  .sort({ created_at: -1 });
};

MessageSchema.statics.findMentioning = function(userId: string) {
  return this.find({ 
    mentions: userId,
    is_deleted: false 
  })
  .populate('sender_id', 'name email')
  .sort({ created_at: -1 });
};

MessageSchema.statics.searchMessages = function(searchTerm: string, limit = 50) {
  return this.find({
    content: new RegExp(searchTerm, 'i'),
    is_deleted: false
  })
  .populate('sender_id', 'name email')
  .sort({ created_at: -1 })
  .limit(limit);
};

MessageSchema.statics.getMessageStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        total_messages: { $sum: 1 },
        active_messages: {
          $sum: { $cond: [{ $eq: ['$is_deleted', false] }, 1, 0] }
        },
        deleted_messages: {
          $sum: { $cond: [{ $eq: ['$is_deleted', true] }, 1, 0] }
        },
        pinned_messages: {
          $sum: { $cond: [{ $eq: ['$is_pinned', true] }, 1, 0] }
        },
        messages_with_attachments: {
          $sum: { $cond: [{ $eq: ['$has_attachment', true] }, 1, 0] }
        }
      }
    }
  ]);
};

MessageSchema.statics.getUserMessageStats = function(userId: string) {
  return this.aggregate([
    {
      $match: { sender_id: new mongoose.Types.ObjectId(userId) }
    },
    {
      $group: {
        _id: null,
        total_sent: { $sum: 1 },
        active_messages: {
          $sum: { $cond: [{ $eq: ['$is_deleted', false] }, 1, 0] }
        },
        replies_sent: {
          $sum: { $cond: [{ $ne: ['$reply_to_id', null] }, 1, 0] }
        }
      }
    }
  ]);
};

MessageSchema.statics.getActivityTimeline = function(days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        created_at: { $gte: startDate },
        is_deleted: false
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$created_at' }
        },
        message_count: { $sum: 1 },
        unique_senders: { $addToSet: '$sender_id' }
      }
    },
    {
      $project: {
        date: '$_id',
        message_count: 1,
        unique_senders: { $size: '$unique_senders' }
      }
    },
    {
      $sort: { date: 1 }
    }
  ]);
};

export default mongoose.model<IMessage>('Message', MessageSchema);
