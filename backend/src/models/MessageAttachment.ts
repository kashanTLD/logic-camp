import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

// Message Attachment interface
export interface IMessageAttachment extends Document {
  message_id: mongoose.Types.ObjectId;
  name: string;
  type: string;
  size: number;
  path: string;
  uploaded_by: mongoose.Types.ObjectId;
  created_at: Date;
}

// Message Attachment schema
const MessageAttachmentSchema: Schema = new Schema({
  message_id: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    required: [true, 'Message ID is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Attachment name is required'],
    trim: true,
    maxlength: [255, 'Attachment name cannot exceed 255 characters']
  },
  type: {
    type: String,
    required: [true, 'Attachment type is required'],
    trim: true,
    maxlength: [100, 'Attachment type cannot exceed 100 characters']
  },
  size: {
    type: Number,
    required: [true, 'Attachment size is required'],
    min: [0, 'Attachment size cannot be negative'],
    max: [50 * 1024 * 1024, 'Attachment size cannot exceed 50MB'] // 50MB limit for messages
  },
  path: {
    type: String,
    required: [true, 'Attachment path is required'],
    unique: true,
    maxlength: [500, 'Attachment path cannot exceed 500 characters']
  },
  uploaded_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader ID is required']
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: false 
  },
  collection: 'message_attachments'
});

// Indexes
MessageAttachmentSchema.index({ message_id: 1, created_at: -1 });
MessageAttachmentSchema.index({ uploaded_by: 1, created_at: -1 });
MessageAttachmentSchema.index({ type: 1 });

// Virtual for file size in human readable format
MessageAttachmentSchema.virtual('size_formatted').get(function() {
  const bytes = (this as any).size as number;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual for file extension
MessageAttachmentSchema.virtual('extension').get(function() {
  return ((this as any).name as string).split('.').pop()?.toLowerCase() || '';
});

// Pre-save middleware to generate hashed path
MessageAttachmentSchema.pre('save', function(next) {
  if (this.isNew && !(this.path as string).includes('/hashed/')) {
    const hash = crypto.createHash('sha256')
      .update((this.name as string) + Date.now() + Math.random())
      .digest('hex');
    
    const extension = (this.name as string).split('.').pop();
    this.path = `/uploads/messages/hashed/${hash}.${extension}`;
  }
  next();
});

// Post-save middleware to update message has_attachment flag
MessageAttachmentSchema.post('save', async function() {
  const Message = mongoose.model('Message');
  await Message.findByIdAndUpdate(
    this.message_id,
    { has_attachment: true }
  );
});

// Post-remove middleware to update message has_attachment flag
MessageAttachmentSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    const Message = mongoose.model('Message');
    const remainingAttachments = await mongoose.model('MessageAttachment')
      .countDocuments({ message_id: doc.message_id });
    
    if (remainingAttachments === 0) {
      await Message.findByIdAndUpdate(
        doc.message_id,
        { has_attachment: false }
      );
    }
  }
});

// Instance methods
MessageAttachmentSchema.methods.toJSON = function() {
  const attachmentObject = this.toObject({ virtuals: true });
  // Don't expose the actual file path for security
  delete attachmentObject.path;
  return attachmentObject;
};

MessageAttachmentSchema.methods.getSecureUrl = function() {
  // In a real application, this would generate a signed URL
  return `/api/messages/attachments/${this._id}/download`;
};

MessageAttachmentSchema.methods.isImage = function() {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  return imageTypes.includes(this.type.toLowerCase());
};

MessageAttachmentSchema.methods.isDocument = function() {
  const docTypes = [
    'application/pdf', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv'
  ];
  return docTypes.includes(this.type.toLowerCase());
};

MessageAttachmentSchema.methods.isVideo = function() {
  const videoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'];
  return videoTypes.includes(this.type.toLowerCase());
};

MessageAttachmentSchema.methods.isAudio = function() {
  const audioTypes = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'];
  return audioTypes.includes(this.type.toLowerCase());
};

// Static methods
MessageAttachmentSchema.statics.findByMessage = function(messageId: string) {
  return this.find({ message_id: messageId })
    .populate('uploaded_by', 'name email')
    .sort({ created_at: 1 });
};

MessageAttachmentSchema.statics.findByUploader = function(uploaderId: string) {
  return this.find({ uploaded_by: uploaderId })
    .populate('message_id', 'content sender_id')
    .sort({ created_at: -1 });
};

MessageAttachmentSchema.statics.findByType = function(fileType: string) {
  return this.find({ type: new RegExp(fileType, 'i') })
    .populate('uploaded_by', 'name email')
    .populate('message_id', 'content sender_id');
};

MessageAttachmentSchema.statics.getStorageStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        total_attachments: { $sum: 1 },
        total_size: { $sum: '$size' },
        avg_size: { $avg: '$size' }
      }
    }
  ]);
};

MessageAttachmentSchema.statics.getAttachmentTypeStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        total_size: { $sum: '$size' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

MessageAttachmentSchema.statics.getUploaderStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$uploaded_by',
        attachment_count: { $sum: 1 },
        total_size: { $sum: '$size' }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $project: {
        user_name: '$user.name',
        user_email: '$user.email',
        attachment_count: 1,
        total_size: 1
      }
    },
    {
      $sort: { total_size: -1 }
    }
  ]);
};

MessageAttachmentSchema.statics.findLargeAttachments = function(sizeThresholdMB = 10) {
  const sizeThreshold = sizeThresholdMB * 1024 * 1024; // Convert MB to bytes
  
  return this.find({ size: { $gte: sizeThreshold } })
    .populate('uploaded_by', 'name email')
    .populate('message_id', 'content sender_id created_at')
    .sort({ size: -1 });
};

MessageAttachmentSchema.statics.cleanupOrphanedAttachments = async function() {
  // Find attachments where the referenced message no longer exists
  const Message = mongoose.model('Message');
  const attachments = await this.find().populate('message_id');
  
  const orphanedIds = [];
  for (const attachment of attachments) {
    if (!attachment.message_id) {
      orphanedIds.push(attachment._id);
    }
  }
  
  if (orphanedIds.length > 0) {
    return this.deleteMany({ _id: { $in: orphanedIds } });
  }
  
  return { deletedCount: 0 };
};

export default mongoose.model<IMessageAttachment>('MessageAttachment', MessageAttachmentSchema);
