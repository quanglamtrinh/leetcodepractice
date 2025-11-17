import React from 'react';
import { Problem } from './ProblemList';

interface SolvedProblemsListProps {
  problems: Problem[];
  selectedProblem: Problem | null;
  onSelectProblem: (problem: Problem) => void;
}

const SolvedProblemsList: React.FC<SolvedProblemsListProps> = ({ problems, selectedProblem, onSelectProblem }) => {
  const safeProblems = Array.isArray(problems) ? problems : [];
  
  return (
    <>
      <div className="solved-problems-header">
        <h2>Solved Problems</h2>
        <div className="solved-stats">
          <span className="solved-count">{safeProblems.length} solved</span>
        </div>
      </div>
      <div className="problem-list solved-problems-list">
        {safeProblems.map(problem => (
          <div
            key={problem.id}
            className={`problem-item-detail solved-problem-item ${problem.difficulty.toLowerCase()}${selectedProblem && selectedProblem.id === problem.id ? ' selected' : ''}`}
            onClick={() => onSelectProblem(problem)}
            style={{ cursor: 'pointer' }}
            id={`solvedProblemItem-${problem.id}`}
          >
            <div className="problem-title-flex">
              <div className="problem-title-group">
                <span className="text-gray-800 font-medium problem-title-detail">{problem.title}</span>
              </div>
              <div className="solved-problem-actions">
                <span className={`difficulty-badge difficulty-${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
                <span className="concept-badge">{problem.concept}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default SolvedProblemsList; 