import React, { useState } from 'react';
import { Problem } from './ProblemList';
import NovelNotesTab from './NovelNotesTab';
import SolutionTab from './SolutionTab';
import ReviewHistoryTab from './ReviewHistoryTab';
import AddProblemsTab from './SimilarProblemsTab';

interface ProblemDetailProps {
  problem: Problem;
  onNotesSaved?: (problemId: number, notes: string) => void;
  onSolutionSaved?: (problemId: number, solution: string) => void;
  onSelectProblem?: (problem: Problem) => void;
}

const ProblemDetail: React.FC<ProblemDetailProps> = ({ problem, onNotesSaved, onSolutionSaved, onSelectProblem }) => {
  const [activeTab, setActiveTab] = useState<'notes' | 'solution' | 'review' | 'similar'>('notes');

  return (
    <div className="notes-panel">
      <div className="notes-tabs">
        <button
          className={`tab-btn${activeTab === 'notes' ? ' active' : ''}`}
          data-tab="notes"
          onClick={() => setActiveTab('notes')}
        >📝 Notes</button>
        <button
          className={`tab-btn${activeTab === 'solution' ? ' active' : ''}`}
          data-tab="solution"
          onClick={() => setActiveTab('solution')}
        >💻 Solution</button>
        <button
          className={`tab-btn${activeTab === 'review' ? ' active' : ''}`}
          data-tab="history"
          onClick={() => setActiveTab('review')}
        >📊 Review History</button>
        <button
          className={`tab-btn${activeTab === 'similar' ? ' active' : ''}`}
          data-tab="similar"
          onClick={() => setActiveTab('similar')}
        >Similar Problems</button>
      </div>
      {/* Notes Tab */}
      <div className={`tab-content${activeTab === 'notes' ? ' active' : ''}`} id="notes-tab">
        <NovelNotesTab problem={problem} onNotesSaved={onNotesSaved} />
      </div>
      {/* Solution Tab */}
      <div className={`tab-content${activeTab === 'solution' ? ' active' : ''}`} id="solution-tab">
        <SolutionTab problem={problem} onSolutionSaved={onSolutionSaved} />
      </div>
      {/* Review History Tab */}
      <div className={`tab-content${activeTab === 'review' ? ' active' : ''}`} id="history-tab">
        <ReviewHistoryTab
          problemId={problem.id}
          problemTitle={problem.title}
          problemDifficulty={problem.difficulty}
          problemConcept={problem.concept}
        />
      </div>
      {/* Add Problems Tab */}
      <div className={`tab-content${activeTab === 'similar' ? ' active' : ''}`} id="similar-tab">
        <AddProblemsTab problem={problem} onSelectProblem={onSelectProblem} />
      </div>
    </div>
  );
};

export default ProblemDetail; 