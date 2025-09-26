import React, { useState, useEffect } from 'react';
import { Problem } from './ProblemList';

// Extended Problem interface for all problems
interface ExtendedProblem extends Problem {
  popularity?: number;
  leetcode_link?: string;
}

interface AddProblemsTabProps {
  problem: Problem;
  onSelectProblem?: (problem: Problem) => void;
}

const AddProblemsTab: React.FC<AddProblemsTabProps> = ({ problem, onSelectProblem }) => {
  const [allProblems, setAllProblems] = useState<ExtendedProblem[]>([]);
  const [filteredProblems, setFilteredProblems] = useState<ExtendedProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedConcept, setSelectedConcept] = useState<string>('all');

  useEffect(() => {
    const fetchAllProblems = async () => {
      setLoading(true);
      try {
        // Fetch all problems
        const response = await fetch('/api/problems');
        const problems = await response.json();
        
        // Sort by popularity (if available) or by problem ID
        problems.sort((a: ExtendedProblem, b: ExtendedProblem) => {
          if (a.popularity && b.popularity) {
            return (b.popularity || 0) - (a.popularity || 0);
          }
          return a.id - b.id;
        });
        
        setAllProblems(problems);
        setFilteredProblems(problems);
      } catch (error) {
        console.error('Error fetching problems:', error);
        setAllProblems([]);
        setFilteredProblems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllProblems();
  }, []);

  // Filter problems based on search query, difficulty, and concept
  useEffect(() => {
    let filtered = allProblems.filter((p: ExtendedProblem) => 
      p.id !== problem.id // Exclude current problem
    );

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p: ExtendedProblem) => 
        p.title.toLowerCase().includes(query) ||
        p.concept?.toLowerCase().includes(query)
      );
    }

    // Apply difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter((p: ExtendedProblem) => 
        p.difficulty.toLowerCase() === selectedDifficulty.toLowerCase()
      );
    }

    // Apply concept filter
    if (selectedConcept !== 'all') {
      filtered = filtered.filter((p: ExtendedProblem) => 
        p.concept === selectedConcept
      );
    }

    setFilteredProblems(filtered);
  }, [allProblems, searchQuery, selectedDifficulty, selectedConcept, problem.id]);

  const handleProblemClick = (selectedProblem: ExtendedProblem) => {
    onSelectProblem?.(selectedProblem);
  };

  // Get unique concepts for filter dropdown
  const uniqueConcepts = Array.from(new Set(allProblems.map(p => p.concept).filter(Boolean))).sort();

  if (loading) {
    return (
      <div className="add-problems-content">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading all problems...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="add-problems-content">
      <div className="add-problems-header">
        <h4>Add Problems</h4>
        <p className="text-sm text-gray-600">
          Browse and select from all {allProblems.length} problems
        </p>
      </div>

      {/* Search and Filter Controls */}
      <div className="filter-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search problems by title or concept..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-dropdowns">
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          
          <select
            value={selectedConcept}
            onChange={(e) => setSelectedConcept(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Concepts</option>
            {uniqueConcepts.map(concept => (
              <option key={concept} value={concept}>{concept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Counter */}
      <div className="results-counter">
        Showing {filteredProblems.length} of {allProblems.length} problems
      </div>
      
      {/* Problems List */}
      <div className="problems-list">
        {filteredProblems.length === 0 ? (
          <div className="no-problems">
            <p>No problems found matching your criteria.</p>
            <button 
              onClick={() => {
                setSearchQuery('');
                setSelectedDifficulty('all');
                setSelectedConcept('all');
              }}
              className="clear-filters-btn"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          filteredProblems.map((problemItem) => (
            <div
              key={problemItem.id}
              className="problem-item"
              onClick={() => handleProblemClick(problemItem)}
            >
              <div className="problem-info">
                <div className="problem-title">{problemItem.title}</div>
                <div className="problem-meta">
                  <span className={`difficulty-badge difficulty-${problemItem.difficulty.toLowerCase()}`}>
                    {problemItem.difficulty}
                  </span>
                  <span className="concept-badge">{problemItem.concept}</span>
                  {problemItem.popularity && (
                    <span className="popularity-badge">
                      🔥 {problemItem.popularity}
                    </span>
                  )}
                </div>
              </div>
              <div className="problem-actions">
                {problemItem.leetcode_link && (
                  <button
                    className="open-link-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(problemItem.leetcode_link, '_blank');
                    }}
                    title="Open in LeetCode"
                  >
                    🔗
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AddProblemsTab;
