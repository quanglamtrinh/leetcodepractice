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
          className="problem-item"
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
          <div className="problem-header">
            <div className={`difficulty-badge ${problem.difficulty.toLowerCase()}`}>
              {problem.difficulty}
            </div>
            <div className="problem-title">{problem.title}</div>
          </div>
          
          <div className="problem-details">
            <div className="problem-concept">{problem.concept}</div>
            {problem.solved_date && (
              <div className="problem-time">
                Solved: {new Date(problem.solved_date).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            )}
          </div>

          {/* Additional problem metadata */}
          <div className="problem-metadata">
            {problem.url && (
              <div className="problem-link">
                <span className="link-icon">🔗</span>
                <span className="link-text">LeetCode</span>
              </div>
            )}
            
            {problem.solved && (
              <div className="solved-indicator">
                <span className="solved-icon">✅</span>
                <span className="solved-text">Solved</span>
              </div>
            )}
          </div>

          {/* Hover indicator */}
          <div className="problem-hover-indicator">
            <span>Click to view details →</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProblemsList;