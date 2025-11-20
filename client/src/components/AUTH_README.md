# Authentication UI Components

This directory contains the authentication UI components for the multi-user support feature.

## Components Implemented

### 1. AuthContext (`context/AuthContext.tsx`)
- Provides authentication state management across the application
- Manages user state, token, and authentication status
- Implements login, register, logout, and checkAuth functions
- Stores JWT token in localStorage with key `leetcode_auth_token`
- Automatically verifies token on app load

### 2. LoginPage (`components/LoginPage.tsx`)
- Login form with email and password fields
- Client-side email format validation
- Error message display for invalid credentials
- Redirects to dashboard on successful login
- Link to registration page

### 3. RegisterPage (`components/RegisterPage.tsx`)
- Registration form with email, username, and password fields
- Client-side validation for email format and password length (min 8 characters)
- Password confirmation field
- Error message display for validation failures
- Redirects to login page on successful registration
- Link to login page

### 4. ProtectedRoute (`components/ProtectedRoute.tsx`)
- Wrapper component that checks authentication status
- Shows loading spinner while checking auth
- Redirects to login page if not authenticated
- Renders children if authenticated

### 5. Updated Sidebar (`components/Sidebar.tsx`)
- Added user profile section showing username and email
- Added logout button
- User avatar with first letter of username

## Styling

All authentication components use shared styles from `AuthPages.css` and `ProtectedRoute.css`:
- Modern gradient background
- Clean card-based layout
- Responsive design
- Loading states and error messages
- Smooth transitions and hover effects

## Integration

The authentication system is integrated into the main App.tsx:
- App is wrapped with AuthProvider
- Shows login/register pages when not authenticated
- Shows loading state while checking authentication
- Protects main app content with authentication check

## Usage

### Using the Auth Context

```typescript
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  // Check if user is authenticated
  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }
  
  // Access user data
  return <div>Welcome, {user.username}!</div>;
}
```

### Protecting Routes

```typescript
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <ProtectedRoute onRedirectToLogin={() => setView('login')}>
      <YourProtectedContent />
    </ProtectedRoute>
  );
}
```

## API Endpoints Used

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user and receive JWT token
- `GET /auth/me` - Get current user profile (requires auth)
- `POST /auth/logout` - Logout (client-side token removal)

## Token Management

- JWT tokens are stored in localStorage with key `leetcode_auth_token`
- Tokens are automatically included in API requests via the Authorization header
- Tokens are verified on app load to maintain session across page refreshes
- Invalid or expired tokens are automatically cleared

## Next Steps

To complete the authentication integration:
1. Update API client to include auth headers (Task 8.1)
2. Update existing API calls to use authenticated client (Task 8.2)
3. Test the complete authentication flow
