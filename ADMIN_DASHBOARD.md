# Admin Dashboard Documentation

## Overview
The Admin Dashboard provides comprehensive management capabilities for system administrators, including analytics, data management, and application configuration.

## Features

### 📊 Analytics Dashboard
- **Real-time Log Monitoring**: Live view of user interactions and system events
- **Advanced Filtering**: Search by user, component, action, level, and date range
- **Interactive Charts**: Timeline, action distribution, component usage, and error rates
- **Data Export**: CSV export functionality for compliance and analysis
- **WebSocket Updates**: Real-time log streaming for immediate visibility

### 🗃️ Data Management
- **Multi-Model CRUD**: Manage Users, Posts, Settings, and Logs
- **Bulk Operations**: Select and delete multiple records
- **Advanced Search**: Filter records across all fields
- **Data Export**: CSV and JSON export with configurable limits
- **User Impersonation**: Secure admin-to-user switching with audit trail

### ⚙️ Application Configuration
- **System Settings**: Configure analytics, security, and UI preferences
- **Real-time Updates**: Changes apply immediately across all clients
- **Setting Validation**: Input validation and range checking
- **Change Tracking**: Visual indicators for unsaved changes
- **Settings History**: Audit trail of configuration changes

## Access Control

### Admin Group Requirement
- Only users in the `admins` Cognito group can access the dashboard
- Automatic redirection for non-admin users
- Session-based admin verification

### Route Protection
```javascript
// Admin route with protection
{ 
  path: '/admin', 
  component: AdminDashboard, 
  meta: { requiresAuth: true, requiresAdmin: true } 
}
```

## Analytics Implementation

### Automatic Tracking
All components automatically track:
- **View Events**: Component mounting and unmounting
- **User Actions**: Clicks, form submissions, navigation
- **Error Events**: Caught exceptions and validation errors
- **Admin Actions**: Impersonation, data modifications, config changes

### Usage in Components
```javascript
// Vue component with analytics
import { useAnalytics } from '@/services/analytics';

export default {
  setup() {
    const { trackAction, trackError } = useAnalytics('component-name');
    
    const handleClick = () => {
      trackAction('button-clicked', { buttonType: 'primary' });
    };
    
    return { handleClick };
  }
}
```

### Batch Processing
- Events are batched every 5 seconds or 50 events (configurable)
- Automatic retry on failure
- Sensitive data encryption before storage

## User Impersonation

### Security Features
- Admin-only access with group verification
- Audit logging of all impersonation attempts
- Session timeout and automatic cleanup
- Target user consent logging

### Implementation
```javascript
const impersonateUser = async (targetUser) => {
  // Verify admin permissions
  // Log impersonation attempt
  // Generate secure session token
  // Redirect to user context
};
```

### Audit Trail
Every impersonation creates a log entry:
```json
{
  "userId": "admin-user-id",
  "action": "impersonate",
  "component": "admin-dashboard",
  "level": "info",
  "metadata": {
    "targetUserId": "target-user-id",
    "sessionDuration": 60,
    "impersonationType": "admin_initiated"
  }
}
```

## System Settings

### Available Settings

#### Analytics & Logging
- `log_retention_days`: Log retention period (1-365 days)
- `batch_log_interval`: Batch processing interval (1-60 seconds)
- `batch_log_size`: Events per batch (10-100)
- `enable_error_tracking`: Automatic error logging

#### Security & Sessions
- `session_timeout_minutes`: User session timeout (5-480 minutes)
- `max_login_attempts`: Failed login limit (3-10)
- `enable_user_impersonation`: Admin impersonation feature

#### User Interface
- `timezone_detection`: Auto-detect user timezone
- `admin_dashboard_refresh`: Dashboard refresh interval (10-300 seconds)

#### Data Export
- `export_max_records`: Maximum export records (1K-100K)

### Settings Storage
Settings are stored as SYSTEM type records:
```json
{
  "type": "SYSTEM",
  "entityId": "GLOBAL",
  "key": "log_retention_days",
  "value": {"days": 90},
  "isActive": true
}
```

## Real-time Features

### WebSocket Subscriptions
- Live log streaming
- Settings updates
- User activity monitoring
- System health status

### Auto-refresh
- Configurable dashboard refresh intervals
- Smart refresh on data changes
- Background sync with visual indicators

## Data Export

### Supported Formats
- **CSV**: Comma-separated values for spreadsheet analysis
- **JSON**: Structured data for programmatic processing

### Export Limits
- Configurable maximum record limits
- Progress indicators for large exports
- Automatic chunking for performance

### Export Features
- Filtered data export (respects current filters)
- Timestamp-based file naming
- Automatic download initiation

## Performance Considerations

### Optimization Strategies
- Pagination for large datasets
- Lazy loading of components
- Efficient GraphQL queries
- Client-side caching

### Monitoring
- Real-time performance metrics
- Error rate tracking
- User experience analytics
- System resource monitoring

## Security Considerations

### Data Protection
- Sensitive data encryption in logs
- PII masking in exports
- Secure session management
- Audit trail integrity

### Access Control
- Role-based permissions
- Session timeout enforcement
- Failed attempt monitoring
- Privilege escalation detection

## Troubleshooting

### Common Issues
1. **Admin Access Denied**: Verify user is in `admins` group
2. **Real-time Updates Not Working**: Check WebSocket connection
3. **Export Failures**: Verify record limits and permissions
4. **Settings Not Saving**: Check validation and network connectivity

### Debug Mode
Enable debug logging in development:
```javascript
if (process.env.NODE_ENV === 'development') {
  console.log('Analytics event:', event);
}
```

## API Endpoints

### GraphQL Operations
- `listLogs`: Retrieve analytics logs with filtering
- `listUsers`: User management operations
- `listSettings`: System configuration retrieval
- `updateSetting`: Configuration updates
- `createLog`: Analytics event creation

### Subscriptions
- `onCreateLog`: Real-time log streaming
- `onUpdateSetting`: Configuration change notifications
- `onJobCompleted`: Async operation completion

## Migration and Maintenance

### Component Refactoring
Use the migration script when renaming components:
```bash
npm run migrate:component-name -- --old="old-name" --new="new-name"
```

### Data Cleanup
- Automatic log retention based on settings
- Periodic cleanup of expired sessions
- Archive old configuration changes

### Backup and Recovery
- Regular database backups
- Configuration export/import
- Disaster recovery procedures