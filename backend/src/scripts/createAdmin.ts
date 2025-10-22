import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import { hashPassword } from '../utils/passwordUtils';

// Load environment variables
dotenv.config();

interface AdminUserData {
  email: string;
  password: string;
  name: string;
  role: 'admin';
  department: string;
  designation: string;
  phone_number?: string;
}

const createAdminUser = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/logic-camp';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Handle command line arguments
    const args = process.argv.slice(2);
    const customEmail = args.find(arg => arg.startsWith('--email='))?.split('=')[1];
    const customPassword = args.find(arg => arg.startsWith('--password='))?.split('=')[1];
    const customName = args.find(arg => arg.startsWith('--name='))?.split('=')[1];
    const customDepartment = args.find(arg => arg.startsWith('--department='))?.split('=')[1];
    const customDesignation = args.find(arg => arg.startsWith('--designation='))?.split('=')[1];
    const customPhone = args.find(arg => arg.startsWith('--phone='))?.split('=')[1];

    // Admin user data (with custom overrides)
    const adminData: AdminUserData = {
      email: customEmail || 'admin@logiccamp.com',
      password: customPassword || 'Admin@123',
      name: customName || 'System Administrator',
      role: 'admin',
      department: customDepartment || 'IT',
      designation: customDesignation || 'System Administrator',
      phone_number: customPhone || '+1234567890'
    };

    if (customEmail || customPassword || customName) {
      console.log('🔧 Using custom admin credentials...');
    }

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: adminData.email });
    if (existingAdmin) {
      console.log('❌ Admin user already exists with email:', adminData.email);
      console.log('User details:', {
        name: existingAdmin.name,
        email: existingAdmin.email,
        role: existingAdmin.role,
        is_active: existingAdmin.is_active
      });
      return;
    }

    // Hash the password
    const hashedPassword = await hashPassword(adminData.password);

    // Create admin user
    const adminUser = new User({
      email: adminData.email,
      password: hashedPassword,
      name: adminData.name,
      role: adminData.role,
      department: adminData.department,
      designation: adminData.designation,
      phone_number: adminData.phone_number,
      is_active: true
    });

    await adminUser.save();

    console.log('✅ Admin user created successfully!');
    console.log('Admin credentials:');
    console.log('📧 Email:', adminData.email);
    console.log('🔑 Password:', adminData.password);
    console.log('👤 Name:', adminData.name);
    console.log('🏢 Department:', adminData.department);
    console.log('💼 Designation:', adminData.designation);
    console.log('\n⚠️  Please change the default password after first login!');

  } catch (error: any) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.code === 11000) {
      console.error('Duplicate key error - user with this email already exists');
    }
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Run the script
createAdminUser().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
