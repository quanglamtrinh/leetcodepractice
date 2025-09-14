# Design Document

## Overview

This design outlines the database schema upgrade and UI form implementation for a pattern-based LeetCode practice system. The system uses your comprehensive schema design with patterns, variants, techniques, concepts, goals, template systems, and advanced review tracking, while maintaining full backward compatibility with existing functionality.

## Architecture

### Database Layer
- **Core Tables**: concepts, techniques, goals, template_basics, patterns, variants, template_variants
- **Problem Management**: Enhanced problems table with flexible pattern/variant associations via problem_tags
- **Review System**: Comprehensive review_history, review_attempts, review_patterns, and mistakes tracking
- **Advanced Features**: Spaced repetition functions, mistake analysis, performance views, and ENUM types

### Application Layer
- **Form Component**: React-based form for adding patterns and variants with dynamic field rendering
- **API Endpoints**: RESTful endpoints leveraging your database functions and views
- **Validation Layer**: Client and server-side validation matching your schema constraints and ENUM types

### UI Layer
- **Add Form Interface**: Dynamic form supporting both pattern and variant creation
- **Pattern Browser**: Interface utilizing your views for efficient data display
- **Integration**: Seamless integration with existing spaced repetition workflow

## Components and Interfaces

### Database Schema Design (Your Implementation)

#### ENUM Types
```sql
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE review_result AS ENUM ('remembered', 'forgot');
CREATE TYPE mistake_type AS ENUM (
    'logic_error', 'syntax_error', 'edge_case', 'time_complexity',
    'space_complexity', 'algorithm_choice', 'implementation_detail',
    'off_by_one', 'boundary_condition', 'data_structure_choice',
    'optimization', 'other'
);
```

#### Core Reference Tables

**concepts**
```sql
CREATE TABLE concepts (
    id BIGSERIAL PRIMARY KEY,
    concept_id VARCHAR(50) UNIQUE NOT NULL, -- For easy reference like 'two-pointers'
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**techniques**
```sql
CREATE TABLE techniques (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**goals**
```sql
CREATE TABLE goals (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Template System

**template_basics**
```sql
CREATE TABLE template_basics (
    id BIGSERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    template_code TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**template_variants**
```sql
CREATE TABLE template_variants (
    id BIGSERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    template_code TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Pattern and Variant System

**patterns**
```sql
CREATE TABLE patterns (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    template_id BIGINT REFERENCES template_basics(id),
    concept_id BIGINT REFERENCES concepts(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**variants**
```sql
CREATE TABLE variants (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    use_when TEXT,
    notes TEXT,
    pattern_id BIGINT REFERENCES patterns(id),
    technique_id BIGINT REFERENCES techniques(id),
    goal_id BIGINT REFERENCES goals(id),
    concept_id BIGINT REFERENCES concepts(id),
    template_pattern_id BIGINT, -- References patterns or template_variants
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Enhanced Problems and Associations

**problems** (Your enhanced version)
```sql
CREATE TABLE problems (
    id BIGSERIAL PRIMARY KEY,
    problem_id BIGINT UNIQUE NOT NULL, -- LeetCode problem number
    title VARCHAR(255) NOT NULL,
    concept VARCHAR(100),
    difficulty difficulty_level NOT NULL,
    acceptance_rate DECIMAL(5,2),
    popularity BIGINT,
    solved BOOLEAN DEFAULT FALSE,
    notes TEXT,
    leetcode_link TEXT,
    solution BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**problem_tags** (Flexible many-to-many associations)
```sql
CREATE TABLE problem_tags (
    id BIGSERIAL PRIMARY KEY,
    problem_id BIGINT REFERENCES problems(id) ON DELETE CASCADE,
    variant_id BIGINT REFERENCES variants(id) ON DELETE CASCADE,
    pattern_id BIGINT REFERENCES patterns(id) ON DELETE CASCADE,
    goal_id BIGINT REFERENCES goals(id) ON DELETE CASCADE,
    technique_id BIGINT REFERENCES techniques(id) ON DELETE CASCADE,
    concept_id BIGINT REFERENCES concepts(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Ensure at least two associations per tag
    CHECK (
        (problem_id IS NOT NULL)::int + 
        (variant_id IS NOT NULL)::int + 
        (pattern_id IS NOT NULL)::int + 
        (goal_id IS NOT NULL)::int + 
        (technique_id IS NOT NULL)::int + 
        (concept_id IS NOT NULL)::int >= 2
    )
);
```

#### Review and Tracking System

**review_history**
```sql
CREATE TABLE review_history (
    id BIGSERIAL PRIMARY KEY,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    review_date DATE NOT NULL DEFAULT CURRENT_DATE,
    result review_result NOT NULL,
    interval_days INTEGER NOT NULL,
    next_review_date DATE NOT NULL,
    review_notes TEXT,
    time_spent_minutes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**mistakes**
```sql
CREATE TABLE mistakes (
    id BIGSERIAL PRIMARY KEY,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    mistake_type mistake_type NOT NULL DEFAULT 'other',
    code_snippet TEXT,
    correction TEXT,
    review_session_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Design

#### Endpoints

**Core Data Endpoints**
- **GET /api/concepts** - Retrieve all concepts for dropdown
- **GET /api/techniques** - Retrieve all techniques for multi-select
- **GET /api/goals** - Retrieve all goals for dropdown
- **GET /api/template-basics** - Retrieve basic templates

**Pattern Management**
- **GET /api/patterns** - Retrieve patterns with optional filtering
- **POST /api/patterns** - Create new pattern
- **GET /api/patterns/:id/variants** - Retrieve variants for a specific pattern
- **PUT /api/patterns/:id** - Update existing pattern

**Variant Management**
- **GET /api/variants** - Retrieve variants with filtering
- **POST /api/variants** - Create new variant
- **PUT /api/variants/:id** - Update existing variant

**Unified Entry Creation**
- **POST /api/entries** - Create pattern or variant based on form data

#### Request/Response Format

**POST /api/entries**
```json
{
  "type": "pattern" | "variant",
  "name": "string",
  "description": "string",
  "use_when": "string", // for variants
  "notes": "string", // for variants
  "template_id": "number", // for patterns (template_basics reference)
  "concept_id": "number",
  "pattern_id": "number", // for variants only
  "technique_id": "number", // for variants
  "goal_id": "number", // for variants
  "template_pattern_id": "number" // for variants
}
```

### UI Component Design

#### Form Component Structure

**AddEntryForm**
- Dynamic form that adapts based on entry type (pattern vs variant)
- Real-time validation with error display
- Dropdowns populated from your reference tables
- Support for template selection and association

**Form Fields**
- **Entry Type**: Radio buttons (Pattern/Variant)
- **Pattern Selection**: Dropdown (enabled only for variants, from patterns table)
- **Name**: Text input (required)
- **Description**: Textarea (optional)
- **Use When**: Text input (variants only)
- **Notes**: Textarea (variants only)
- **Concept**: Searchable dropdown (from concepts table)
- **Template**: Dropdown (from template_basics for patterns)
- **Technique**: Dropdown (variants only, from techniques table)
- **Goal**: Dropdown (variants only, from goals table)
- **Template Pattern**: Dropdown (variants only, references patterns or template_variants)

#### Form Behavior

1. **Initial State**: Pattern type selected, variant-specific fields disabled
2. **Pattern Mode**: Pattern fields enabled (name, description, template, concept)
3. **Variant Mode**: All variant fields enabled, pattern selection required
4. **Validation**: Real-time validation matching your schema constraints
5. **Submission**: Loading state, success/error feedback, form reset on success

## Data Models

### Pattern Model (Based on Your Schema)
```typescript
interface Pattern {
  id: number;
  name: string;
  description?: string;
  template_id?: number;
  template?: TemplateBasic;
  concept_id?: number;
  concept?: Concept;
  variants?: Variant[];
  created_at: Date;
}
```

### Variant Model (Based on Your Schema)
```typescript
interface Variant {
  id: number;
  name: string;
  use_when?: string;
  notes?: string;
  pattern_id?: number;
  pattern?: Pattern;
  technique_id?: number;
  technique?: Technique;
  goal_id?: number;
  goal?: Goal;
  concept_id?: number;
  concept?: Concept;
  template_pattern_id?: number;
  created_at: Date;
}
```

### Supporting Models
```typescript
interface Concept {
  id: number;
  concept_id: string; // Your unique identifier
  name: string;
  created_at: Date;
}

interface Technique {
  id: number;
  name: string;
  description?: string;
  created_at: Date;
}

interface Goal {
  id: number;
  name: string;
  description?: string;
  created_at: Date;
}

interface TemplateBasic {
  id: number;
  description: string;
  template_code: string;
  created_at: Date;
}

type DifficultyLevel = 'easy' | 'medium' | 'hard';
type ReviewResult = 'remembered' | 'forgot';
type MistakeType = 'logic_error' | 'syntax_error' | 'edge_case' | 'time_complexity' | 
                   'space_complexity' | 'algorithm_choice' | 'implementation_detail' |
                   'off_by_one' | 'boundary_condition' | 'data_structure_choice' |
                   'optimization' | 'other';
```

## Error Handling

### Database Level
- ENUM type constraints ensure valid values
- Foreign key constraints ensure data integrity
- Unique constraints prevent duplicate names
- CHECK constraints in problem_tags ensure proper associations
- Cascade deletes maintain referential integrity

### API Level
- Input validation using schema validation matching your ENUM types
- Proper HTTP status codes for different error types
- Structured error responses with field-specific messages
- Validation of ENUM values before database insertion

### UI Level
- Form validation with real-time feedback
- Dropdown validation for ENUM fields
- Loading states during API calls
- User-friendly error messages
- Graceful handling of network errors

## Testing Strategy

### Database Testing
- Test all your custom functions (get_due_problems_today, add_review_session, etc.)
- Validate ENUM constraints and CHECK constraints
- Test complex queries with your views (due_problems_today, problem_stats, mistake_analysis)
- Performance testing with your indexes

### API Testing
- Unit tests for all CRUD operations
- Integration tests leveraging your database functions
- Validation testing for ENUM types and constraints
- Error handling testing for constraint violations

### UI Testing
- Component unit tests with React Testing Library
- Form validation testing with ENUM values
- User interaction testing with different form states
- Accessibility testing for form elements

### End-to-End Testing
- Complete form submission workflows using your schema
- Pattern and variant creation with proper associations
- Integration with your spaced repetition system
- Cross-browser compatibility testing