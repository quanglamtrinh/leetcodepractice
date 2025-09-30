import React, { useState, useEffect } from 'react';
import SearchableDropdown from './SearchableDropdown';

interface AddProblemFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AddProblemForm: React.FC<AddProblemFormProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    concept: '',
    difficulty: 'easy',
    acceptance_rate: '',
    popularity: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [concepts, setConcepts] = useState<string[]>([]);
  const [loadingConcepts, setLoadingConcepts] = useState(true);
  const [existingLinks, setExistingLinks] = useState<string[]>([]);
  const [linkError, setLinkError] = useState('');

  // Fetch available concepts
  useEffect(() => {
    const fetchConcepts = async () => {
      try {
        const response = await fetch('/api/problems');
        const problems = await response.json();
        
        // Extract unique concepts
        const uniqueConcepts = Array.from(new Set(problems.map((p: any) => p.concept).filter(Boolean))) as string[];
        setConcepts(uniqueConcepts.sort());
        
        // Extract existing leetcode links for validation
        const existingLeetcodeLinks = problems
          .map((p: any) => p.leetcode_link)
          .filter(Boolean);
        setExistingLinks(existingLeetcodeLinks);
      } catch (error) {
        console.error('Error fetching concepts:', error);
        // Fallback to hardcoded concepts if API fails
        setConcepts([
          'Arrays & Hashing',
          'Two Pointers',
          'Sliding Window',
          'Stack',
          'Binary Search',
          'Linked List',
          'Trees',
          'Tries',
          'Backtracking',
          'Heap / Priority Queue',
          'Graphs',
          '1-D Dynamic Programming',
          '2-D Dynamic Programming',
          'Greedy',
          'Intervals',
          'Math & Geometry',
          'Bit Manipulation',
          'Misc'
        ]);
      } finally {
        setLoadingConcepts(false);
      }
    };

    fetchConcepts();
  }, []);

  // Generate leetcode link from title
  const generateLeetcodeLink = (title: string): string => {
    if (!title.trim()) return '';
    
    // Convert title to leetcode URL format
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .trim();
    
    return `https://leetcode.com/problems/${slug}/`;
  };

  // Check if the generated link already exists
  const checkLinkExists = (title: string): boolean => {
    if (!title.trim()) return false;
    const generatedLink = generateLeetcodeLink(title);
    return existingLinks.includes(generatedLink);
  };

  // Get next available problem ID
  const getNextProblemId = async (): Promise<number> => {
    try {
      const response = await fetch('/api/problems');
      const problems = await response.json();
      const maxId = Math.max(...problems.map((p: any) => parseInt(p.problem_id) || 0));
      return maxId + 1;
    } catch (error) {
      console.error('Error getting next problem ID:', error);
      return 1; // Fallback
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Check for duplicate link when title changes
    if (name === 'title') {
      if (value.trim() && checkLinkExists(value)) {
        setLinkError('A problem with this title already exists in the database');
      } else {
        setLinkError('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }
      if (!formData.concept.trim()) {
        throw new Error('Concept is required');
      }

      // Check if link already exists
      if (checkLinkExists(formData.title)) {
        throw new Error('A problem with this title already exists in the database');
      }

      // Get next problem ID
      const problemId = await getNextProblemId();
      
      // Generate leetcode link
      const leetcodeLink = generateLeetcodeLink(formData.title);
      
      // Prepare data for API
      const problemData = {
        problem_id: problemId,
        title: formData.title.trim(),
        concept: formData.concept.trim(),
        concept_id: formData.concept.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        difficulty: formData.difficulty,
        acceptance_rate: formData.acceptance_rate ? parseFloat(formData.acceptance_rate) : null,
        popularity: formData.popularity ? parseInt(formData.popularity) : null,
        leetcode_link: leetcodeLink
      };

      // Submit to API
      const response = await fetch('/api/problems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(problemData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add problem');
      }

      // Success
      onSuccess();
      onClose();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add New Problem</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                linkError 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="e.g., Two Sum"
              required
            />
            {formData.title && (
              <p className={`text-xs mt-1 ${linkError ? 'text-red-500' : 'text-gray-500'}`}>
                LeetCode Link: {generateLeetcodeLink(formData.title)}
                {linkError && <span className="block mt-1 font-medium">⚠️ {linkError}</span>}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Concept *
            </label>
            {loadingConcepts ? (
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                Loading concepts...
              </div>
            ) : (
              <SearchableDropdown
                options={concepts}
                value={formData.concept}
                onChange={(value) => setFormData(prev => ({ ...prev, concept: value }))}
                placeholder="Select or type a concept..."
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Difficulty *
            </label>
            <select
              name="difficulty"
              value={formData.difficulty}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Acceptance Rate (%)
            </label>
            <input
              type="number"
              name="acceptance_rate"
              value={formData.acceptance_rate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 45.2"
              min="0"
              max="100"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Popularity
            </label>
            <input
              type="number"
              name="popularity"
              value={formData.popularity}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 1234567"
              min="0"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !!linkError}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add Problem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProblemForm;
