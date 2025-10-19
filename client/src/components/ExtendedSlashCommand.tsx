import React, { useState, useEffect, useRef } from 'react';
import { Code, Type, Hash, List, Quote, Minus, Image, Youtube, ListOrdered, CheckSquare } from 'lucide-react';

export interface BlockType {
  type: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  placeholder?: string;
  description?: string;
}

export const extendedBlockTypes: BlockType[] = [
  { 
    type: 'text', 
    icon: Type, 
    label: 'Text',
    description: 'Plain text paragraph'
  },
  { 
    type: 'code', 
    icon: Code, 
    label: 'Code', 
    placeholder: 'Write your code here...',
    description: 'Code block with syntax highlighting'
  },
  { 
    type: 'heading', 
    icon: Hash, 
    label: 'Heading', 
    placeholder: 'Heading',
    description: 'Large section heading'
  },
  { 
    type: 'bullet', 
    icon: List, 
    label: 'Bullet List', 
    placeholder: 'List item',
    description: 'Bulleted list item'
  },
  { 
    type: 'numbered', 
    icon: ListOrdered, 
    label: 'Numbered List', 
    placeholder: 'Numbered item',
    description: 'Numbered list item'
  },
  { 
    type: 'todo', 
    icon: CheckSquare, 
    label: 'To-do List', 
    placeholder: 'Todo item',
    description: 'Checkable todo item'
  },
  { 
    type: 'sub-bullet', 
    icon: List, 
    label: 'Sub Bullet', 
    placeholder: 'Sub item',
    description: 'Nested bullet point'
  },
  { 
    type: 'quote', 
    icon: Quote, 
    label: 'Quote', 
    placeholder: 'Quote',
    description: 'Quoted text block'
  },
  { 
    type: 'divider', 
    icon: Minus, 
    label: 'Divider', 
    placeholder: '',
    description: 'Horizontal divider line'
  },
  { 
    type: 'image-with-description', 
    icon: Image, 
    label: 'Image with Description', 
    placeholder: '',
    description: 'Upload an image and add a description below it'
  },
  { 
    type: 'youtube-with-description', 
    icon: Youtube, 
    label: 'YouTube with Description', 
    placeholder: '',
    description: 'Embed a YouTube video with description text'
  }
];

interface ExtendedSlashCommandProps {
  show: boolean;
  blockId: number | null;
  x?: number;
  y?: number;
  currentContent?: string;
  onSelectCommand: (blockId: number, commandType: string) => void;
  onClose: () => void;
  menuRef?: React.RefObject<HTMLDivElement>;
}

const ExtendedSlashCommand: React.FC<ExtendedSlashCommandProps> = ({
  show,
  blockId,
  x,
  y,
  currentContent = '',
  onSelectCommand,
  onClose,
  menuRef
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset selected index when filtered commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [currentContent]);

  // Focus the menu when it opens
  useEffect(() => {
    if (show && containerRef.current) {
      containerRef.current.focus();
    }
  }, [show]);

  if (!show || !blockId) return null;

  // Filter commands based on current input
  const filteredCommands = extendedBlockTypes.filter(option => {
    if (!currentContent.startsWith('/')) return true;
    const searchTerm = currentContent.toLowerCase().replace('/', '');
    return option.type.toLowerCase().includes(searchTerm) || 
           option.label.toLowerCase().includes(searchTerm);
  });

  const handleCommandSelect = (commandType: string) => {
    onSelectCommand(blockId, commandType);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          handleCommandSelect(filteredCommands[selectedIndex].type);
        }
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className="z-10 bg-white border border-gray-200 rounded-lg shadow-lg py-2 w-64 focus:outline-none"
      style={{
        position: 'absolute',
        left: x ? `${x}px` : '0px',
        top: y ? `${y}px` : 'calc(100% + 8px)',
      }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
        BASIC BLOCKS
        {currentContent.startsWith('/') && currentContent.length > 1 && (
          <span> - Filtering by "{currentContent}"</span>
        )}
      </div>
      
      {/* Basic blocks */}
      {filteredCommands
        .filter(cmd => !['image-with-description', 'youtube-with-description'].includes(cmd.type))
        .map((option, index) => (
          <MenuOption
            key={option.type}
            option={option}
            isSelected={index === selectedIndex}
            onClick={() => handleCommandSelect(option.type)}
          />
        ))}
      
      {/* Media blocks section */}
      {filteredCommands.some(cmd => ['image-with-description', 'youtube-with-description'].includes(cmd.type)) && (
        <>
          <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100 mt-2">
            MEDIA BLOCKS
          </div>
          {filteredCommands
            .filter(cmd => ['image-with-description', 'youtube-with-description'].includes(cmd.type))
            .map((option, index) => {
              const basicBlocksCount = filteredCommands.filter(cmd => 
                !['image-with-description', 'youtube-with-description'].includes(cmd.type)
              ).length;
              const adjustedIndex = basicBlocksCount + index;
              return (
                <MenuOption
                  key={option.type}
                  option={option}
                  isSelected={adjustedIndex === selectedIndex}
                  onClick={() => handleCommandSelect(option.type)}
                />
              );
            })}
        </>
      )}
    </div>
  );
};

interface MenuOptionProps {
  option: BlockType;
  isSelected: boolean;
  onClick: () => void;
}

const MenuOption: React.FC<MenuOptionProps> = ({ option, isSelected, onClick }) => {
  const Icon = option.icon;
  
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={`w-full flex items-start px-3 py-2 text-left rounded transition-colors ${
        isSelected 
          ? 'bg-blue-100 text-blue-900' 
          : 'hover:bg-gray-100 text-gray-700'
      }`}
    >
      <Icon className={`w-4 h-4 mr-3 mt-0.5 flex-shrink-0 ${
        isSelected ? 'text-blue-600' : 'text-gray-500'
      }`} />
      <div className="flex-1 min-w-0">
        <div className="font-medium">{option.label}</div>
        {option.description && (
          <div className={`text-xs mt-0.5 ${
            isSelected ? 'text-blue-700' : 'text-gray-500'
          }`}>{option.description}</div>
        )}
      </div>
    </button>
  );
};

export default ExtendedSlashCommand;