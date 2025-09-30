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
  const [similarProblems, setSimilarProblems] = useState<ExtendedProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedConcept, setSelectedConcept] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'browse' | 'similar'>('similar');
  const [addingProblems, setAddingProblems] = useState<Set<number>>(new Set());

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
    console.log('🖱️ Similar problem clicked:', selectedProblem.title, 'ID:', selectedProblem.id);
    console.log('📋 Raw notes data:', selectedProblem.notes);
    console.log('📋 Raw solution data:', selectedProblem.solution);
    
    // Parse notes if they exist and are a string
    if (selectedProblem.notes && typeof selectedProblem.notes === 'string') {
      try {
        const parsedNotes = JSON.parse(selectedProblem.notes);
        selectedProblem.notes = parsedNotes;
        console.log('✅ Parsed notes:', parsedNotes);
      } catch (error) {
        console.error('❌ Error parsing notes:', error);
      }
    }
    
    // Parse solution if it exists and is a string
    if (selectedProblem.solution && typeof selectedProblem.solution === 'string') {
      try {
        const parsedSolution = JSON.parse(selectedProblem.solution);
        selectedProblem.solution = parsedSolution;
        console.log('✅ Parsed solution:', parsedSolution);
      } catch (error) {
        console.error('❌ Error parsing solution:', error);
      }
    }
    
    console.log('📤 Passing to parent:', {
      id: selectedProblem.id,
      title: selectedProblem.title,
      notes: selectedProblem.notes,
      solution: selectedProblem.solution
    });
    
    onSelectProblem?.(selectedProblem);
  };

  // Fetch similar problems for the current problem
  const fetchSimilarProblems = async () => {
    try {
      const response = await fetch(`/api/problems/${problem.id}/similar`);
      const similar = await response.json();
      setSimilarProblems(similar);
    } catch (error) {
      console.error('Error fetching similar problems:', error);
      setSimilarProblems([]);
    }
  };

  // Add a problem to similar problems with transitive closure
  const addSimilarProblem = async (problemId: number) => {
    // Add to loading state
    setAddingProblems(prev => new Set(prev).add(problemId));
    
    try {
      // Use the new transitive closure endpoint
      const response = await fetch(`/api/problems/${problem.id}/similar/transitive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ similarProblemId: problemId })
      });

      if (response.ok) {
        const result = await response.json();
        await fetchSimilarProblems(); // Refresh similar problems list
        console.log('✅ Added similar problem with transitive closure:', result);
        console.log(`✅ Added problem ${problemId} to similar problems with bilateral transitive relationships`);
      } else {
        console.error('Failed to add similar problem with transitive closure');
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error adding similar problem with transitive closure:', error);
    } finally {
      // Remove from loading state
      setAddingProblems(prev => {
        const newSet = new Set(prev);
        newSet.delete(problemId);
        return newSet;
      });
    }
  };

  // Remove a problem from similar problems with transitive closure
  const removeSimilarProblem = async (problemId: number) => {
    try {
      // Use the new transitive closure endpoint
      const response = await fetch(`/api/problems/${problem.id}/similar/transitive/${problemId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        await fetchSimilarProblems(); // Refresh similar problems list
        console.log('✅ Removed similar problem with transitive closure:', result);
        console.log(`✅ Removed problem ${problemId} from similar problems with transitive cleanup`);
      } else {
        console.error('Failed to remove similar problem with transitive closure');
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error removing similar problem with transitive closure:', error);
    }
  };

  // Load similar problems when component mounts or problem changes
  useEffect(() => {
    fetchSimilarProblems();
  }, [problem.id]);

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
      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-nav-btn ${activeTab === 'similar' ? 'active' : ''}`}
          onClick={() => setActiveTab('similar')}
        >
          🔗 Similar Problems ({similarProblems.length})
        </button>
        <button
          className={`tab-nav-btn ${activeTab === 'browse' ? 'active' : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          🔍 Browse All Problems
        </button>
      </div>

      {/* Browse Tab Content */}
      {activeTab === 'browse' && (
        <>
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
              filteredProblems.map((problemItem) => {
                const isAlreadySimilar = similarProblems.some(sp => sp.id === problemItem.id);
                return (
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
                      </div>
                    </div>
                    <div className="problem-actions">
                      {!isAlreadySimilar ? (
                        <button
                          className={`add-similar-btn ${addingProblems.has(problemItem.id) ? 'loading' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            addSimilarProblem(problemItem.id);
                          }}
                          disabled={addingProblems.has(problemItem.id)}
                          title="Add to similar problems"
                        >
                          {addingProblems.has(problemItem.id) ? '⏳' : '➕'}
                        </button>
                      ) : (
                        <span className="already-similar">✓ Added</span>
                      )}
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
                );
              })
            )}
          </div>
        </>
      )}

      {/* Similar Problems Tab Content */}
      {activeTab === 'similar' && (
        <>
          <div className="similar-problems-section">
            <div className="section-header">
              <h5>Similar Problems for "{problem.title}"</h5>
              <p className="text-sm text-gray-600">
                {similarProblems.length} similar problems added
              </p>
            </div>
            
            {similarProblems.length === 0 ? (
              <div className="no-similar-problems">
                <p>No similar problems added yet.</p>
                <p className="text-sm text-gray-500">
                  Switch to "Browse All Problems" tab to add similar problems.
                </p>
              </div>
            ) : (
              <div className="similar-problems-list">
                {similarProblems.map((similarProblem) => (
                  <div
                    key={similarProblem.id}
                    className="similar-problem-item"
                    onClick={() => handleProblemClick(similarProblem)}
                  >
                    <div className="problem-info">
                      <div className="problem-title">{similarProblem.title}</div>
                      <div className="problem-meta">
                        <span className={`difficulty-badge difficulty-${similarProblem.difficulty.toLowerCase()}`}>
                          {similarProblem.difficulty}
                        </span>
                        <span className="concept-badge">{similarProblem.concept}</span>
                      </div>
                    </div>
                    <div className="problem-actions">
                      <button
                        className="remove-similar-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSimilarProblem(similarProblem.id);
                        }}
                        title="Remove from similar problems"
                      >
                        ❌
                      </button>
                      {similarProblem.leetcode_link && (
                        <button
                          className="open-link-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(similarProblem.leetcode_link, '_blank');
                          }}
                          title="Open in LeetCode"
                        >
                          🔗
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AddProblemsTab;
