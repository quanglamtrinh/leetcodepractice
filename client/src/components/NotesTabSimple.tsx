import React, { useState, useRef, useEffect } from 'react';
import { Code, Type, Hash, List, Quote, Minus } from 'lucide-react';
import { Problem } from './ProblemList';

interface NotesTabSimpleProps {
  problem: Problem;
  onNotesSaved?: (problemId: number, notes: string) => void;
}

const blockTypes = [
  { type: 'text', icon: Type, label: 'Text'},
  { type: 'code', icon: Code, label: 'Code' },
  { type: 'heading', icon: Hash, label: 'Heading' },
  { type: 'bullet', icon: List, label: 'Bullet List' },
  { type: 'quote', icon: Quote, label: 'Quote' },
  { type: 'divider', icon: Minus, label: 'Divider' }
];

type Block = {
  id: number;
  type: string;
  content: string;
};

const NotesTabSimple: React.FC<NotesTabSimpleProps> = ({ problem, onNotesSaved }) => {
  const [blocks, setBlocks] = useState<Block[]>([
    { id: 1, type: 'text', content: '' }
  ]);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filterText, setFilterText] = useState('');

  // Simple filtering function
  const getFilteredItems = () => {
    if (!filterText) return blockTypes;
    return blockTypes.filter(item => 
      item.label.toLowerCase().includes(filterText.toLowerCase()) ||
      item.type.toLowerCase().includes(filterText.toLowerCase())
    );
  };

  const handleInputChange = (blockId: number, value: string) => {
    // Show menu when typing /
    if (value === '/') {
      setShowMenu(true);
      setFilterText('');
      setSelectedIndex(0);
      return;
    }

    // Handle filtering when menu is open
    if (showMenu && value.startsWith('/')) {
      const newFilter = value.substring(1);
      setFilterText(newFilter);
      setSelectedIndex(0);
      return;
    }

    // Close menu if not starting with /
    if (showMenu && !value.startsWith('/')) {
      setShowMenu(false);
      setFilterText('');
      setSelectedIndex(0);
    }

    // Update block content
    setBlocks(prev => prev.map(block => 
      block.id === blockId ? { ...block, content: value } : block
    ));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, blockId: number) => {
    if (!showMenu) return;

    const filteredItems = getFilteredItems();

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        // Convert block to selected type
        setBlocks(prev => prev.map(block => 
          block.id === blockId 
            ? { ...block, type: filteredItems[selectedIndex].type, content: '' }
            : block
        ));
        setShowMenu(false);
        setFilterText('');
        setSelectedIndex(0);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowMenu(false);
      setFilterText('');
      setSelectedIndex(0);
    }
  };

  return (
    <div className="notes-editor p-4" style={{ background: '#fff', minHeight: 200 }}>
      <div className="text-sm text-gray-600 mb-4">
        Simple Notes Editor - Type "/" for commands, use arrow keys to navigate, Enter to select
      </div>
      
      {blocks.map(block => (
        <div key={block.id} className="relative mb-2">
          <textarea
            value={block.content}
            onChange={(e) => handleInputChange(block.id, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, block.id)}
            placeholder={`Type "/" for commands (${block.type} block)`}
            className="w-full p-2 border border-gray-300 rounded resize-none"
            style={{ minHeight: '40px' }}
          />
          
          {showMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 w-64">
              <div className="px-3 py-2 text-xs text-gray-500 border-b">
                BASIC BLOCKS
              </div>
              {getFilteredItems().map((item, index) => {
                const Icon = item.icon;
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={item.type}
                    className={`w-full flex items-center px-3 py-2 text-left ${
                      isSelected ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                    onClick={() => {
                      setBlocks(prev => prev.map(b => 
                        b.id === block.id ? { ...b, type: item.type, content: '' } : b
                      ));
                      setShowMenu(false);
                      setFilterText('');
                      setSelectedIndex(0);
                    }}
                  >
                    <Icon className={`w-4 h-4 mr-3 ${isSelected ? 'text-blue-500' : 'text-gray-500'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
      
      <div className="mt-4 text-xs text-gray-500">
        Current filter: "{filterText}" | Selected index: {selectedIndex} | Items: {getFilteredItems().length}
      </div>
    </div>
  );
};

export default NotesTabSimple;
