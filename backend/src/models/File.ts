import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

// File interface
export interface IFile extends Document {
  project_id: mongoose.Types.ObjectId;
  uploaded_by: mongoose.Types.ObjectId;
  name: string;
  type: string;
  size: number;
  path: string;
  created_at: Date;
}

// File schema
const FileSchema: Schema = new Schema({
  project_id: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project ID is required'],
    index: true
  },
  uploaded_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader ID is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'File name is required'],
    trim: true,
    maxlength: [255, 'File name cannot exceed 255 characters']
  },
  type: {
    type: String,
    required: [true, 'File type is required'],
    trim: true,
    maxlength: [100, 'File type cannot exceed 100 characters']
  },
  size: {
    type: Number,
    required: [true, 'File size is required'],
    min: [0, 'File size cannot be negative'],
    max: [100 * 1024 * 1024, 'File size cannot exceed 100MB'] // 100MB limit
  },
  path: {
    type: String,
    required: [true, 'File path is required'],
    unique: true,
    maxlength: [500, 'File path cannot exceed 500 characters']
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: false 
  },
  collection: 'files'
});

// Compound indexes
FileSchema.index({ project_id: 1, created_at: -1 });
FileSchema.index({ uploaded_by: 1, created_at: -1 });
FileSchema.index({ type: 1, project_id: 1 });

// Virtual for file size in human readable format
FileSchema.virtual('size_formatted').get(function() {
  const bytes = (this as any).size as number;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual for file extension
FileSchema.virtual('extension').get(function() {
  return ((this as any).name as string).split('.').pop()?.toLowerCase() || '';
});

// Pre-save middleware to generate hashed path
FileSchema.pre('save', function(next) {
  if (this.isNew && !(this.path as string).includes('/hashed/')) {
    const hash = crypto.createHash('sha256')
      .update((this.name as string) + Date.now() + Math.random())
      .digest('hex');
    
    const extension = (this.name as string).split('.').pop();
    this.path = `/uploads/hashed/${hash}.${extension}`;
  }
  next();
});

// Instance methods
FileSchema.methods.toJSON = function() {
  const fileObject = this.toObject({ virtuals: true });
  // Don't expose the actual file path for security
  delete fileObject.path;
  return fileObject;
};

FileSchema.methods.getSecureUrl = function() {
  // In a real application, this would generate a signed URL
  return `/api/files/${this._id}/download`;
};

FileSchema.methods.isImage = function() {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  return imageTypes.includes(this.type.toLowerCase());
};

FileSchema.methods.isDocument = function() {
  const docTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  return docTypes.includes(this.type.toLowerCase());
};

// Static methods
FileSchema.statics.findByProject = function(projectId: string) {
  return this.find({ project_id: projectId })
    .populate('uploaded_by', 'name email')
    .sort({ created_at: -1 });
};

FileSchema.statics.findByUploader = function(uploaderId: string) {
  return this.find({ uploaded_by: uploaderId })
    .populate('project_id', 'name')
    .sort({ created_at: -1 });
};

FileSchema.statics.findByType = function(fileType: string) {
  return this.find({ type: new RegExp(fileType, 'i') })
    .populate('uploaded_by', 'name email')
    .populate('project_id', 'name');
};

FileSchema.statics.getStorageStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        total_files: { $sum: 1 },
        total_size: { $sum: '$size' },
        avg_size: { $avg: '$size' }
      }
    }
  ]);
};

FileSchema.statics.getFileTypeStats = function() {
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

FileSchema.statics.getProjectFileStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$project_id',
        file_count: { $sum: 1 },
        total_size: { $sum: '$size' }
      }
    },
    {
      $lookup: {
        from: 'projects',
        localField: '_id',
        foreignField: '_id',
        as: 'project'
      }
    },
    {
      $unwind: '$project'
    },
    {
      $project: {
        project_name: '$project.name',
        file_count: 1,
        total_size: 1
      }
    },
    {
      $sort: { total_size: -1 }
    }
  ]);
};

export default mongoose.model<IFile>('File', FileSchema);
