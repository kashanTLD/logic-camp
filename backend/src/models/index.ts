// MongoDB Models Export
// This file serves as the main entry point for all database models

// Core Models
export { default as User, IUser } from './User';
export { default as Customer, ICustomer } from './Customer';
export { default as Lead, ILead } from './Lead';
export { default as Project, IProject } from './Project';
export { default as ProjectService, IProjectService } from './ProjectService';

// Task Management Models
export { default as Goal, IGoal } from './Goal';
export { default as Task, ITask } from './Task';

// Status Management Models
export { default as ProjectStatus, IProjectStatus } from './ProjectStatus';
export { default as GoalStatus, IGoalStatus } from './GoalStatus';
export { default as TaskStatus, ITaskStatus } from './TaskStatus';

// File Management Models
export { default as File, IFile } from './File';

// Financial Models
export { default as Upsell, IUpsell } from './Upsell';

// Communication Models
export { default as Message, IMessage } from './Message';
export { default as MessageAttachment, IMessageAttachment } from './MessageAttachment';

// Notification Models
export { default as Notification, INotification } from './Notification';
export { default as NotificationType, INotificationType } from './NotificationType';

// Business Directory Models
export { default as BusinessDirectory, IBusinessDirectory } from './BusinessDirectory';

// Audit Models
export { default as ActivityLog, IActivityLog } from './ActivityLog';

import { logger } from '../utils/logger';

// Model initialization function
export const initializeModels = async () => {
  logger.dbDebug('Initializing MongoDB models...');
  
  try {
    // Import all models to ensure they are registered with Mongoose
    await Promise.all([
      import('./User'),
      import('./Customer'),
      import('./Lead'),
      import('./Project'),
      import('./ProjectService'),
      import('./Goal'),
      import('./Task'),
      import('./ProjectStatus'),
      import('./GoalStatus'),
      import('./TaskStatus'),
      import('./File'),
      import('./Upsell'),
      import('./Message'),
      import('./MessageAttachment'),
      import('./Notification'),
      import('./NotificationType'),
      import('./BusinessDirectory'),
      import('./ActivityLog')
    ]);
    
    logger.success('All models initialized successfully');
    return true;
  } catch (error) {
    logger.error('Error initializing models:', error);
    throw error;
  }
};

// Model validation function
export const validateModels = async () => {
  logger.dbDebug('Validating model schemas...');
  
  const models = [
    'User', 'Customer', 'Lead', 'Project', 'ProjectService',
    'Goal', 'Task', 'ProjectStatus', 'GoalStatus', 'TaskStatus',
    'File', 'Upsell',
    'Message', 'MessageAttachment', 'Notification', 'NotificationType',
    'BusinessDirectory', 'ActivityLog'
  ];
  
  const mongoose = require('mongoose');
  
  for (const modelName of models) {
    try {
      const model = mongoose.model(modelName);
      logger.dbDebug(`${modelName} model is valid`);
    } catch (error) {
      logger.error(`${modelName} model validation failed:`, error);
      throw error;
    }
  }
  
  logger.success('All models validated successfully');
  return true;
};
