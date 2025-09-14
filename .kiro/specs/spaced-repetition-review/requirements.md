# Requirements Document

## Introduction

This feature implements a sophisticated spaced repetition system for solved LeetCode problems with intelligent forgetting recovery. The system uses research-based daily intervals and intensive recovery cycles to help users retain problem-solving knowledge. When users forget problems, the system implements targeted recovery strategies based on forgetting patterns, stage of forgetting, and frequency of forgetting.

## Requirements

### Requirement 1

**User Story:** As a user, I want solved problems to be automatically scheduled for review using a daily-based spaced repetition system, so that I can maintain my problem-solving skills with optimal retention intervals.

#### Acceptance Criteria

1. WHEN a problem is marked as solved THEN the system SHALL schedule the first review for the next day (1-day interval)
2. WHEN a problem is successfully reviewed THEN the system SHALL progress through the standard review stages: 1 day → 3 days → 7 days → 14 days → 30 days → 60 days → 120 days → 240 days
3. WHEN calculating review dates THEN the system SHALL use daily-based intervals with minimum 1-day increments
4. WHEN a problem reaches stage 8 (240 days) THEN the system SHALL consider it mastered and reduce review frequency
5. WHEN a problem is marked as solved THEN the system SHALL create an initial review history entry with stage 1 scheduled for tomorrow

### Requirement 2

**User Story:** As a user, I want to see problems that are due for review in a prioritized "Due Today" section, so that I can focus on the most critical reviews first.

#### Acceptance Criteria

1. WHEN I view the "Due Today" section THEN the system SHALL display problems prioritized by: intensive recovery (priority 1), frequently forgotten (priority 2), overdue (priority 3-4), on-time (priority 5)
2. WHEN displaying due problems THEN the system SHALL show problem title, difficulty, review type (normal/intensive), days overdue, times forgotten, and associated patterns
3. WHEN a problem appears in "Due Today" THEN the system SHALL provide two options: "Remembered" or "Forgot"
4. WHEN I mark a problem as "Remembered" THEN the system SHALL advance to the next stage in the spaced repetition schedule
5. WHEN I mark a problem as "Forgot" THEN the system SHALL trigger the forgetting recovery system based on the stage and frequency of forgetting
6. WHEN I complete a review action THEN the system SHALL remove the problem from "Due Today" until the next scheduled date

### Requirement 3

**User Story:** As a user, I want an intelligent forgetting recovery system that adapts to my forgetting patterns, so that I can strengthen weak memories with targeted practice.

#### Acceptance Criteria

1. WHEN I forget a problem at stage 1-2 (1-3 days) THEN the system SHALL reset to 1-day intervals with 2-5 intensive daily reviews
2. WHEN I forget a problem at stage 3-4 (7-14 days) THEN the system SHALL reset to 2-3 day intervals with 2-3 intensive reviews
3. WHEN I forget a problem at stage 5+ (30+ days) THEN the system SHALL reset to 7-14 day intervals with 1 intensive review
4. WHEN I forget the same problem multiple times THEN the system SHALL increase intensive review cycles (1st time: 2-3 cycles, 2nd time: 4-5 cycles, 3rd+ time: 6-8 cycles)
5. WHEN I complete all intensive recovery cycles successfully THEN the system SHALL graduate the problem back to normal spaced repetition starting at stage 1

### Requirement 4

**User Story:** As a user, I want to track detailed review history and forgetting patterns, so that I can understand my learning progress and identify problematic areas.

#### Acceptance Criteria

1. WHEN I view a problem's details THEN the system SHALL display a timeline showing all review dates, results (remembered/forgot), stages, and next scheduled dates
2. WHEN displaying review history THEN the system SHALL show forgetting events with recovery plans, intensive cycle progress, and graduation status
3. WHEN I forget a problem THEN the system SHALL record the forgetting stage, time spent, confusion notes, and specific mistakes
4. WHEN viewing review history THEN the system SHALL display entries in chronological order with visual indicators for intensive recovery periods
5. WHEN a problem has multiple forgetting events THEN the system SHALL show the escalation pattern and recovery effectiveness

### Requirement 5

**User Story:** As a user, I want to manage intensive recovery cycles with daily practice schedules, so that I can systematically rebuild forgotten problem-solving patterns.

#### Acceptance Criteria

1. WHEN I enter an intensive recovery cycle THEN the system SHALL schedule daily reviews for the specified number of cycles
2. WHEN I successfully complete an intensive review THEN the system SHALL decrement the remaining cycles and schedule the next daily review
3. WHEN I fail an intensive review THEN the system SHALL restart the intensive cycle from the beginning
4. WHEN I complete all intensive cycles THEN the system SHALL graduate me to normal spaced repetition starting at stage 1 (next day)
5. WHEN viewing intensive recovery status THEN the system SHALL show cycles remaining, next review date, and estimated recovery time

### Requirement 6

**User Story:** As a user, I want to customize review intervals and forgetting recovery settings, so that I can adapt the system to my learning preferences and schedule.

#### Acceptance Criteria

1. WHEN I access review settings THEN the system SHALL allow me to modify the standard review stage intervals (default: 1, 3, 7, 14, 30, 60, 120, 240 days)
2. WHEN I access forgetting recovery settings THEN the system SHALL allow me to customize intensive review cycles for different forgetting frequencies
3. WHEN reviewing a problem THEN the system SHALL provide an option to set a custom next review date overriding the default schedule
4. WHEN I modify settings THEN the system SHALL apply changes only to future reviews, not existing scheduled reviews
5. WHEN I reset settings THEN the system SHALL restore research-based default intervals and recovery patterns

### Requirement 7

**User Story:** As a user, I want comprehensive review statistics and analytics, so that I can track my retention performance and identify areas needing attention.

#### Acceptance Criteria

1. WHEN I view the review dashboard THEN the system SHALL display total problems in review rotation, problems due today, overdue problems, and problems in intensive recovery
2. WHEN viewing statistics THEN the system SHALL show forgetting rates by stage, average recovery time, and success rates for intensive cycles
3. WHEN displaying metrics THEN the system SHALL calculate review streak, completion rates, and time spent in recovery vs normal reviews
4. WHEN viewing analytics THEN the system SHALL identify patterns with highest forgetting rates and suggest focused study areas
5. WHEN I complete reviews THEN the system SHALL update all statistics and analytics in real-time