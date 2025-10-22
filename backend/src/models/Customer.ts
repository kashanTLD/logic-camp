import mongoose, { Schema, Document } from 'mongoose';

// Customer interface
export interface ICustomer extends Document {
  name: string;
  company_name?: string;
  email?: string;
  phone_number?: string;
  status: 'active' | 'inactive';
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// Customer schema
const CustomerSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  company_name: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters'],
    index: true
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
      values: ['active', 'inactive', 'potential'],
      message: 'Status must be one of: active, inactive, potential'
    },
    default: 'potential',
    index: true
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  },
  collection: 'customers'
});

// Compound indexes for performance optimization
CustomerSchema.index({ email: 1, status: 1 });
CustomerSchema.index({ company_name: 1, status: 1 });
CustomerSchema.index({ status: 1, created_at: -1 });

// Pre-save middleware
CustomerSchema.pre('save', function(next) {
  if (this.isModified('email') && this.email) {
    this.email = (this.email as string).toLowerCase();
  }
  next();
});

// Instance methods
CustomerSchema.methods.toJSON = function() {
  const customerObject = this.toObject();
  return customerObject;
};

// Static methods
CustomerSchema.statics.findActiveCustomers = function() {
  return this.find({ status: 'active' });
};

CustomerSchema.statics.findByCompany = function(companyName: string) {
  return this.find({ 
    company_name: new RegExp(companyName, 'i'),
    status: { $ne: 'inactive' }
  });
};

CustomerSchema.statics.searchCustomers = function(searchTerm: string) {
  const regex = new RegExp(searchTerm, 'i');
  return this.find({
    $or: [
      { name: regex },
      { company_name: regex },
      { email: regex }
    ],
    status: { $ne: 'inactive' }
  });
};

export default mongoose.model<ICustomer>('Customer', CustomerSchema);
