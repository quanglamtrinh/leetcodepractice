import React, { useState, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { aiService } from '../services/aiService';

interface AskAIProps {
  editor: Editor;
  selectedText: string;
  onClose: () => void;
}

interface AIService {
  name: string;
  icon: string;
  description: string;
  action: (text: string) => Promise<string>;
}

// AI Service implementations using the AI service
const aiServices: AIService[] = [
  {
    name: 'Improve Writing',
    icon: '✨',
    description: 'Enhance grammar, clarity, and style',
    action: async (text: string) => {
      const response = await aiService.processRequest({
        text,
        action: 'improve',
        context: 'writing improvement'
      });
      return response.result;
    }
  },
  {
    name: 'Summarize',
    icon: '📝',
    description: 'Create a concise summary',
    action: async (text: string) => {
      const response = await aiService.processRequest({
        text,
        action: 'summarize',
        context: 'text summarization'
      });
      return response.result;
    }
  },
  {
    name: 'Explain Code',
    icon: '💻',
    description: 'Explain code snippets and algorithms',
    action: async (text: string) => {
      const response = await aiService.processRequest({
        text,
        action: 'explain',
        context: 'code explanation'
      });
      return response.result;
    }
  },
  {
    name: 'Generate Ideas',
    icon: '💡',
    description: 'Brainstorm related concepts',
    action: async (text: string) => {
      const response = await aiService.processRequest({
        text,
        action: 'ideas',
        context: 'idea generation'
      });
      return response.result;
    }
  },
  {
    name: 'Fix Grammar',
    icon: '📖',
    description: 'Correct grammar and spelling',
    action: async (text: string) => {
      const response = await aiService.processRequest({
        text,
        action: 'grammar',
        context: 'grammar correction'
      });
      return response.result;
    }
  },
  {
    name: 'Translate',
    icon: '🌐',
    description: 'Translate to different languages',
    action: async (text: string) => {
      const response = await aiService.processRequest({
        text,
        action: 'translate',
        context: 'translation'
      });
      return response.result;
    }
  }
];

const AskAI: React.FC<AskAIProps> = ({ editor, selectedText, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<AIService | null>(null);

  const handleServiceSelect = useCallback(async (service: AIService) => {
    setSelectedService(service);
    setIsLoading(true);
    setResult(null);

    try {
      const aiResult = await service.action(selectedText);
      setResult(aiResult);
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedText]);

  const handleInsertResult = useCallback(() => {
    if (result && editor) {
      // Replace selected text with AI result
      const { from, to } = editor.state.selection;
      editor.chain().focus().deleteRange({ from, to }).insertContent(result).run();
      onClose();
    }
  }, [result, editor, onClose]);

  const handleInsertBelow = useCallback(() => {
    if (result && editor) {
      // Insert AI result below the selected text
      const { to } = editor.state.selection;
      editor.chain().focus().setTextSelection(to).insertContent('\n\n' + result).run();
      onClose();
    }
  }, [result, editor, onClose]);

  return (
    <div className="ask-ai-popup">
      <div className="ask-ai-overlay" onClick={onClose} />
      <div className="ask-ai-content">
        <div className="ask-ai-header">
          <div className="ask-ai-title">
            <span className="ask-ai-icon">✨</span>
            <h3>Ask AI</h3>
          </div>
          <button className="ask-ai-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="ask-ai-selected-text">
          <h4>Selected Text:</h4>
          <div className="selected-text-preview">
            {selectedText.length > 100 ? selectedText.substring(0, 100) + '...' : selectedText}
          </div>
        </div>

        {!selectedService && (
          <div className="ask-ai-services">
            <h4>What would you like to do?</h4>
            <div className="ai-services-grid">
              {aiServices.map((service, index) => (
                <button
                  key={index}
                  className="ai-service-button"
                  onClick={() => handleServiceSelect(service)}
                >
                  <span className="service-icon">{service.icon}</span>
                  <div className="service-content">
                    <div className="service-name">{service.name}</div>
                    <div className="service-description">{service.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedService && (
          <div className="ask-ai-processing">
            <div className="processing-header">
              <button className="back-button" onClick={() => setSelectedService(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15,18 9,12 15,6"></polyline>
                </svg>
              </button>
              <span>{selectedService.icon} {selectedService.name}</span>
            </div>

            {isLoading && (
              <div className="ai-loading">
                <div className="loading-spinner"></div>
                <p>AI is processing your request...</p>
              </div>
            )}

            {result && (
              <div className="ai-result">
                <h4>AI Result:</h4>
                <div className="result-content">
                  {result}
                </div>
                <div className="result-actions">
                  <button className="action-button primary" onClick={handleInsertResult}>
                    Replace Selected Text
                  </button>
                  <button className="action-button secondary" onClick={handleInsertBelow}>
                    Insert Below
                  </button>
                  <button className="action-button tertiary" onClick={() => setSelectedService(null)}>
                    Try Another
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AskAI;