import mongoose, { Schema, Document } from 'mongoose';

// Business Directory interface
export interface IBusinessDirectory extends Document {
  agent_id?: mongoose.Types.ObjectId;
  owner_name?: string;
  business_name: string;
  source?: string;
  email?: string;
  phone_number?: string;
  status: 'prospecting' | 'contacted' | 'interested' | 'not_interested';
  address?: string;
  country?: string;
  postal_code?: string;
  industry?: string;
  website?: string;
  created_at: Date;
  updated_at: Date;
}

// Business Directory schema
const BusinessDirectorySchema: Schema = new Schema({
  agent_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    validate: {
      validator: async function(v: mongoose.Types.ObjectId) {
        if (!v) return true; // Optional field
        const User = mongoose.model('User');
        const user = await User.findById(v);
        return user && (user.role === 'sales' || user.role === 'admin' || user.role === 'manager');
      },
      message: 'Agent must have sales, admin, or manager role'
    }
  },
  owner_name: {
    type: String,
    trim: true,
    maxlength: [100, 'Owner name cannot exceed 100 characters']
  },
  business_name: {
    type: String,
    required: [true, 'Business name is required'],
    trim: true,
    maxlength: [200, 'Business name cannot exceed 200 characters'],
    index: true
  },
  source: {
    type: String,
    trim: true,
    maxlength: [100, 'Source cannot exceed 100 characters']
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
    match: [/^[\+]?[1-9][\d\-\(\)\s]{0,20}$/, 'Please enter a valid phone number']
  },
  status: {
    type: String,
    enum: {
      values: ['prospecting', 'contacted', 'interested', 'not_interested'],
      message: 'Status must be one of: prospecting, contacted, interested, not_interested'
    },
    default: 'prospecting',
    index: true
  },
  address: {
    type: String,
    trim: true,
    maxlength: [300, 'Address cannot exceed 300 characters']
  },
  country: {
    type: String,
    trim: true,
    maxlength: [50, 'Country cannot exceed 50 characters']
  },
  postal_code: {
    type: String,
    trim: true,
    maxlength: [20, 'Postal code cannot exceed 20 characters']
  },
  industry: {
    type: String,
    trim: true,
    maxlength: [100, 'Industry cannot exceed 100 characters'],
    index: true
  },
  website: {
    type: String,
    trim: true,
    maxlength: [200, 'Website URL cannot exceed 200 characters'],
    validate: {
      validator: function(v: string) {
        if (!v) return true;
        // Basic URL validation
        return /^https?:\/\/.+\..+/.test(v);
      },
      message: 'Please enter a valid website URL'
    }
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  },
  collection: 'business_directories'
});

// Compound indexes for performance optimization
BusinessDirectorySchema.index({ agent_id: 1, status: 1 });
BusinessDirectorySchema.index({ business_name: 1, status: 1 });
BusinessDirectorySchema.index({ email: 1, status: 1 });
BusinessDirectorySchema.index({ industry: 1, status: 1 });
BusinessDirectorySchema.index({ country: 1, industry: 1 });
BusinessDirectorySchema.index({ status: 1, created_at: -1 });

// Text index for search functionality
BusinessDirectorySchema.index({
  business_name: 'text',
  owner_name: 'text',
  industry: 'text',
  address: 'text'
});

// Virtual for full address
BusinessDirectorySchema.virtual('full_address').get(function() {
  const parts: string[] = [];
  if (this.address) parts.push(this.address as string);
  if (this.country) parts.push(this.country as string);
  if (this.postal_code) parts.push(this.postal_code as string);
  return parts.join(', ');
});

// Virtual for contact info completeness
BusinessDirectorySchema.virtual('contact_completeness').get(function() {
  let score = 0;
  const fields = ['email', 'phone_number', 'website', 'address'];
  
  fields.forEach(field => {
    if ((this as any)[field]) score += 25;
  });
  
  return score;
});

// Pre-save middleware
BusinessDirectorySchema.pre('save', function(next) {
  if (this.isModified('email') && this.email) {
    this.email = (this.email as string).toLowerCase();
  }
  
  if (this.isModified('website') && this.website) {
    // Ensure website has protocol
    const website = this.website as string;
    if (!website.startsWith('http://') && !website.startsWith('https://')) {
      this.website = 'https://' + website;
    }
  }
  
  next();
});

// Instance methods
BusinessDirectorySchema.methods.toJSON = function() {
  const businessObject = this.toObject({ virtuals: true });
  return businessObject;
};

BusinessDirectorySchema.methods.markAsContacted = function() {
  this.status = 'contacted';
  return this.save();
};

BusinessDirectorySchema.methods.markAsInterested = function() {
  this.status = 'interested';
  return this.save();
};

BusinessDirectorySchema.methods.markAsNotInterested = function() {
  this.status = 'not_interested';
  return this.save();
};

BusinessDirectorySchema.methods.convertToLead = async function(agentId: string, services: string[] = []) {
  const Lead = mongoose.model('Lead');
  
  const leadData = {
    agent_id: agentId,
    customer_name: this.owner_name || 'Unknown',
    company_name: this.business_name,
    email: this.email,
    phone_number: this.phone_number,
    status: 'new',
    priority: 'medium',
    source: 'business_directory',
    services: services,
    comments: `Converted from business directory. Original source: ${this.source || 'Unknown'}`
  };
  
  const lead = await Lead.create(leadData);
  
  // Update business directory status
  this.status = 'contacted';
  await this.save();
  
  return lead;
};

// Static methods
BusinessDirectorySchema.statics.findByAgent = function(agentId: string) {
  return this.find({ agent_id: agentId }).sort({ created_at: -1 });
};

BusinessDirectorySchema.statics.findByStatus = function(status: string) {
  return this.find({ status }).sort({ created_at: -1 });
};

BusinessDirectorySchema.statics.findByIndustry = function(industry: string) {
  return this.find({ 
    industry: new RegExp(industry, 'i') 
  }).sort({ business_name: 1 });
};

BusinessDirectorySchema.statics.findByCountry = function(country: string) {
  return this.find({ 
    country: new RegExp(country, 'i') 
  }).sort({ business_name: 1 });
};

BusinessDirectorySchema.statics.searchBusinesses = function(searchTerm: string, limit = 50) {
  return this.find({
    $text: { $search: searchTerm }
  }, {
    score: { $meta: 'textScore' }
  })
  .sort({ score: { $meta: 'textScore' } })
  .limit(limit);
};

BusinessDirectorySchema.statics.findProspects = function() {
  return this.find({ 
    status: { $in: ['prospecting', 'contacted'] }
  })
  .populate('agent_id', 'name email')
  .sort({ created_at: -1 });
};

BusinessDirectorySchema.statics.findQualifiedLeads = function() {
  return this.find({ 
    status: 'interested',
    email: { $exists: true, $ne: null }
  })
  .populate('agent_id', 'name email')
  .sort({ created_at: -1 });
};

BusinessDirectorySchema.statics.getIndustryStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$industry',
        count: { $sum: 1 },
        interested: {
          $sum: { $cond: [{ $eq: ['$status', 'interested'] }, 1, 0] }
        },
        contacted: {
          $sum: { $cond: [{ $eq: ['$status', 'contacted'] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        industry: '$_id',
        count: 1,
        interested: 1,
        contacted: 1,
        interest_rate: {
          $multiply: [
            { $divide: ['$interested', '$count'] },
            100
          ]
        }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

BusinessDirectorySchema.statics.getCountryStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$country',
        count: { $sum: 1 },
        industries: { $addToSet: '$industry' }
      }
    },
    {
      $project: {
        country: '$_id',
        count: 1,
        unique_industries: { $size: '$industries' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

BusinessDirectorySchema.statics.getAgentPerformance = function() {
  return this.aggregate([
    {
      $match: {
        agent_id: { $exists: true }
      }
    },
    {
      $group: {
        _id: '$agent_id',
        total_businesses: { $sum: 1 },
        contacted: {
          $sum: { $cond: [{ $eq: ['$status', 'contacted'] }, 1, 0] }
        },
        interested: {
          $sum: { $cond: [{ $eq: ['$status', 'interested'] }, 1, 0] }
        },
        not_interested: {
          $sum: { $cond: [{ $eq: ['$status', 'not_interested'] }, 1, 0] }
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'agent'
      }
    },
    {
      $unwind: '$agent'
    },
    {
      $project: {
        agent_name: '$agent.name',
        agent_email: '$agent.email',
        total_businesses: 1,
        contacted: 1,
        interested: 1,
        not_interested: 1,
        conversion_rate: {
          $multiply: [
            { $divide: ['$interested', '$total_businesses'] },
            100
          ]
        }
      }
    },
    {
      $sort: { conversion_rate: -1 }
    }
  ]);
};

BusinessDirectorySchema.statics.getSourceAnalysis = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$source',
        count: { $sum: 1 },
        interested_count: {
          $sum: { $cond: [{ $eq: ['$status', 'interested'] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        source: '$_id',
        count: 1,
        interested_count: 1,
        quality_score: {
          $multiply: [
            { $divide: ['$interested_count', '$count'] },
            100
          ]
        }
      }
    },
    {
      $sort: { quality_score: -1 }
    }
  ]);
};

export default mongoose.model<IBusinessDirectory>('BusinessDirectory', BusinessDirectorySchema);
