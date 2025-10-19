import React, { useState, useEffect } from 'react';
import { Problem as BaseProblem } from './ProblemList';
import ProblemDetail from './ProblemDetail';
import SolvedToggleButton from './SolvedToggleButton';

interface Problem extends BaseProblem {
  leetcode_link?: string;
}

interface SolvedDetailViewProps {
  problems: Problem[];
  selectedProblem: Problem;
  onSelectProblem: (problem: Problem) => void;
  onBack: () => void;
  onMarkAsUnsolved: (problemId: number) => Promise<void>;
  onNotesSaved?: (problemId: number, notes: string) => void;
  onSolutionSaved?: (problemId: number, solution: string) => void;
}

const SolvedDetailView: React.FC<SolvedDetailViewProps> = ({ problems, selectedProblem, onSelectProblem, onBack, onMarkAsUnsolved, onNotesSaved, onSolutionSaved }) => {
  const [originalProblem, setOriginalProblem] = useState<Problem | null>(selectedProblem);
  const [isViewingSimilar, setIsViewingSimilar] = useState(false);
  const [similarProblems, setSimilarProblems] = useState<Problem[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // Fetch similar problems for a given problem
  const fetchSimilarProblems = async (problemId: number) => {
    setLoadingSimilar(true);
    try {
      const response = await fetch(`/api/problems/${problemId}/similar`);
      const similar = await response.json();
      setSimilarProblems(similar);
    } catch (error) {
      console.error('Error fetching similar problems:', error);
      setSimilarProblems([]);
    } finally {
      setLoadingSimilar(false);
    }
  };

  // Handle problem selection - check if it's a similar problem
  const handleProblemSelect = (problem: Problem) => {
    // Check if the selected problem is in the original solved problems list
    const isOriginalProblem = problems.some(p => p.id === problem.id);
    
    if (!isOriginalProblem) {
      // This is a similar problem, update the view state and fetch similar problems
      setIsViewingSimilar(true);
      setOriginalProblem(originalProblem || selectedProblem);
      fetchSimilarProblems(problem.id);
    } else {
      // This is an original solved problem, reset the view state
      setIsViewingSimilar(false);
      setOriginalProblem(problem);
      setSimilarProblems([]);
    }
    
    onSelectProblem(problem);
  };

  // Handle back button - if viewing similar, go back to original problem
  const handleBack = () => {
    if (isViewingSimilar && originalProblem) {
      setIsViewingSimilar(false);
      setSimilarProblems([]);
      onSelectProblem(originalProblem);
    } else {
      onBack();
    }
  };

  return (
    <div className="problem-detail-view active" id="solvedDetailView">
      <div className="detail-header">
        <button className="back-btn" onClick={handleBack}>
          {isViewingSimilar ? '← Back to Solved Problems' : '← Back to Menu'}
        </button>
        <h2 id="solvedDetailTitle">
          {isViewingSimilar ? 'Similar Problems' : 'Solved Problems'}
        </h2>
        <div className="progress-bar-detail">
          <div className="progress-fill-detail" id="solvedDetailProgressFill"></div>
        </div>
      </div>
      <div className="detail-content">
        {/* Problem List Panel */}
        <div className="problem-list-panel">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" id="solvedDetailProblemCount">
              {isViewingSimilar 
                ? `Similar Problems (${similarProblems.length})` 
                : `Solved Problems (${problems.length})`
              }
            </h3>
            {/* Sort controls can be added here */}
          </div>
          <div className="space-y-2" id="solvedDetailProblemList">
            {isViewingSimilar ? (
              loadingSimilar ? (
                <div className="text-center py-4 text-gray-500">Loading similar problems...</div>
              ) : similarProblems.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No similar problems found</div>
              ) : (
                similarProblems.map(problem => (
                  <div
                    key={problem.id}
                    id={`similarProblemItem-${problem.id}`}
                    className={`problem-item-detail${problem.id === selectedProblem.id ? ' selected' : ''} ${problem.difficulty.toLowerCase()}`}
                    onClick={() => handleProblemSelect(problem)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="problem-title-flex">
                      <div className="problem-title-group">
                        <span className="font-medium problem-title-detail">{problem.title}</span>
                      </div>
                      <div className="solved-problem-actions">
                        <span className={`difficulty-badge difficulty-${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : (
              problems.map(problem => (
                <div
                  key={problem.id}
                  id={`solvedProblemItem-${problem.id}`}
                  className={`problem-item-detail${problem.id === selectedProblem.id ? ' selected' : ''} ${problem.difficulty.toLowerCase()}`}
                  onClick={() => handleProblemSelect(problem)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="problem-title-flex">
                    <div className="problem-title-group">
                      <span className="font-medium problem-title-detail">{problem.title}</span>
                    </div>
                    <div className="solved-problem-actions">
                      <span className={`difficulty-badge difficulty-${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        {/* Solved Problem Code Panel */}
        <div className="code-panel" style={{ flex: 2, marginLeft: '2rem' }}>
          <div className="code-header">
            <h3 id="solvedDetailProblemTitle">{selectedProblem.title}</h3>
            <div className="action-buttons">
              <button
                className="action-btn"
                title="Open in LeetCode"
                onClick={() => window.open(selectedProblem.leetcode_link, '_blank')}
              >
                Open link in new tab
              </button>
              <SolvedToggleButton
                problem={selectedProblem}
                onToggle={onMarkAsUnsolved}
              />
            </div>
          </div>
          <div className="notes-panel">
            {/* Use the same ProblemDetail component as in ProblemDetailView */}
            <ProblemDetail 
              problem={selectedProblem} 
              onSelectProblem={handleProblemSelect}
              onNotesSaved={onNotesSaved}
              onSolutionSaved={onSolutionSaved}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SolvedDetailView; 