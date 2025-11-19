# Implementation Plan

- [ ] 1. Database schema setup for multi-user support





  - [x] 1.1 Create users table with authentication fields


    - Write SQL migration to create users table with id, email, username, password_hash, timestamps
    - Add unique constraint on email and index for fast lookups
    - _Requirements: 1.2, 2.1, 14.2_

  - [x] 1.2 Create calendar tables for notes, tasks, and events


    - Write SQL migration to create calendar_notes table with user_id foreign key
    - Write SQL migration to create calendar_tasks table with completion tracking
    - Write SQL migration to create calendar_events table with time constraints
    - Add indexes on (user_id, date) for efficient queries
    - _Requirements: 8.1, 9.1, 10.1_

  - [x] 1.3 Modify existing tables to support multi-user data isolation


    - Add user_id column to user_progress table with foreign key to users
    - Add user_id column to review_history table with foreign key to users
    - Add user_id column to review_attempts table with foreign key to users
    - Create composite unique constraint on user_progress (user_id, problem_id)
    - Add indexes on user_id columns for all modified tables
    - Remove solved and notes columns from problems table
    - _Requirements: 4.1, 5.1, 7.1_


  - [x] 1.4 Create database functions for user-specific queries

    - Update get_due_problems_today() function to accept user_id parameter
    - Update add_review_session() function to include user_id
    - Create function to get user statistics by user_id
    - _Requirements: 6.1, 7.2, 12.1_

- [x] 2. Implement authentication service and middleware




  - [x] 2.1 Set up authentication dependencies


    - Install bcrypt, jsonwebtoken, and validator packages
    - Add JWT_SECRET to environment variables
    - Configure JWT expiration time (7 days)
    - _Requirements: 2.4, 14.1_

  - [x] 2.2 Create authentication service


    - Implement registerUser() method with email validation and password hashing
    - Implement loginUser() method with credential verification
    - Implement generateToken() method for JWT creation
    - Implement verifyToken() method for JWT validation
    - Implement password hashing with bcrypt (salt rounds = 10)
    - Implement password comparison method
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 14.1, 14.3_

  - [x] 2.3 Create authentication middleware


    - Implement authenticateToken middleware to extract and verify JWT from Authorization header
    - Attach user information (userId, email) to req.user object
    - Handle token verification errors with 401 responses
    - Implement optionalAuth middleware for routes that work with or without auth
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 3. Create authentication routes and endpoints




  - [x] 3.1 Implement user registration endpoint


    - Create POST /auth/register route
    - Validate email format and password strength (min 8 characters)
    - Check for duplicate email addresses
    - Hash password and create user record
    - Return success message with user ID

    - _Requirements: 1.1, 1.2, 1.3, 1.4_


  - [x] 3.2 Implement user login endpoint
    - Create POST /auth/login route
    - Validate credentials against database
    - Generate JWT token on successful authentication


    - Update last_login timestamp
    - Return token and user profile (id, email, username)

    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [x] 3.3 Implement user profile and session endpoints
    - Create GET /auth/me route to return current user info
    - Create POST /auth/logout route (client-side token removal)
    - Create PUT /auth/password route for password changes
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 4. Update existing problem routes for multi-user support




  - [x] 4.1 Add authentication to problem routes


    - Add authenticateToken middleware to all problem routes
    - Update GET /api/problems to join with user_progress filtered by user_id
    - Update GET /api/problems/concept/:concept to filter by user_id
    - _Requirements: 4.3, 6.3_



  - [x] 4.2 Update problem progress endpoints

    - Modify PUT /api/problems/:id/progress to upsert user_progress with user_id
    - Ensure solved_at timestamp is set when marking as solved
    - Ensure notes are stored per user

    - _Requirements: 4.1, 4.2, 4.4, 5.1, 5.2, 5.3, 5.4_

  - [x] 4.3 Update statistics endpoint for user-specific data

    - Modify GET /api/stats to calculate statistics filtered by user_id
    - Include total problems, solved count, difficulty breakdown
    - Include concept-based statistics
    - Return zero values for users with no progress
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 5. Implement calendar management routes
  - [ ] 5.1 Create calendar notes endpoints
    - Implement POST /api/calendar/notes to create note for specific date
    - Implement GET /api/calendar/notes/:date to retrieve user's notes for date
    - Implement PUT /api/calendar/notes/:id to update note
    - Implement DELETE /api/calendar/notes/:id to delete note
    - Ensure all operations filter by user_id
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ] 5.2 Create calendar tasks endpoints
    - Implement POST /api/calendar/tasks to create task for specific date
    - Implement GET /api/calendar/tasks/:date to retrieve user's tasks for date
    - Implement PUT /api/calendar/tasks/:id to update task
    - Implement PUT /api/calendar/tasks/:id/complete to mark task complete with timestamp
    - Implement DELETE /api/calendar/tasks/:id to delete task
    - Ensure all operations filter by user_id
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ] 5.3 Create calendar events endpoints
    - Implement POST /api/calendar/events to create event with time validation
    - Implement GET /api/calendar/events/:date to retrieve user's events for date
    - Implement PUT /api/calendar/events/:id to update event
    - Implement DELETE /api/calendar/events/:id to delete event
    - Validate that end_time > start_time
    - Ensure all operations filter by user_id
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ] 5.4 Create unified calendar view endpoint
    - Implement GET /api/calendar/:date to return all calendar items (notes, tasks, events)
    - Implement GET /api/calendar/range to return calendar items for date range
    - Sort events by start_time
    - Return empty arrays for categories with no data
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 6. Update review routes for user-specific tracking
  - [ ] 6.1 Update review history endpoints
    - Add user_id to all review history insert operations
    - Filter review history queries by user_id
    - Update review session creation to include user_id
    - _Requirements: 7.1, 7.3, 7.4_

  - [ ] 6.2 Implement personalized due-today endpoint
    - Create GET /api/reviews/due-today route
    - Query review_history filtered by user_id where next_review_date <= today
    - Calculate days_overdue for each problem
    - Sort by next_review_date ascending, then difficulty descending
    - Return empty array if no problems due
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 7. Build frontend authentication UI
  - [ ] 7.1 Create authentication context and provider
    - Create AuthContext with user state, token, isAuthenticated, loading
    - Implement login() function to call /auth/login and store token
    - Implement register() function to call /auth/register
    - Implement logout() function to clear token and redirect
    - Implement checkAuth() function to verify token on app load
    - Store JWT token in localStorage with key 'leetcode_auth_token'
    - _Requirements: 2.5, 9.1, 9.2, 11.1, 11.5_

  - [ ] 7.2 Build login page component
    - Create login form with email and password fields
    - Add form validation for email format
    - Call AuthContext.login() on form submit
    - Display error messages for invalid credentials
    - Redirect to dashboard on successful login
    - Add link to registration page
    - _Requirements: 2.1, 2.3_

  - [ ] 7.3 Build registration page component
    - Create registration form with email, username, and password fields
    - Add client-side validation for email format and password length
    - Call AuthContext.register() on form submit
    - Display error messages for validation failures or duplicate email
    - Redirect to login page on successful registration
    - Add link to login page
    - _Requirements: 1.1, 1.3, 1.4_

  - [ ] 7.4 Implement protected route wrapper
    - Create ProtectedRoute component that checks isAuthenticated
    - Show loading spinner while checking auth status
    - Redirect to login page if not authenticated
    - Render children if authenticated
    - _Requirements: 11.3_

- [ ] 8. Update frontend API client for authentication
  - [ ] 8.1 Configure API client with auth interceptors
    - Create axios instance with base URL
    - Add request interceptor to attach JWT token to Authorization header
    - Add response interceptor to handle 401 errors
    - Clear token and redirect to login on 401 response
    - _Requirements: 3.1, 3.3, 11.2, 11.3, 11.4_

  - [ ] 8.2 Update existing API calls to use authenticated client
    - Update problem list API calls to use authenticated client
    - Update progress update API calls to use authenticated client
    - Update statistics API calls to use authenticated client
    - Update review API calls to use authenticated client
    - _Requirements: 4.3, 5.2, 6.3, 7.4_

- [ ] 9. Build calendar UI components
  - [ ] 9.1 Create calendar dashboard component
    - Build calendar view with date picker
    - Display notes, tasks, and events for selected date
    - Add buttons to create new calendar items
    - Fetch calendar data from GET /api/calendar/:date
    - _Requirements: 11.1, 11.3_

  - [ ] 9.2 Create calendar note management UI
    - Build form to create/edit calendar notes
    - Display existing notes for selected date
    - Add delete functionality with confirmation
    - Call POST/PUT/DELETE /api/calendar/notes endpoints
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ] 9.3 Create calendar task management UI
    - Build form to create/edit calendar tasks
    - Display task list with completion checkboxes
    - Add delete functionality with confirmation
    - Call POST/PUT/DELETE /api/calendar/tasks endpoints
    - Show completed_at timestamp for completed tasks
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ] 9.4 Create calendar event management UI
    - Build form to create/edit calendar events with time pickers
    - Validate that end time is after start time
    - Display events sorted by start time
    - Add delete functionality with confirmation
    - Call POST/PUT/DELETE /api/calendar/events endpoints
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 10. Implement due-today problems feature
  - [ ] 10.1 Create due-today problems component
    - Build UI section to display problems due for review
    - Fetch data from GET /api/reviews/due-today
    - Display problem title, difficulty, and days overdue
    - Sort by next review date and difficulty
    - Show empty state when no problems are due
    - Add link to problem detail page
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 11. Update application routing and navigation
  - [ ] 11.1 Configure route protection
    - Wrap problem routes with ProtectedRoute
    - Wrap calendar routes with ProtectedRoute
    - Wrap review routes with ProtectedRoute
    - Keep login and register routes public
    - _Requirements: 11.3_

  - [ ] 11.2 Update navigation menu
    - Add login/register links for unauthenticated users
    - Add logout button for authenticated users
    - Display username in navigation bar
    - Add links to calendar and due-today sections
    - _Requirements: 9.1, 9.2_

- [ ] 12. Data migration for existing users
  - [ ] 12.1 Create migration script for existing data
    - Create default user account for existing data
    - Update all existing user_progress records with default user_id
    - Update all existing review_history records with default user_id
    - Update all existing review_attempts records with default user_id
    - _Requirements: 4.1, 7.1_

- [ ] 13. Testing and validation
  - [ ] 13.1 Write authentication tests
    - Test user registration with valid and invalid data
    - Test login with correct and incorrect credentials
    - Test JWT token generation and verification
    - Test password hashing and comparison
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 14.1, 14.3_

  - [ ] 13.2 Write data isolation tests
    - Test that User A cannot access User B's progress
    - Test that User A cannot modify User B's calendar items
    - Test that User A cannot see User B's review history
    - Test that statistics are calculated per user
    - _Requirements: 4.4, 5.3, 6.3, 7.4, 8.2, 9.2, 10.2_

  - [ ] 13.3 Write calendar functionality tests
    - Test creating, reading, updating, deleting notes
    - Test creating, reading, updating, deleting tasks
    - Test creating, reading, updating, deleting events
    - Test date range queries
    - Test task completion tracking
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4_

  - [ ] 13.4 Write due-today problems tests
    - Test due-today calculation based on review history
    - Test sorting by date and difficulty
    - Test days overdue calculation
    - Test empty state when no problems due
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 14. Documentation and deployment preparation
  - [ ] 14.1 Update API documentation
    - Document all authentication endpoints
    - Document calendar endpoints
    - Document updated problem endpoints with auth requirements
    - Document due-today endpoint
    - Include request/response examples
    - _Requirements: All_

  - [ ] 14.2 Update environment configuration
    - Add JWT_SECRET to .env.example
    - Document required environment variables
    - Update deployment documentation with auth setup
    - _Requirements: 2.4, 14.1_

  - [ ] 14.3 Create database migration guide
    - Document step-by-step migration process
    - Include rollback procedures
    - Document data migration for existing users
    - _Requirements: All database changes_
