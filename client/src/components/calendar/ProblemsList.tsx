import React from 'react';
import { Problem } from '../../types/calendar';
import './ProblemsList.css';

interface ProblemsListProps {
  problems: Problem[];
  onProblemClick: (problem: Problem) => void;
  className?: string;
}

const ProblemsList: React.FC<ProblemsListProps> = ({
  problems,
  onProblemClick,
  className = ''
}) => {
  // Sort problems by solved time (most recent first)
  const sortedProblems = [...problems].sort((a, b) => {
    if (!a.solved_date || !b.solved_date) return 0;
    return new Date(b.solved_date).getTime() - new Date(a.solved_date).getTime();
  });

  if (problems.length === 0) {
    return (
      <div className={`problems-list-empty ${className}`}>
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <p>No problems solved on this day</p>
          <small>Problems you solve will appear here</small>
        </div>
      </div>
    );
  }

  return (
    <div className={`problems-list ${className}`}>
      {sortedProblems.map((problem) => (
        <div
          key={problem.id}
          className={`problem-item-detail solved-problem-item ${problem.difficulty.toLowerCase()}`}
          onClick={() => onProblemClick(problem)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onProblemClick(problem);
            }
          }}
        >
          <div className="problem-title-flex">
            <div className="problem-title-group">
              <span className="text-gray-800 font-medium problem-title-detail">{problem.title}</span>
              {problem.solved_date && (
                <div className="problem-solve-time">
                  Solved: {new Date(problem.solved_date).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              )}
            </div>
            <div className="solved-problem-actions">
              <span className={`difficulty-badge difficulty-${problem.difficulty.toLowerCase()}`}>
                {problem.difficulty}
              </span>
              <span className="concept-badge">{problem.concept}</span>
              {problem.url && (
                <a 
                  href={problem.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="leetcode-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  🔗 LeetCode
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProblemsList;