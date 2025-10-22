#!/usr/bin/env node

/**
 * Database Setup Script
 * 
 * This script sets up the MongoDB database with:
 * - All required collections
 * - Proper indexes for performance
 * - Default data seeding
 * - Validation rules
 * - Security configurations
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDatabase, getDatabaseStats, disconnectDatabase } from '../config/database';
import { 
  User, Customer, Lead, Project, ProjectService, Goal, Task, 
  File, CustomerChargeDetails, Upsell, Message, MessageAttachment,
  Notification, NotificationType, BusinessDirectory, ActivityLog
} from '../models';

// Load environment variables
dotenv.config();

// Setup configuration
interface SetupConfig {
  dropExisting: boolean;
  seedSampleData: boolean;
  createIndexes: boolean;
  validateSchema: boolean;
}

const defaultConfig: SetupConfig = {
  dropExisting: false,
  seedSampleData: true,
  createIndexes: true,
  validateSchema: true
};

// Main setup function
async function setupDatabase(config: SetupConfig = defaultConfig): Promise<void> {
  try {
    console.log('🚀 Starting database setup...');
    console.log('📋 Configuration:', config);
    
    // Connect to database
    await connectDatabase();
    
    // Drop existing collections if requested
    if (config.dropExisting) {
      await dropExistingCollections();
    }
    
    // Create collections and validate schemas
    if (config.validateSchema) {
      await validateSchemas();
    }
    
    // Create indexes
    if (config.createIndexes) {
      await createAllIndexes();
    }
    
    // Seed sample data
    if (config.seedSampleData) {
      await seedSampleData();
    }
    
    // Display database statistics
    await displayDatabaseStats();
    
    console.log('✅ Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  } finally {
    await disconnectDatabase();
  }
}

// Drop existing collections
async function dropExistingCollections(): Promise<void> {
  console.log('🗑️ Dropping existing collections...');
  
  const collections = [
    'users', 'customers', 'leads', 'projects', 'project_services',
    'goals', 'tasks', 'files', 'customer_charge_details', 'upsells',
    'messages', 'message_attachments', 'notifications', 'notification_types',
    'business_directories', 'activity_logs'
  ];
  
  for (const collectionName of collections) {
    try {
      await mongoose.connection.db.dropCollection(collectionName);
      console.log(`✅ Dropped collection: ${collectionName}`);
    } catch (error: any) {
      if (error.code === 26) {
        // Collection doesn't exist, which is fine
        console.log(`ℹ️ Collection ${collectionName} doesn't exist, skipping...`);
      } else {
        console.error(`❌ Error dropping collection ${collectionName}:`, error);
      }
    }
  }
}

// Validate all schemas
async function validateSchemas(): Promise<void> {
  console.log('🔍 Validating schemas...');
  
  const models = [
    User, Customer, Lead, Project, ProjectService, Goal, Task,
    File, CustomerChargeDetails, Upsell, Message, MessageAttachment,
    Notification, NotificationType, BusinessDirectory, ActivityLog
  ];
  
  for (const model of models) {
    try {
      await model.createCollection();
      console.log(`✅ Schema validated: ${model.collection.name}`);
    } catch (error) {
      console.error(`❌ Schema validation failed for ${model.collection.name}:`, error);
      throw error;
    }
  }
}

// Create all indexes
async function createAllIndexes(): Promise<void> {
  console.log('🔧 Creating indexes...');
  
  const models = [
    User, Customer, Lead, Project, ProjectService, Goal, Task,
    File, CustomerChargeDetails, Upsell, Message, MessageAttachment,
    Notification, NotificationType, BusinessDirectory, ActivityLog
  ];
  
  for (const model of models) {
    try {
      await model.createIndexes();
      console.log(`✅ Indexes created for: ${model.collection.name}`);
    } catch (error) {
      console.error(`❌ Index creation failed for ${model.collection.name}:`, error);
      throw error;
    }
  }
}

// Seed sample data
async function seedSampleData(): Promise<void> {
  console.log('🌱 Seeding sample data...');
  
  try {
    // Seed notification types first
    await NotificationType.seedDefaultTypes();
    console.log('✅ Notification types seeded');
    
    // Create sample admin user
    const adminUser = await User.findOneAndUpdate(
      { email: 'admin@logiccamp.com' },
      {
        email: 'admin@logiccamp.com',
        role: 'admin',
        name: 'System Administrator',
        phone_number: '+1-555-0100',
        department: 'IT',
        designation: 'System Admin',
        is_active: true
      },
      { upsert: true, new: true }
    );
    console.log('✅ Admin user created');
    
    // Create sample sales user
    const salesUser = await User.findOneAndUpdate(
      { email: 'sales@logiccamp.com' },
      {
        email: 'sales@logiccamp.com',
        role: 'sales',
        name: 'Sales Manager',
        phone_number: '+1-555-0200',
        department: 'Sales',
        designation: 'Sales Manager',
        is_active: true
      },
      { upsert: true, new: true }
    );
    console.log('✅ Sales user created');
    
    // Create sample tech user
    const techUser = await User.findOneAndUpdate(
      { email: 'tech@logiccamp.com' },
      {
        email: 'tech@logiccamp.com',
        role: 'tech',
        name: 'Technical Lead',
        phone_number: '+1-555-0300',
        department: 'Engineering',
        designation: 'Tech Lead',
        is_active: true
      },
      { upsert: true, new: true }
    );
    console.log('✅ Tech user created');
    
    // Create sample support user
    const supportUser = await User.findOneAndUpdate(
      { email: 'support@logiccamp.com' },
      {
        email: 'support@logiccamp.com',
        role: 'support',
        name: 'Support Specialist',
        phone_number: '+1-555-0400',
        department: 'Support',
        designation: 'Support Specialist',
        is_active: true
      },
      { upsert: true, new: true }
    );
    console.log('✅ Support user created');
    
    // Create sample customer
    const sampleCustomer = await Customer.findOneAndUpdate(
      { email: 'customer@example.com' },
      {
        name: 'John Doe',
        company_name: 'Example Corp',
        email: 'customer@example.com',
        phone_number: '+1-555-1000',
        status: 'active',
        notes: 'Sample customer for testing'
      },
      { upsert: true, new: true }
    );
    console.log('✅ Sample customer created');
    
    // Create sample lead
    await Lead.findOneAndUpdate(
      { email: 'lead@prospect.com' },
      {
        agent_id: salesUser._id,
        customer_name: 'Jane Smith',
        company_name: 'Prospect Inc',
        email: 'lead@prospect.com',
        phone_number: '+1-555-2000',
        status: 'new',
        priority: 'high',
        source: 'website',
        services: ['Web Development', 'SEO'],
        comments: 'Interested in our web development services'
      },
      { upsert: true, new: true }
    );
    console.log('✅ Sample lead created');
    
    // Create sample project
    const sampleProject = await Project.findOneAndUpdate(
      { name: 'Sample Website Project' },
      {
        customer_id: sampleCustomer._id,
        user_id: adminUser._id,
        name: 'Sample Website Project',
        description: 'A sample project for testing the CRM system',
        status: 'in_progress',
        services: ['Web Development', 'UI/UX Design'],
        goals: 'Create a modern, responsive website',
        total_amount: 10000,
        sale_price: 8500,
        monthly_recurring_amount: 500,
        monthly_recurring_date: 1,
        priority: 'high',
        project_comments: 'Sample project for demonstration'
      },
      { upsert: true, new: true }
    );
    console.log('✅ Sample project created');
    
    // Create sample business directory entry
    await BusinessDirectory.findOneAndUpdate(
      { business_name: 'Tech Startup LLC' },
      {
        agent_id: salesUser._id,
        owner_name: 'Mike Johnson',
        business_name: 'Tech Startup LLC',
        source: 'LinkedIn',
        email: 'mike@techstartup.com',
        phone_number: '+1-555-3000',
        status: 'prospecting',
        address: '123 Tech Street',
        country: 'USA',
        postal_code: '12345',
        industry: 'Technology',
        website: 'https://techstartup.com'
      },
      { upsert: true, new: true }
    );
    console.log('✅ Sample business directory entry created');
    
    console.log('✅ Sample data seeding completed');
    
  } catch (error) {
    console.error('❌ Error seeding sample data:', error);
    throw error;
  }
}

// Display database statistics
async function displayDatabaseStats(): Promise<void> {
  try {
    console.log('\n📊 Database Statistics:');
    console.log('========================');
    
    const stats = await getDatabaseStats();
    console.log(`Database: ${stats.database}`);
    console.log(`Collections: ${stats.collections}`);
    console.log(`Total Objects: ${stats.objects}`);
    console.log(`Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Storage Size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Indexes: ${stats.indexes}`);
    console.log(`Average Object Size: ${stats.avgObjSize} bytes`);
    
    // Count documents in each collection
    const models = [
      { name: 'Users', model: User },
      { name: 'Customers', model: Customer },
      { name: 'Leads', model: Lead },
      { name: 'Projects', model: Project },
      { name: 'Goals', model: Goal },
      { name: 'Tasks', model: Task },
      { name: 'Files', model: File },
      { name: 'Messages', model: Message },
      { name: 'Notifications', model: Notification },
      { name: 'Business Directory', model: BusinessDirectory },
      { name: 'Activity Logs', model: ActivityLog }
    ];
    
    console.log('\n📋 Collection Document Counts:');
    console.log('===============================');
    
    for (const { name, model } of models) {
      try {
        const count = await model.countDocuments();
        console.log(`${name}: ${count} documents`);
      } catch (error) {
        console.log(`${name}: Error counting documents`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error displaying database stats:', error);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  const config: SetupConfig = {
    dropExisting: args.includes('--drop'),
    seedSampleData: !args.includes('--no-seed'),
    createIndexes: !args.includes('--no-indexes'),
    validateSchema: !args.includes('--no-validate')
  };
  
  console.log('🎯 Logic Camp CRM - Database Setup');
  console.log('===================================\n');
  
  setupDatabase(config)
    .then(() => {
      console.log('\n🎉 Database setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Database setup failed:', error);
      process.exit(1);
    });
}

export { setupDatabase };
export default setupDatabase;
