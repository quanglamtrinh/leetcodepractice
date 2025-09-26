# Enhanced Spaced Repetition Design Document

## Overview

This design extends the existing comprehensive schema to support enhanced spaced repetition with pattern-variant associations. The system leverages the existing problem_tags table for flexible associations while adding new functionality for pattern-based learning and review analytics.

## Architecture

### Database Layer
- **Existing Tables**: Utilizes current patterns, variants, problems, and problem_tags tables
- **Enhanced Associations**: Extends problem_tags usage for pattern-variant-problem relationships
- **Review Integration**: Integrates pattern/variant data into existing review_history and review_attempts
- **Analytics Tables**: New tables for tracking pattern-variant performance metrics

### Application Layer
- **Association Form**: New form component for creating pattern-variant-problem associations
- **Enhanced Review**: Modified review system that incorporates pattern/variant context
- **Analytics Engine**: New service for calculating pattern-variant performance metrics
- **API Extensions**: New endpoints for association management and analytics

### UI Layer
- **Association Interface**: Form for managing problem-pattern-variant relationships
- **Enhanced Review UI**: Review interface showing pattern/variant context and hints
- **Analytics Dashboard**: Visual representation of pattern-variant learning progress
- **Problem Enhancement**: Enhanced problem view showing associated patterns/variants

## Components and Interfaces

### Database Schema Extensions

#### Enhanced problem_tags Usage
The existing problem_tags table will be used more extensively:

```sql
-- Example associations in problem_tags
-- Pattern association: problem_id + pattern_id + concept_id
-- Variant association: problem_id + variant_id + pattern_id + technique_id + goal_id
-- Full association: problem_id + pattern_id + variant_id + concept_id + technique_id + goal_id
```

#### New Analytics Tables

**pattern_performance**
```sql
CREATE TABLE pattern_performance (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT, -- For future multi-user support
    pattern_id BIGINT REFERENCES patterns(id),
    total_attempts INTEGER DEFAULT 0,
    successful_attempts INTEGER DEFAULT 0,
    last_reviewed DATE,
    average_time_minutes DECIMAL(5,2),
    difficulty_rating DECIMAL(3,2), -- Calculated based on success rate
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**variant_performance**
```sql
CREATE TABLE variant_performance (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT, -- For future multi-user support
    variant_id BIGINT REFERENCES variants(id),
    pattern_id BIGINT REFERENCES patterns(id),
    total_attempts INTEGER DEFAULT 0,
    successful_attempts INTEGER DEFAULT 0,
    last_reviewed DATE,
    average_time_minutes DECIMAL(5,2),
    difficulty_rating DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**review_pattern_tracking**
```sql
CREATE TABLE review_pattern_tracking (
    id BIGSERIAL PRIMARY KEY,
    review_history_id BIGINT REFERENCES review_history(id),
    problem_id BIGINT REFERENCES problems(id),
    pattern_id BIGINT REFERENCES patterns(id),
    variant_id BIGINT REFERENCES variants(id),
    pattern_understood BOOLEAN,
    variant_applied_correctly BOOLEAN,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Design

#### New Association Endpoints

**GET /api/problems/:id/associations** - Get all pattern/variant associations for a problem
```json
{
  "problem_id": 1,
  "patterns": [
    {
      "id": 1,
      "name": "Two Pointers",
      "description": "Use two pointers technique",
      "template_code": "...",
      "concept": "two-pointers"
    }
  ],
  "variants": [
    {
      "id": 1,
      "name": "Fixed-size window",
      "use_when": "When k is constant",
      "notes": "Calculate sum/max in each window",
      "pattern_id": 1,
      "technique": "Sliding Window",
      "goal": "Optimization"
    }
  ]
}
```

**POST /api/problems/:id/associations** - Create new association
```json
{
  "pattern_id": 1,
  "variant_id": 2,
  "concept_id": 1,
  "technique_id": 1,
  "goal_id": 1,
  "scenario_notes": "Use this variant when window size is fixed",
  "application_notes": "Remember to handle edge cases at boundaries"
}
```

**DELETE /api/problems/:id/associations/:association_id** - Remove association

#### Enhanced Review Endpoints

**GET /api/problems/:id/review-context** - Get pattern/variant context for review
**POST /api/reviews/:id/pattern-feedback** - Record pattern/variant understanding

#### Analytics Endpoints

**GET /api/analytics/patterns** - Pattern performance analytics
**GET /api/analytics/variants** - Variant performance analytics
**GET /api/analytics/concepts/:id/patterns** - Pattern mastery within concept

### UI Component Design

#### Association Form Component

**ProblemAssociationForm**
```typescript
interface AssociationFormProps {
  problemId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

interface AssociationFormData {
  pattern_id?: number;
  variant_id?: number;
  concept_id?: number;
  technique_id?: number;
  goal_id?: number;
  scenario_notes?: string;
  application_notes?: string;
}
```

**Form Fields:**
- **Pattern Selection**: Searchable dropdown with pattern name and description
- **Variant Selection**: Filtered by selected pattern, shows use_when and notes
- **Concept**: Auto-populated from pattern, can be overridden
- **Technique**: Optional, from variant or manual selection
- **Goal**: Optional, from variant or manual selection
- **Scenario Notes**: Text area for specific scenario description
- **Application Notes**: Text area for implementation notes

#### Enhanced Review Interface

**ReviewWithContext**
- Display associated patterns as "Approach Hints"
- Show variant information as "Scenario Context"
- Allow marking pattern/variant understanding separately
- Provide quick access to template code

#### Analytics Dashboard

**PatternAnalytics**
- Success rate by pattern (bar chart)
- Variant difficulty heatmap
- Concept mastery overview
- Recommended focus areas

## Data Models

### Enhanced Models

```typescript
interface ProblemAssociation {
  id: number;
  problem_id: number;
  pattern_id?: number;
  variant_id?: number;
  concept_id?: number;
  technique_id?: number;
  goal_id?: number;
  scenario_notes?: string;
  application_notes?: string;
  created_at: Date;
}

interface PatternPerformance {
  pattern_id: number;
  pattern_name: string;
  total_attempts: number;
  successful_attempts: number;
  success_rate: number;
  average_time_minutes: number;
  difficulty_rating: number;
  last_reviewed: Date;
}

interface VariantPerformance {
  variant_id: number;
  variant_name: string;
  pattern_name: string;
  total_attempts: number;
  successful_attempts: number;
  success_rate: number;
  average_time_minutes: number;
  difficulty_rating: number;
  last_reviewed: Date;
}

interface ReviewContext {
  problem: Problem;
  patterns: Pattern[];
  variants: Variant[];
  previous_performance: {
    pattern_success_rate: number;
    variant_success_rate: number;
    common_mistakes: string[];
  };
}
```

## Enhanced Review Workflow

### Review Process with Pattern Context

1. **Problem Presentation**: Show problem with associated pattern/variant hints (collapsible)
2. **Solution Attempt**: User works on solution with optional template code reference
3. **Pattern Assessment**: User indicates understanding of pattern application
4. **Variant Assessment**: User indicates correct variant usage (if applicable)
5. **Traditional Review**: Standard remembered/forgot with time tracking
6. **Performance Update**: Update both traditional and pattern-variant metrics

### Adaptive Scheduling

- **Pattern Reinforcement**: Problems with poorly understood patterns get higher priority
- **Variant Focus**: Variants with low success rates get additional review opportunities
- **Concept Balancing**: Ensure coverage across all patterns within a concept

## Error Handling

### Association Management
- Handle invalid pattern-variant combinations
- Validate foreign key references
- Graceful handling of optional field combinations

### Review Integration
- Fallback to traditional review if pattern data unavailable
- Handle partial pattern/variant associations
- Maintain backward compatibility with existing review data

## Testing Strategy

### Association Testing
- Test all combinations of optional fields
- Validate pattern-variant relationship constraints
- Test association CRUD operations

### Review Integration Testing
- Test enhanced review workflow
- Validate performance metric calculations
- Test analytics data accuracy

### UI Testing
- Test form validation and user experience
- Test review interface with pattern context
- Test analytics dashboard functionality