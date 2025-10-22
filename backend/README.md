# Logic Camp CRM Backend

MongoDB database schema and API for the Logic Camp CRM system.

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB connection string
   ```

3. **Setup database**
   ```bash
   npm run db:setup
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:setup` - Setup database with sample data
- `npm run db:setup:drop` - Reset database (drops all collections)
- `npm run db:setup:no-seed` - Setup database without sample data

## Database Models

The system includes the following MongoDB collections:

- **Users** - System users with role-based access
- **Customers** - Customer information and contacts  
- **Leads** - Sales leads and prospects
- **Projects** - Project management and tracking
- **Goals & Tasks** - Task management system
- **Files** - File storage and management
- **Messages** - Internal messaging system
- **Notifications** - System notifications
- **Business Directory** - Business prospect database
- **Activity Logs** - Audit trail and activity tracking

## Requirements

- Node.js 16+
- MongoDB 4.4+
- TypeScript
