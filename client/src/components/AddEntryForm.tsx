import React, { useState, useEffect } from 'react';
import './AddEntryForm.css';
import { api, ApiError } from '../services/api';

// Types based on the database schema
export interface Concept {
  id: number;
  concept_id: string;
  name: string;
}

export interface Technique {
  id: number;
  name: string;
  description?: string;
}

export interface Goal {
  id: number;
  name: string;
  description?: string;
}

export interface TemplateBasic {
  id: number;
  description: string;
  template_code: string;
}

export interface Pattern {
  id: number;
  name: string;
  description?: string;
  template_id?: number;
  concept_id?: number;
}

// Form data types
export interface PatternFormData {
  name: string;
  description: string;
  template_id: number | null;
  concept_id: number | null;
}

export interface VariantFormData {
  name: string;
  use_when: string;
  notes: string;
  pattern_id: number | null;
  technique_id: number | null;
  goal_id: number | null;
  concept_id: number | null;
  template_pattern_id: number | null;
}

type EntryType = 'pattern' | 'variant';

interface AddEntryFormProps {
  onSubmit: (type: EntryType, data: PatternFormData | VariantFormData) => void;
  onCancel: () => void;
}

const AddEntryForm: React.FC<AddEntryFormProps> = ({ onSubmit, onCancel }) => {
  // Form state
  const [entryType, setEntryType] = useState<EntryType>('pattern');
  const [patternData, setPatternData] = useState<PatternFormData>({
    name: '',
    description: '',
    template_id: null,
    concept_id: null,
  });
  const [variantData, setVariantData] = useState<VariantFormData>({
    name: '',
    use_when: '',
    notes: '',
    pattern_id: null,
    technique_id: null,
    goal_id: null,
    concept_id: null,
    template_pattern_id: null,
  });

  // Reference data state
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [templates, setTemplates] = useState<TemplateBasic[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);

  // Loading and error state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load reference data on component mount
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [conceptsData, techniquesData, goalsData, templatesData, patternsData] = await Promise.all([
          api.referenceData.getConcepts(),
          api.referenceData.getTechniques(),
          api.referenceData.getGoals(),
          api.referenceData.getTemplateBasics(),
          api.referenceData.getPatterns(),
        ]);

        setConcepts(conceptsData);
        setTechniques(techniquesData);
        setGoals(goalsData);
        setTemplates(templatesData);
        setPatterns(patternsData);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(`Failed to load reference data: ${err.message}`);
        } else {
          setError('Failed to load reference data. Please check your connection.');
        }
        console.error('Error loading reference data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadReferenceData();
  }, []);

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (entryType === 'pattern') {
      // Pattern validation
      if (!patternData.name.trim()) {
        newErrors.name = 'Pattern name is required';
      } else if (patternData.name.trim().length < 3) {
        newErrors.name = 'Pattern name must be at least 3 characters';
      } else if (patternData.name.trim().length > 100) {
        newErrors.name = 'Pattern name must be less than 100 characters';
      }

      if (!patternData.description.trim()) {
        newErrors.description = 'Pattern description is required';
      } else if (patternData.description.trim().length < 10) {
        newErrors.description = 'Description must be at least 10 characters';
      } else if (patternData.description.trim().length > 1000) {
        newErrors.description = 'Description must be less than 1000 characters';
      }

      // Optional field validation
      if (patternData.template_id && !templates.find(t => t.id === patternData.template_id)) {
        newErrors.template_id = 'Selected template is not valid';
      }
      if (patternData.concept_id && !concepts.find(c => c.id === patternData.concept_id)) {
        newErrors.concept_id = 'Selected concept is not valid';
      }
    } else {
      // Variant validation
      if (!variantData.name.trim()) {
        newErrors.name = 'Variant name is required';
      } else if (variantData.name.trim().length < 3) {
        newErrors.name = 'Variant name must be at least 3 characters';
      } else if (variantData.name.trim().length > 100) {
        newErrors.name = 'Variant name must be less than 100 characters';
      }

      if (!variantData.use_when.trim()) {
        newErrors.use_when = 'Use when description is required';
      } else if (variantData.use_when.trim().length < 10) {
        newErrors.use_when = 'Use when description must be at least 10 characters';
      } else if (variantData.use_when.trim().length > 500) {
        newErrors.use_when = 'Use when description must be less than 500 characters';
      }

      if (!variantData.pattern_id) {
        newErrors.pattern_id = 'Pattern selection is required';
      } else if (!patterns.find(p => p.id === variantData.pattern_id)) {
        newErrors.pattern_id = 'Selected pattern is not valid';
      }

      // Optional field validation
      if (variantData.technique_id && !techniques.find(t => t.id === variantData.technique_id)) {
        newErrors.technique_id = 'Selected technique is not valid';
      }
      if (variantData.goal_id && !goals.find(g => g.id === variantData.goal_id)) {
        newErrors.goal_id = 'Selected goal is not valid';
      }
      if (variantData.concept_id && !concepts.find(c => c.id === variantData.concept_id)) {
        newErrors.concept_id = 'Selected concept is not valid';
      }
      if (variantData.template_pattern_id && !patterns.find(p => p.id === variantData.template_pattern_id)) {
        newErrors.template_pattern_id = 'Selected template pattern is not valid';
      }
      if (variantData.notes && variantData.notes.length > 1000) {
        newErrors.notes = 'Notes must be less than 1000 characters';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError(null);
    
    try {
      const data = entryType === 'pattern' ? patternData : variantData;
      const result = await onSubmit(entryType, data);
      
      // Handle successful submission
      handleSuccessfulSubmission(entryType, result);
      
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 400) {
          // Handle validation errors
          if (err.details && typeof err.details === 'object') {
            // If the API returns field-specific errors
            setErrors(err.details);
          } else {
            setError(err.message);
          }
        } else {
          setError(`Failed to create ${entryType}: ${err.message}`);
        }
      } else {
        setError(err instanceof Error ? err.message : `Failed to create ${entryType}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle entry type change
  const handleEntryTypeChange = (type: EntryType) => {
    setEntryType(type);
    setErrors({}); // Clear validation errors when switching types
  };

  // Handle pattern data changes
  const handlePatternChange = (field: keyof PatternFormData, value: string | number | null) => {
    setPatternData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle variant data changes
  const handleVariantChange = (field: keyof VariantFormData, value: string | number | null) => {
    setVariantData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Reset form to initial state
  const resetForm = () => {
    setPatternData({
      name: '',
      description: '',
      template_id: null,
      concept_id: null,
    });
    setVariantData({
      name: '',
      use_when: '',
      notes: '',
      pattern_id: null,
      technique_id: null,
      goal_id: null,
      concept_id: null,
      template_pattern_id: null,
    });
    setErrors({});
    setError(null);
    setEntryType('pattern');
  };

  // Handle successful form submission
  const handleSuccessfulSubmission = (type: EntryType, result: any) => {
    console.log(`${type} created successfully:`, result);
    
    // Reset form state
    resetForm();
    
    // Close form after a brief delay to show success
    setTimeout(() => {
      onCancel();
    }, 1500);
  };

  if (loading) {
    return (
      <div className="add-entry-form">
        <div className="loading">Loading form data...</div>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="add-entry-form">
        <div>
          <div className="form-header">
            <h2>Error Loading Form</h2>
            <button className="close-btn" onClick={onCancel}>×</button>
          </div>
          <div className="error">
            <p>{error}</p>
            <div style={{ marginTop: '1rem' }}>
              <button 
                onClick={() => window.location.reload()} 
                style={{ marginRight: '1rem' }}
              >
                Retry
              </button>
              <button onClick={onCancel}>Close</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="add-entry-form">
      <div>
        <div className="form-header">
          <h2>Add New Entry</h2>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* General Error Display */}
          {error && (
            <div className="form-error" style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              padding: '0.75rem',
              marginBottom: '1rem',
              color: '#dc2626'
            }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Entry Type Selection */}
          <div className="form-section">
            <label className="section-label">Entry Type</label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="entryType"
                  value="pattern"
                  checked={entryType === 'pattern'}
                  onChange={() => handleEntryTypeChange('pattern')}
                />
                <span>Pattern</span>
                <small>A reusable problem-solving approach</small>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="entryType"
                  value="variant"
                  checked={entryType === 'variant'}
                  onChange={() => handleEntryTypeChange('variant')}
                />
                <span>Variant</span>
                <small>A specific implementation of a pattern</small>
              </label>
            </div>
          </div>

          {/* Conditional Form Fields */}
          {entryType === 'pattern' ? (
            <div className="pattern-fields">
              {/* Pattern Name */}
              <div className="form-field">
                <label htmlFor="pattern-name">Pattern Name *</label>
                <input
                  id="pattern-name"
                  type="text"
                  value={patternData.name}
                  onChange={(e) => handlePatternChange('name', e.target.value)}
                  placeholder="e.g., Two Pointers"
                  className={errors.name ? 'error' : ''}
                />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </div>

              {/* Pattern Description */}
              <div className="form-field">
                <label htmlFor="pattern-description">Description *</label>
                <textarea
                  id="pattern-description"
                  value={patternData.description}
                  onChange={(e) => handlePatternChange('description', e.target.value)}
                  placeholder="Describe when and how to use this pattern..."
                  rows={3}
                  className={errors.description ? 'error' : ''}
                />
                {errors.description && <span className="field-error">{errors.description}</span>}
              </div>

              {/* Template Selection */}
              <div className="form-field">
                <label htmlFor="pattern-template">Template (Optional)</label>
                <select
                  id="pattern-template"
                  value={patternData.template_id || ''}
                  onChange={(e) => handlePatternChange('template_id', e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">Select a template...</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Concept Selection */}
              <div className="form-field">
                <label htmlFor="pattern-concept">Concept (Optional)</label>
                <select
                  id="pattern-concept"
                  value={patternData.concept_id || ''}
                  onChange={(e) => handlePatternChange('concept_id', e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">Select a concept...</option>
                  {concepts.map(concept => (
                    <option key={concept.id} value={concept.id}>
                      {concept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="variant-fields">
              {/* Variant Name */}
              <div className="form-field">
                <label htmlFor="variant-name">Variant Name *</label>
                <input
                  id="variant-name"
                  type="text"
                  value={variantData.name}
                  onChange={(e) => handleVariantChange('name', e.target.value)}
                  placeholder="e.g., Fast and Slow Pointers"
                  className={errors.name ? 'error' : ''}
                />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </div>

              {/* Use When */}
              <div className="form-field">
                <label htmlFor="variant-use-when">Use When *</label>
                <textarea
                  id="variant-use-when"
                  value={variantData.use_when}
                  onChange={(e) => handleVariantChange('use_when', e.target.value)}
                  placeholder="Describe when to use this variant..."
                  rows={2}
                  className={errors.use_when ? 'error' : ''}
                />
                {errors.use_when && <span className="field-error">{errors.use_when}</span>}
              </div>

              {/* Pattern Selection */}
              <div className="form-field">
                <label htmlFor="variant-pattern">Pattern *</label>
                <select
                  id="variant-pattern"
                  value={variantData.pattern_id || ''}
                  onChange={(e) => handleVariantChange('pattern_id', e.target.value ? parseInt(e.target.value) : null)}
                  className={errors.pattern_id ? 'error' : ''}
                >
                  <option value="">Select a pattern...</option>
                  {patterns.map(pattern => (
                    <option key={pattern.id} value={pattern.id}>
                      {pattern.name}
                    </option>
                  ))}
                </select>
                {errors.pattern_id && <span className="field-error">{errors.pattern_id}</span>}
              </div>

              {/* Technique Selection */}
              <div className="form-field">
                <label htmlFor="variant-technique">Technique (Optional)</label>
                <select
                  id="variant-technique"
                  value={variantData.technique_id || ''}
                  onChange={(e) => handleVariantChange('technique_id', e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">Select a technique...</option>
                  {techniques.map(technique => (
                    <option key={technique.id} value={technique.id}>
                      {technique.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Goal Selection */}
              <div className="form-field">
                <label htmlFor="variant-goal">Goal (Optional)</label>
                <select
                  id="variant-goal"
                  value={variantData.goal_id || ''}
                  onChange={(e) => handleVariantChange('goal_id', e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">Select a goal...</option>
                  {goals.map(goal => (
                    <option key={goal.id} value={goal.id}>
                      {goal.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Concept Selection */}
              <div className="form-field">
                <label htmlFor="variant-concept">Concept (Optional)</label>
                <select
                  id="variant-concept"
                  value={variantData.concept_id || ''}
                  onChange={(e) => handleVariantChange('concept_id', e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">Select a concept...</option>
                  {concepts.map(concept => (
                    <option key={concept.id} value={concept.id}>
                      {concept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Template Pattern Selection */}
              <div className="form-field">
                <label htmlFor="variant-template-pattern">Template Pattern (Optional)</label>
                <select
                  id="variant-template-pattern"
                  value={variantData.template_pattern_id || ''}
                  onChange={(e) => handleVariantChange('template_pattern_id', e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">Select a template pattern...</option>
                  {patterns.map(pattern => (
                    <option key={pattern.id} value={pattern.id}>
                      {pattern.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div className="form-field">
                <label htmlFor="variant-notes">Notes (Optional)</label>
                <textarea
                  id="variant-notes"
                  value={variantData.notes}
                  onChange={(e) => handleVariantChange('notes', e.target.value)}
                  placeholder="Additional notes about this variant..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="form-actions">
            <button type="button" onClick={onCancel} disabled={submitting}>
              Cancel
            </button>
            <button 
              type="button" 
              onClick={resetForm} 
              disabled={submitting}
              style={{ backgroundColor: '#f59e0b', color: 'white' }}
            >
              Reset
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : `Create ${entryType === 'pattern' ? 'Pattern' : 'Variant'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEntryForm;