import mongoose, { Schema, Document } from 'mongoose';

// Lead interface
export interface ILead extends Document {
  agent_id: mongoose.Types.ObjectId;
  customer_name: string;
  company_name?: string;
  email?: string;
  phone_number?: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: 'website' | 'referral' | 'cold_call' | 'social_media' | 'email' | 'other';
  services: string[];
  description?: string;
  schedule?:Date;
  created_at: Date;
  updated_at: Date;
}

// Lead schema
const LeadSchema: Schema = new Schema({
  agent_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Agent ID is required'],
    index: true
  },
  customer_name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Customer name cannot exceed 100 characters']
  },
  company_name: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    index: true
  },
  phone_number: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  status: {
    type: String,
    enum: {
      values: ['new', 'contacted', 'qualified', 'converted', 'lost'],
      message: 'Status must be one of: new, contacted, qualified, converted, lost'
    },
    default: 'new',
    index: true
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'urgent'],
      message: 'Priority must be one of: low, medium, high, urgent'
    },
    default: 'medium',
    index: true
  },
  source: {
    type: String,
    enum: {
      values: ['website', 'referral', 'cold_call', 'social_media', 'email', 'other'],
      message: 'Source must be one of: website, referral, cold_call, social_media, email, other'
    },
    required: [true, 'Lead source is required']
  },
  services: [{
    type: String,
    trim: true,
    maxlength: [50, 'Service name cannot exceed 50 characters']
  }],
  description: {
    type: String,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  schedule:{
    type: Date,
    
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  },
  collection: 'leads'
});

// Compound indexes for performance optimization
LeadSchema.index({ agent_id: 1, status: 1 });
LeadSchema.index({ status: 1, priority: 1 });
LeadSchema.index({ status: 1, created_at: -1 });
LeadSchema.index({ email: 1, status: 1 });
LeadSchema.index({ source: 1, status: 1 });

// Pre-save middleware
LeadSchema.pre('save', function(next) {
  if (this.isModified('email') && this.email) {
    this.email = (this.email as string).toLowerCase();
  }
  next();
});

// Instance methods
LeadSchema.methods.toJSON = function() {
  const leadObject = this.toObject();
  return leadObject;
};

LeadSchema.methods.convertToCustomer = function() {
  this.status = 'converted';
  return this.save();
};

// Static methods
LeadSchema.statics.findByAgent = function(agentId: string) {
  return this.find({ 
    agent_id: agentId,
    status: { $nin: ['converted', 'lost'] }
  });
};

LeadSchema.statics.findByStatus = function(status: string) {
  return this.find({ status });
};

LeadSchema.statics.findHighPriorityLeads = function() {
  return this.find({ 
    priority: { $in: ['high', 'urgent'] },
    status: { $nin: ['converted', 'lost'] }
  }).sort({ priority: -1, created_at: -1 });
};

LeadSchema.statics.getLeadsBySource = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$source',
        count: { $sum: 1 },
        converted: {
          $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        source: '$_id',
        count: 1,
        converted: 1,
        conversion_rate: { 
          $multiply: [{ $divide: ['$converted', '$count'] }, 100] 
        }
      }
    }
  ]);
};

export default mongoose.model<ILead>('Lead', LeadSchema);
