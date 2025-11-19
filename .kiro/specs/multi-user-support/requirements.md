# Requirements Document

## Introduction

This document outlines the requirements for adding multi-user support to the LeetCode Practice App. Currently, the application operates as a single-user system where all progress, notes, and review history are shared globally. The multi-user feature will enable multiple users to have isolated accounts with their own progress tracking, notes, review sessions, and statistics while sharing the same problem database.

## Glossary

- **System**: The LeetCode Practice App backend and frontend application
- **User**: An individual person with a unique account who uses the application to track their LeetCode practice
- **Authentication Service**: The component responsible for verifying user identity and managing sessions
- **User Session**: A period of authenticated access to the application by a specific user
- **User Progress**: Problem-specific data including solved status, notes, and review history that belongs to a specific user
- **Problem Database**: The shared collection of LeetCode problems available to all users
- **JWT**: JSON Web Token used for stateless authentication
- **Protected Endpoint**: An API endpoint that requires valid authentication to access
- **Calendar Note**: A text entry associated with a specific date for documenting daily activities
- **Calendar Task**: An actionable item with title, description, and completion status for a specific date
- **Calendar Event**: A scheduled activity with title, description, start time, and end time for a specific date
- **Due-Today Problems**: Problems that have reached their next review date based on the user's spaced repetition schedule

## Requirements

### Requirement 1

**User Story:** As a new user, I want to create an account with my email and password, so that I can start tracking my own LeetCode practice progress.

#### Acceptance Criteria

1. WHEN a user submits a registration form with email and password, THE System SHALL validate that the email format is correct and the password meets minimum security requirements of at least 8 characters.
2. WHEN a user submits a registration form with a unique email, THE System SHALL create a new user account and store the password securely using bcrypt hashing.
3. IF a user attempts to register with an email that already exists, THEN THE System SHALL return an error message indicating the email is already registered.
4. WHEN a user successfully registers, THE System SHALL return a success message and allow the user to proceed to login.

### Requirement 2

**User Story:** As a registered user, I want to log in with my email and password, so that I can access my personal practice data.

#### Acceptance Criteria

1. WHEN a user submits valid login credentials, THE System SHALL verify the credentials against stored user data and generate a JWT token.
2. WHEN a user successfully logs in, THE System SHALL return the JWT token and user profile information including user ID, email, and username.
3. IF a user submits invalid credentials, THEN THE System SHALL return an error message without revealing whether the email or password was incorrect.
4. WHEN a JWT token is generated, THE System SHALL set the token expiration to 7 days from creation time.
5. WHEN a user logs in, THE System SHALL include the JWT token in the response for client-side storage.

### Requirement 3

**User Story:** As a logged-in user, I want my session to remain active across page refreshes, so that I do not have to log in repeatedly during normal usage.

#### Acceptance Criteria

1. WHEN a user makes an API request with a valid JWT token, THE System SHALL authenticate the request and extract the user ID from the token.
2. IF a user makes an API request with an expired JWT token, THEN THE System SHALL return a 401 Unauthorized error with a message indicating token expiration.
3. IF a user makes an API request with an invalid or missing JWT token, THEN THE System SHALL return a 401 Unauthorized error.
4. WHEN a user's JWT token is within 24 hours of expiration and they make an authenticated request, THE System SHALL optionally generate and return a new token with extended expiration.

### Requirement 4

**User Story:** As a logged-in user, I want to mark problems as solved or unsolved, so that I can track which problems I have completed.

#### Acceptance Criteria

1. WHEN an authenticated user updates a problem's solved status, THE System SHALL store the solved status associated with that user's ID and the problem ID.
2. WHEN an authenticated user marks a problem as solved, THE System SHALL record the timestamp of when the problem was marked solved.
3. WHEN an authenticated user retrieves their problem list, THE System SHALL return only the progress data associated with that user's ID.
4. WHEN an authenticated user updates progress for a problem, THE System SHALL not affect the progress data of other users for the same problem.

### Requirement 5

**User Story:** As a logged-in user, I want to add personal notes to problems, so that I can remember my approach and insights for future reference.

#### Acceptance Criteria

1. WHEN an authenticated user adds or updates notes for a problem, THE System SHALL store the notes associated with that user's ID and the problem ID.
2. WHEN an authenticated user retrieves a problem, THE System SHALL return only the notes that belong to that user for that problem.
3. WHEN an authenticated user updates notes for a problem, THE System SHALL not affect the notes of other users for the same problem.
4. WHEN an authenticated user deletes notes for a problem, THE System SHALL remove only that user's notes without affecting other users.

### Requirement 6

**User Story:** As a logged-in user, I want to see my personal statistics and progress, so that I can understand my learning progress.

#### Acceptance Criteria

1. WHEN an authenticated user requests statistics, THE System SHALL calculate and return statistics based only on that user's progress data.
2. WHEN calculating statistics, THE System SHALL include total problems solved, problems by difficulty, and problems by concept for that specific user.
3. WHEN an authenticated user views the statistics dashboard, THE System SHALL display only data associated with that user's ID.
4. WHEN a user has no progress data, THE System SHALL return statistics showing zero solved problems across all categories.

### Requirement 7

**User Story:** As a logged-in user, I want my review history to be private, so that my spaced repetition schedule is personalized to my learning.

#### Acceptance Criteria

1. WHEN an authenticated user adds a review session, THE System SHALL associate the review history record with that user's ID.
2. WHEN an authenticated user retrieves problems due for review, THE System SHALL return only problems based on that user's review history.
3. WHEN calculating next review dates, THE System SHALL use only that user's previous review attempts and results.
4. WHEN an authenticated user views review statistics, THE System SHALL display only review data associated with that user's ID.

### Requirement 8

**User Story:** As a logged-in user, I want to add notes to specific calendar dates, so that I can document my daily learning activities and reflections.

#### Acceptance Criteria

1. WHEN an authenticated user creates a calendar note for a specific date, THE System SHALL store the note associated with that user's ID and the date.
2. WHEN an authenticated user retrieves calendar notes for a date, THE System SHALL return only notes that belong to that user for that date.
3. WHEN an authenticated user updates a calendar note, THE System SHALL modify only that user's note without affecting other users.
4. WHEN an authenticated user deletes a calendar note, THE System SHALL remove only that user's note for that date.

### Requirement 9

**User Story:** As a logged-in user, I want to create tasks for specific dates, so that I can plan my practice schedule and track completion.

#### Acceptance Criteria

1. WHEN an authenticated user creates a task for a specific date, THE System SHALL store the task with title, description, completion status, and associate it with that user's ID and date.
2. WHEN an authenticated user retrieves tasks for a date, THE System SHALL return only tasks that belong to that user for that date.
3. WHEN an authenticated user marks a task as complete, THE System SHALL update the completion status and record the completion timestamp.
4. WHEN an authenticated user deletes a task, THE System SHALL remove only that user's task without affecting other users.

### Requirement 10

**User Story:** As a logged-in user, I want to create events for specific dates and times, so that I can schedule study sessions and practice activities.

#### Acceptance Criteria

1. WHEN an authenticated user creates an event with title, description, start time, and end time, THE System SHALL store the event associated with that user's ID and date.
2. WHEN an authenticated user retrieves events for a date, THE System SHALL return only events that belong to that user for that date.
3. WHEN an authenticated user updates an event, THE System SHALL modify only that user's event without affecting other users.
4. WHEN an authenticated user deletes an event, THE System SHALL remove only that user's event without affecting other users.

### Requirement 11

**User Story:** As a logged-in user, I want to view all my calendar items (notes, tasks, events) for a specific date, so that I can see my complete daily schedule.

#### Acceptance Criteria

1. WHEN an authenticated user requests calendar data for a specific date, THE System SHALL return all notes, tasks, and events for that user and date.
2. WHEN an authenticated user requests calendar data for a date range, THE System SHALL return all calendar items within that range for that user.
3. WHEN displaying calendar items, THE System SHALL organize them by type (notes, tasks, events) and sort events by start time.
4. WHEN a user has no calendar items for a date, THE System SHALL return an empty result set for each category.

### Requirement 12

**User Story:** As a logged-in user, I want to see problems that are due for review today based on my personal review history, so that I can follow my personalized spaced repetition schedule.

#### Acceptance Criteria

1. WHEN an authenticated user requests due-today problems, THE System SHALL calculate and return only problems due based on that user's review history.
2. WHEN calculating due-today problems, THE System SHALL use the next review date from that user's most recent review session for each problem.
3. WHEN displaying due-today problems, THE System SHALL sort them by next review date ascending and then by difficulty descending.
4. WHEN a user has no problems due for review, THE System SHALL return an empty list.
5. WHEN a user views due-today problems, THE System SHALL include the number of days overdue for each problem if the next review date is in the past.

### Requirement 13

**User Story:** As a user, I want to log out of my account, so that I can secure my session when using a shared device.

#### Acceptance Criteria

1. WHEN a user initiates logout, THE System SHALL invalidate the current session on the client side by removing the stored JWT token.
2. WHEN a user logs out, THE System SHALL return a success message confirming logout.
3. WHEN a logged-out user attempts to access protected endpoints, THE System SHALL return a 401 Unauthorized error.

### Requirement 14

**User Story:** As a system administrator, I want user passwords to be stored securely, so that user accounts are protected from unauthorized access.

#### Acceptance Criteria

1. WHEN a user registers or changes their password, THE System SHALL hash the password using bcrypt with a salt rounds value of at least 10.
2. THE System SHALL never store passwords in plain text in the database.
3. WHEN authenticating a user, THE System SHALL compare the provided password against the stored hash using bcrypt comparison.
4. THE System SHALL not expose password hashes in any API response or log output.

### Requirement 15

**User Story:** As a developer, I want the frontend to handle authentication state, so that users have a seamless experience across the application.

#### Acceptance Criteria

1. WHEN a user successfully logs in, THE System SHALL store the JWT token in browser localStorage or sessionStorage.
2. WHEN a user navigates to a protected page, THE System SHALL include the JWT token in the Authorization header of API requests.
3. IF an API request returns a 401 Unauthorized error, THEN THE System SHALL redirect the user to the login page.
4. WHEN a user logs out, THE System SHALL clear the stored JWT token and redirect to the login page.
5. WHEN the application loads, THE System SHALL check for a stored JWT token and validate it before allowing access to protected features.
