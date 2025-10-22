# Logic Camp CRM - MongoDB Database Schema

## Overview

This document describes the comprehensive MongoDB database schema for the Logic Camp CRM system. The schema is designed to handle customer relationship management, project tracking, task management, file storage, notifications, and business directory functionality.

## Database Architecture

### Core Collections

#### 1. Users Collection
- **Purpose**: Store system users (admin, sales, support, tech, manager)
- **Key Features**: Role-based access control, department management
- **Indexes**: email (unique), role, is_active, compound indexes for performance

#### 2. Customers Collection
- **Purpose**: Store customer information
- **Key Features**: Company association, contact details, status tracking
- **Indexes**: email, company_name, status

#### 3. Leads Collection
- **Purpose**: Manage sales leads and prospects
- **Key Features**: Agent assignment, priority levels, source tracking, conversion tracking
- **Indexes**: agent_id, status, priority, compound indexes

#### 4. Projects Collection
- **Purpose**: Project management and tracking
- **Key Features**: Customer association, financial tracking, recurring billing, team management
- **Indexes**: customer_id, user_id, status, priority

### Task Management Collections

#### 5. Goals Collection
- **Purpose**: Project goal definition and tracking
- **Key Features**: Support employee assignment, file attachments
- **Indexes**: project_id, support_employee_id

#### 6. Tasks Collection
- **Purpose**: Individual task management
- **Key Features**: Time tracking, status management, goal association
- **Indexes**: project_id, goal_id, tech_employee_id, status

### Supporting Collections

#### 7. Project Services Collection
- **Purpose**: Track services provided per project
- **Key Features**: Service categorization, usage statistics

#### 8. Files Collection
- **Purpose**: File storage and management
- **Key Features**: Role-based access, hashed paths, metadata tracking
- **Security**: Encrypted file paths, access control

#### 9. Customer Charge Details Collection
- **Purpose**: Payment and billing information
- **Key Features**: Encrypted card data, billing address management
- **Security**: AES-256 encryption for sensitive data

#### 10. Upsells Collection
- **Purpose**: Additional sales tracking
- **Key Features**: Payment status tracking, revenue analytics

### Communication Collections

#### 11. Messages Collection
- **Purpose**: Internal messaging system
- **Key Features**: Threading, mentions, pinning, soft delete
- **Indexes**: sender_id, reply_to_id, mentions

#### 12. Message Attachments Collection
- **Purpose**: File attachments for messages
- **Key Features**: Type detection, size limits, secure URLs

### Notification System

#### 13. Notifications Collection
- **Purpose**: System notifications
- **Key Features**: Read/unread tracking, entity linking, auto-cleanup
- **Indexes**: user_id, is_read, entity references

#### 14. Notification Types Collection
- **Purpose**: Template management for notifications
- **Key Features**: Template rendering, default types seeding

### Business Intelligence

#### 15. Business Directories Collection
- **Purpose**: Business prospect management
- **Key Features**: Lead conversion, industry tracking, agent performance
- **Indexes**: Text search, industry, country, status

#### 16. Activity Logs Collection
- **Purpose**: Audit trail and activity tracking
- **Key Features**: Polymorphic entity references, data sanitization, TTL cleanup
- **Indexes**: Time-based queries, entity tracking

## Security Features

### Data Encryption
- **Card Numbers**: AES-256 encryption
- **CVV Codes**: AES-256 encryption
- **File Paths**: SHA-256 hashing

### Access Control
- **Role-Based**: Admin, Sales, Support, Tech, Manager roles
- **File Access**: Project-based file access control
- **Data Sanitization**: Automatic PII redaction in logs

### Audit Trail
- **Complete Tracking**: All CRUD operations logged
- **Data Changes**: Before/after state capture
- **User Actions**: Full user activity tracking

## Performance Optimizations

### Indexing Strategy
- **Single Field Indexes**: High-frequency query fields
- **Compound Indexes**: Multi-field query optimization
- **Text Indexes**: Full-text search capabilities
- **TTL Indexes**: Automatic cleanup of old data

### Query Optimization
- **Aggregation Pipelines**: Complex reporting queries
- **Population Strategy**: Efficient relationship loading
- **Pagination**: Large dataset handling

## Data Relationships

### Primary Relationships
- **Users → Projects**: One-to-Many (Project Manager)
- **Customers → Projects**: One-to-Many
- **Projects → Goals**: One-to-Many
- **Goals → Tasks**: One-to-Many
- **Users → Leads**: One-to-Many (Sales Agent)

### Supporting Relationships
- **Projects → Files**: One-to-Many
- **Projects → Upsells**: One-to-Many
- **Messages → Attachments**: One-to-Many
- **Users → Notifications**: One-to-Many

### Polymorphic Relationships
- **Activity Logs**: Can reference any entity type
- **Notifications**: Can be triggered by any entity

## Setup and Installation

### Prerequisites
- Node.js 16+
- MongoDB 4.4+
- TypeScript

### Installation Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB connection string
   ```

3. **Database Setup**
   ```bash
   # Full setup with sample data
   npm run db:setup
   
   # Setup without sample data
   npm run db:setup -- --no-seed
   
   # Reset database (drops all collections)
   npm run db:setup -- --drop
   ```

### Available Scripts

```bash
# Database operations
npm run db:setup          # Full database setup
npm run db:seed           # Seed sample data only
npm run db:indexes        # Create indexes only
npm run db:validate       # Validate schemas
npm run db:stats          # Show database statistics

# Development
npm run dev               # Start development server
npm run build             # Build for production
npm run start             # Start production server
```

## Schema Validation

### Mongoose Validation
- **Required Fields**: Enforced at schema level
- **Data Types**: Strong typing with TypeScript interfaces
- **Custom Validators**: Business logic validation
- **Enum Values**: Restricted field values

### Business Rules
- **Email Validation**: RFC compliant email format
- **Phone Validation**: International phone number format
- **URL Validation**: Proper URL format for websites
- **Date Validation**: Future dates for project end dates

## Monitoring and Maintenance

### Health Checks
- **Connection Status**: Database connectivity monitoring
- **Performance Metrics**: Query performance tracking
- **Storage Usage**: Disk space monitoring

### Maintenance Tasks
- **Index Optimization**: Regular index analysis
- **Data Cleanup**: Automated old data removal
- **Backup Strategy**: Regular database backups
- **Log Rotation**: Activity log management

## Migration Strategy

### Version Control
- **Schema Versioning**: Track schema changes
- **Migration Scripts**: Automated data migration
- **Rollback Support**: Safe deployment rollbacks

### Deployment
- **Staging Environment**: Test migrations first
- **Production Deployment**: Zero-downtime deployments
- **Data Validation**: Post-migration verification

## API Integration

### Model Methods
- **Static Methods**: Collection-level operations
- **Instance Methods**: Document-level operations
- **Virtual Fields**: Computed properties
- **Middleware**: Pre/post operation hooks

### Query Helpers
- **Pagination**: Efficient large dataset handling
- **Filtering**: Advanced query filtering
- **Sorting**: Optimized result ordering
- **Population**: Relationship loading

## Troubleshooting

### Common Issues
1. **Connection Errors**: Check MongoDB URI and network connectivity
2. **Index Errors**: Verify unique constraints and data integrity
3. **Validation Errors**: Check required fields and data formats
4. **Performance Issues**: Analyze query patterns and indexes

### Debug Tools
- **MongoDB Compass**: Visual database exploration
- **Mongoose Debug**: Query logging and analysis
- **Performance Profiler**: Query performance monitoring

## Support and Documentation

### Resources
- **MongoDB Documentation**: https://docs.mongodb.com/
- **Mongoose Documentation**: https://mongoosejs.com/docs/
- **TypeScript Documentation**: https://www.typescriptlang.org/docs/

### Contact
For technical support or questions about the database schema, please contact the development team.

---

**Last Updated**: October 2024  
**Schema Version**: 1.0.0  
**MongoDB Version**: 4.4+  
**Mongoose Version**: 8.19+
