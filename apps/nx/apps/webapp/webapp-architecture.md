# Webapp Architecture Documentation

## Overview

This is a Next.js 14 application built with TypeScript that serves as the main web interface for DEFCON.run. The application uses modern React patterns with server and client components, authentication via NextAuth, and a component-based architecture.

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **UI Library**: HeroUI (NextUI fork)
- **Styling**: Tailwind CSS with tailwind-variants
- **Authentication**: NextAuth with multiple OAuth providers
- **Database**: DynamoDB via ElectroDB
- **State Management**: React hooks and context
- **Icons**: React Icons library

## Directory Structure

```
webapp/
├── config/               # Configuration files
│   ├── auth.ts          # NextAuth configuration
│   ├── fonts.ts         # Font configuration
│   └── site.ts          # Site metadata
├── public/              # Static assets
│   ├── dashboard/       # Dashboard images
│   ├── header/          # Header assets
│   ├── icons/           # Icon files
│   ├── login/           # Login page assets
│   ├── routes/          # GPX route files
│   └── sponsorlogo/     # Sponsor logos
├── src/
│   ├── app/             # Next.js app directory
│   │   ├── (headfoot)/  # Layout with header/footer
│   │   ├── (onlybody)/  # Layout without header/footer
│   │   ├── api/         # API routes
│   │   └── providers.tsx # App-wide providers
│   ├── components/      # Reusable components
│   │   ├── cms/         # CMS-related components
│   │   ├── header/      # Header components
│   │   ├── map/         # Map components
│   │   ├── profile/     # Profile page components
│   │   ├── text-effects/# Text animation components
│   │   └── ui/          # UI components
│   ├── db/              # Database utilities
│   │   ├── cache.ts     # Caching layer
│   │   └── user.ts      # User entity and operations
│   └── lib/             # Utility libraries
```

## Authentication System

### Providers
The app supports multiple authentication providers:
- **Email** (via Nodemailer with custom styling)
- **GitHub** OAuth
- **Strava** OAuth (for activity tracking)
- **Discord** OAuth

### Auth Flow
1. User initiates login through one of the providers
2. NextAuth handles OAuth flow or sends magic link email
3. User profile is created/updated in DynamoDB
4. JWT session is established with 15-day expiry
5. Session includes user theme preference and Strava connection status

### User Creation
When a new user is created:
- Unique ID generated via crypto.randomUUID()
- RSA key pair generated for future features
- MQTT credentials auto-generated using SHA256 hash
- QR code generated for user identification

## Component Architecture

### Layout Structure
Two main layout patterns:
1. **(headfoot)**: Pages with header and footer
2. **(onlybody)**: Pages without header/footer (login/auth pages)

### Profile Page Components

The profile page (`/profile/page.tsx`) demonstrates the component composition pattern:

```typescript
// Server component that checks auth
export default async function Page() {
  const session = await auth();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <UserDetails />           // User information display
      <MqttCredentials />      // MQTT connection details
      <StravaConnection />     // Strava integration status
    </div>
  );
}
```

### Component Patterns

1. **Client Components**: Use `'use client'` directive for interactive features
2. **Loading States**: Consistent use of Spinner component
3. **Error Handling**: Graceful error states with user feedback
4. **Card Layout**: HeroUI Card components for consistent UI

Example pattern from MqttCredentials:
```typescript
'use client';

export default function MqttCredentials() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch data on mount
  useEffect(() => {
    fetchUserData();
  }, []);
  
  // Loading state
  if (loading) return <Spinner />;
  
  // Error state
  if (error) return <ErrorCard />;
  
  // Success state
  return <CredentialsCard />;
}
```

## API Structure

### Route Handlers
API routes follow Next.js 14 App Router conventions:
- Located in `src/app/api/`
- Use route.ts files for handlers
- Implement standard HTTP methods (GET, POST, etc.)

### User API Example
```typescript
// /api/user/route.ts
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: '401 Unauthorized' }, { status: 401 });
  }
  
  // Check cache first
  let user = getCachedItem(session.user.email, 'users');
  if (!user) {
    user = await getUser(session.user.email);
    setCachedItem(session.user.email, user, 'users');
  }
  
  // Strip sensitive fields before returning
  const { rsaprivSHA, seed, ...safeUserData } = user;
  return NextResponse.json({ user: safeUserData });
}
```

## Data Layer

### DynamoDB Integration
- Uses ElectroDB for type-safe database operations
- Single table design pattern
- Multiple GSIs for query flexibility

### User Entity Schema
Key attributes:
- Email (primary key)
- ID (sort key)
- Profile data from OAuth providers
- MQTT credentials
- Timestamps (createdAt, updatedAt)

### Caching Strategy
- In-memory cache for frequently accessed data
- Cache invalidation on updates
- Reduces DynamoDB read costs

## Styling and Theming

### Tailwind Configuration
- Custom color schemes
- Responsive design utilities
- Component-specific styles via CSS modules

### Theme Support
- Light/dark mode via next-themes
- Theme preference stored in user session
- ThemeSwitch component in header

### UI Components
HeroUI provides consistent components:
- Card, Button, Input, Divider
- Modal, Dropdown, Avatar
- Spinner for loading states

## Path Aliases

TypeScript path aliases for cleaner imports:
```json
{
  "@db/*": ["./src/db/*"],
  "@components/*": ["./src/components/*"],
  "@header": ["./src/components/header/header"],
  "@auth": ["./config/auth"],
  "@fonts": ["./config/fonts"]
}
```

## Security Considerations

1. **Authentication**: Required for most pages (enforced in layout)
2. **API Protection**: Session validation on all API routes
3. **Data Sanitization**: Sensitive fields stripped from API responses
4. **CORS**: Configured via Next.js middleware
5. **Environment Variables**: Secrets stored securely, not in code

## Development Patterns

### Best Practices
1. Server components by default, client components when needed
2. Proper error boundaries and loading states
3. Type safety throughout with TypeScript
4. Component composition over prop drilling
5. Consistent naming conventions

### Code Organization
- Features grouped by domain (profile, auth, etc.)
- Shared components in components directory
- Business logic separated from UI components
- Clear separation of concerns

This architecture provides a scalable foundation for the DEFCON.run web application with modern React patterns, type safety, and robust authentication.