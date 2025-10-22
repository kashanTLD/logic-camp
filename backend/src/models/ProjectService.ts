import mongoose, { Schema, Document } from 'mongoose';

// Project Service interface
export interface IProjectService extends Document {
  project_id: mongoose.Types.ObjectId;
  service_name: string;
  service_description: string;
  created_at: Date;
  updated_at: Date;
}

// Project Service schema
const ProjectServiceSchema: Schema = new Schema({
  project_id: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project ID is required'],
    index: true
  },
  service_name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    maxlength: [100, 'Service name cannot exceed 100 characters']
  },
  service_description: {
    type: String,
    trim: true,
    maxlength: [500, 'Service description cannot exceed 500 characters']
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  },
  collection: 'project_services'
});

// Compound indexes
ProjectServiceSchema.index({ project_id: 1, service_name: 1 }, { unique: true });
ProjectServiceSchema.index({ service_name: 1 });

// Static methods
ProjectServiceSchema.statics.findByProject = function(projectId: string) {
  return this.find({ project_id: projectId });
};

ProjectServiceSchema.statics.findByService = function(serviceName: string) {
  return this.find({ service_name: new RegExp(serviceName, 'i') });
};

ProjectServiceSchema.statics.getServiceUsageStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$service_name',
        usage_count: { $sum: 1 },
        projects: { $addToSet: '$project_id' }
      }
    },
    {
      $project: {
        service_name: '$_id',
        usage_count: 1,
        unique_projects: { $size: '$projects' }
      }
    },
    {
      $sort: { usage_count: -1 }
    }
  ]);
};

export default mongoose.model<IProjectService>('ProjectService', ProjectServiceSchema);
