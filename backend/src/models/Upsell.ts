import mongoose, { Schema, Document } from 'mongoose';

// Upsell interface
export interface IUpsell extends Document {
  project_id: mongoose.Types.ObjectId;
  amount: number;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_date?: Date;
  comments?: string;
  created_at: Date;
  updated_at: Date;
}

// Upsell schema
const UpsellSchema: Schema = new Schema({
  project_id: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project ID is required'],
    index: true
  },
  amount: {
    type: Number,
    required: [true, 'Upsell amount is required'],
    min: [0, 'Amount cannot be negative'],
    validate: {
      validator: function(v: number) {
        return v > 0;
      },
      message: 'Upsell amount must be greater than zero'
    }
  },
  payment_status: {
    type: String,
    enum: {
      values: ['pending', 'paid', 'failed', 'refunded'],
      message: 'Payment status must be one of: pending, paid, failed, refunded'
    },
    default: 'pending',
    index: true
  },
  payment_date: {
    type: Date,
    validate: {
      validator: function(v: Date) {
        // Payment date should be set when status is 'paid'
        if (this.payment_status === 'paid') {
          return v != null;
        }
        return true;
      },
      message: 'Payment date is required when status is paid'
    }
  },
  comments: {
    type: String,
    trim: true,
    maxlength: [1000, 'Comments cannot exceed 1000 characters']
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  },
  collection: 'upsells'
});

// Compound indexes
UpsellSchema.index({ project_id: 1, payment_status: 1 });
UpsellSchema.index({ payment_status: 1, created_at: -1 });
UpsellSchema.index({ payment_date: -1 });

// Virtual for days since creation
UpsellSchema.virtual('days_since_created').get(function() {
  const now = new Date();
  const created = new Date(this.created_at as Date);
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
});

// Virtual for payment processing time
UpsellSchema.virtual('payment_processing_days').get(function() {
  if (this.payment_date) {
    const paymentDate = new Date(this.payment_date as Date);
    const created = new Date(this.created_at as Date);
    return Math.floor((paymentDate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Pre-save middleware
UpsellSchema.pre('save', function(next) {
  // Auto-set payment_date when status changes to paid
  if (this.isModified('payment_status')) {
    if (this.payment_status === 'paid' && !this.payment_date) {
      this.payment_date = new Date();
    } else if (this.payment_status !== 'paid' && this.payment_status !== 'refunded') {
      this.payment_date = undefined;
    }
  }
  next();
});

// Instance methods
UpsellSchema.methods.toJSON = function() {
  const upsellObject = this.toObject({ virtuals: true });
  return upsellObject;
};

UpsellSchema.methods.markAsPaid = function(paymentDate?: Date) {
  this.payment_status = 'paid';
  this.payment_date = paymentDate || new Date();
  return this.save();
};

UpsellSchema.methods.markAsFailed = function(reason?: string) {
  this.payment_status = 'failed';
  if (reason) {
    this.comments = (this.comments ? this.comments + '\n' : '') + `Failed: ${reason}`;
  }
  return this.save();
};

UpsellSchema.methods.processRefund = function(reason?: string) {
  this.payment_status = 'refunded';
  if (reason) {
    this.comments = (this.comments ? this.comments + '\n' : '') + `Refunded: ${reason}`;
  }
  return this.save();
};

// Static methods
UpsellSchema.statics.findByProject = function(projectId: string) {
  return this.find({ project_id: projectId }).sort({ created_at: -1 });
};

UpsellSchema.statics.findByStatus = function(status: string) {
  return this.find({ payment_status: status }).sort({ created_at: -1 });
};

UpsellSchema.statics.findPendingUpsells = function() {
  return this.find({ payment_status: 'pending' })
    .populate('project_id', 'name customer_id')
    .sort({ created_at: 1 });
};

UpsellSchema.statics.findOverdueUpsells = function(days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return this.find({
    payment_status: 'pending',
    created_at: { $lt: cutoffDate }
  })
  .populate('project_id', 'name customer_id')
  .sort({ created_at: 1 });
};

UpsellSchema.statics.getUpsellStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$payment_status',
        count: { $sum: 1 },
        total_amount: { $sum: '$amount' },
        avg_amount: { $avg: '$amount' }
      }
    }
  ]);
};

UpsellSchema.statics.getMonthlyUpsellRevenue = function() {
  return this.aggregate([
    {
      $match: {
        payment_status: 'paid',
        payment_date: { $exists: true }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$payment_date' },
          month: { $month: '$payment_date' }
        },
        total_revenue: { $sum: '$amount' },
        upsell_count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': -1, '_id.month': -1 }
    }
  ]);
};

UpsellSchema.statics.getProjectUpsellSummary = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$project_id',
        total_upsells: { $sum: 1 },
        total_amount: { $sum: '$amount' },
        paid_amount: {
          $sum: {
            $cond: [{ $eq: ['$payment_status', 'paid'] }, '$amount', 0]
          }
        },
        pending_amount: {
          $sum: {
            $cond: [{ $eq: ['$payment_status', 'pending'] }, '$amount', 0]
          }
        }
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
        total_upsells: 1,
        total_amount: 1,
        paid_amount: 1,
        pending_amount: 1,
        conversion_rate: {
          $multiply: [
            { $divide: ['$paid_amount', '$total_amount'] },
            100
          ]
        }
      }
    },
    {
      $sort: { total_amount: -1 }
    }
  ]);
};

UpsellSchema.statics.getPaymentTrends = function(months = 12) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  return this.aggregate([
    {
      $match: {
        created_at: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$created_at' },
          month: { $month: '$created_at' },
          status: '$payment_status'
        },
        count: { $sum: 1 },
        amount: { $sum: '$amount' }
      }
    },
    {
      $group: {
        _id: {
          year: '$_id.year',
          month: '$_id.month'
        },
        statuses: {
          $push: {
            status: '$_id.status',
            count: '$count',
            amount: '$amount'
          }
        },
        total_count: { $sum: '$count' },
        total_amount: { $sum: '$amount' }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);
};

export default mongoose.model<IUpsell>('Upsell', UpsellSchema);
