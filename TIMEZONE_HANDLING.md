# Timezone Handling

## Overview
The framework automatically handles timezone detection and conversion for datetime fields.

## How It Works

### Frontend
- All GraphQL clients automatically detect user timezone using `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Timezone is sent in `x-user-timezone` header with every request
- Supports Vue, React, and Angular frontends

### Backend
- All datetime values are stored in UTC (ISO 8601 format)
- AppSync resolvers access user timezone via `$ctx.request.headers["x-user-timezone"]`
- Datetime fields get additional `_local` versions for display

### Usage Example

**GraphQL Response:**
```json
{
  "user": {
    "createdAt": "2024-01-15T10:30:00.000Z",
    "createdAt_local": "2024-01-15T05:30:00.000-05:00"
  }
}
```

**Frontend Display:**
```javascript
// Use _local field for user-friendly display
const displayTime = user.createdAt_local || user.createdAt;
```

## Browser Support
- Modern browsers with `Intl.DateTimeFormat` support (IE11+)
- Graceful fallback to UTC if timezone detection fails