import mongoose, { Schema, Document } from 'mongoose';

// User interface
export interface IUser extends Document {
  email: string;
  role: 'admin' | 'sales' | 'support' | 'tech' | 'manager';
  name: string;
  password:string;
  phone_number?: string;
  department?: string;
  designation?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// User schema
const UserSchema: Schema = new Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    index: true
  },
  role: {
    type: String,
    enum: {
      values: ['admin', 'sales', 'support', 'tech', 'manager'],
      message: 'Role must be one of: admin, sales, support, tech, manager'
    },
    required: [true, 'Role is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
   password: {
    type: String,
    required: [true, 'Password is required'],
  },
  phone_number: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  department: {
    type: String,
    trim: true,
    maxlength: [50, 'Department cannot exceed 50 characters']
  },
  designation: {
    type: String,
    trim: true,
    maxlength: [50, 'Designation cannot exceed 50 characters']
  },
  is_active: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  },
  collection: 'users'
});

// Compound indexes for performance optimization
UserSchema.index({ role: 1, is_active: 1 });
UserSchema.index({ email: 1, is_active: 1 });
UserSchema.index({ department: 1, role: 1 });

// Pre-save middleware for data validation
UserSchema.pre('save', function(next) {
  if (this.isModified('email')) {
    this.email = (this.email as string).toLowerCase();
  }
  next();
});

// Instance methods
UserSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  return userObject;
};

// Static methods
UserSchema.statics.findActiveUsers = function() {
  return this.find({ is_active: true });
};

UserSchema.statics.findByRole = function(role: string) {
  return this.find({ role, is_active: true });
};

export default mongoose.model<IUser>('User', UserSchema);
