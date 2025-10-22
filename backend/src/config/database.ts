import mongoose from 'mongoose';
import { initializeModels, validateModels } from '../models';
import { NotificationType } from '../models';
import { logger } from '../utils/logger';

// Database configuration interface
interface DatabaseConfig {
  uri: string;
  options: mongoose.ConnectOptions;
}

// Get database configuration
const getDatabaseConfig = (): DatabaseConfig => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/logic-camp';
  
  const options: mongoose.ConnectOptions = {
    // Connection pool options
    maxPoolSize: 10, // Maintain up to 10 socket connections
    minPoolSize: 2, // Maintain at least 2 connections
    
    // Timeout options
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds
    connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
    
    // Heartbeat options
    heartbeatFrequencyMS: 10000, // Check server status every 10 seconds
    
    // Buffering options (handled by mongoose internally in newer versions)
    
    // Additional options for production
    retryWrites: true,
    w: 'majority'
  };
  
  return { uri, options };
};

// Initialize database connection
export const connectDatabase = async (): Promise<void> => {
  try {
    const { uri, options } = getDatabaseConfig();
    
    logger.dbInfo('Connecting to MongoDB...');
    logger.dbDebug('Database URI:', uri.replace(/\/\/.*@/, '//***:***@')); // Hide credentials in logs
    
    // Connect to MongoDB
    await mongoose.connect(uri, options);
    
    logger.success('Connected to MongoDB successfully');
    logger.dbDebug('Database name:', mongoose.connection.name);
    logger.dbDebug('Host:', mongoose.connection.host);
    logger.dbDebug('Port:', mongoose.connection.port);
    
    // Initialize models
    await initializeModels();
    
    // Validate models
    await validateModels();
    
    // Setup database event listeners
    setupEventListeners();
    
    // Create indexes
    await createIndexes();
    
    // Seed default data
    await seedDefaultData();
    
    logger.success('Database initialization completed successfully');
    
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

// Setup database event listeners
const setupEventListeners = (): void => {
  const db = mongoose.connection;
  
  db.on('error', (error) => {
    logger.error('MongoDB connection error:', error);
  });
  
  db.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
  
  db.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    } catch (error) {
      logger.error('Error during MongoDB shutdown:', error);
      process.exit(1);
    }
  });
};

// Create database indexes
const createIndexes = async (): Promise<void> => {
  try {
    logger.dbDebug('Creating database indexes...');
    
    const collections = await mongoose.connection.db!.listCollections().toArray();
    
    for (const collection of collections) {
      const model = mongoose.models[collection.name];
      if (model) {
        await model.createIndexes();
        logger.dbDebug(`Indexes created for ${collection.name}`);
      }
    }
    
    logger.dbDebug('All indexes created successfully');
  } catch (error) {
    logger.error('Error creating indexes:', error);
    throw error;
  }
};

// Seed default data
const seedDefaultData = async (): Promise<void> => {
  try {
    logger.dbDebug('Seeding default data...');
    
    // Seed notification types
    // Seed notification types if the method exists
    if ('seedDefaultTypes' in NotificationType) {
      await (NotificationType as any).seedDefaultTypes();
    }
    logger.dbDebug('Default notification types seeded');
    
    // Add more seeding as needed
    logger.dbDebug('Default data seeding completed');
    
  } catch (error) {
    logger.error('Error seeding default data:', error);
    // Don't throw error for seeding failures, just log them
  }
};

// Database health check
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    // Check connection state
    if (mongoose.connection.readyState !== 1) {
      return false;
    }
    
    // Ping database
    await mongoose.connection.db!.admin().ping();
    
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
};

// Get database statistics
export const getDatabaseStats = async (): Promise<any> => {
  try {
    const stats = await mongoose.connection.db!.stats();
    const collections = await mongoose.connection.db!.listCollections().toArray();
    
    return {
      database: mongoose.connection.name,
      collections: collections.length,
      dataSize: stats.dataSize,
      storageSize: stats.storageSize,
      indexes: stats.indexes,
      objects: stats.objects,
      avgObjSize: stats.avgObjSize
    };
  } catch (error) {
    logger.error('Error getting database stats:', error);
    throw error;
  }
};

// Disconnect from database
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
};

// Export mongoose instance for direct access if needed
export { mongoose };

export default {
  connect: connectDatabase,
  disconnect: disconnectDatabase,
  health: checkDatabaseHealth,
  stats: getDatabaseStats
};
