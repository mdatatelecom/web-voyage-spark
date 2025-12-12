import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AutocompleteDropdownProps {
  suggestions: string[];
  selectedIndex: number;
  inputValue: string;
  onSelect: (value: string) => void;
  visible: boolean;
}

export const AutocompleteDropdown = ({
  suggestions,
  selectedIndex,
  inputValue,
  onSelect,
  visible,
}: AutocompleteDropdownProps) => {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const selectedItem = listRef.current.children[selectedIndex] as HTMLElement;
      selectedItem?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!visible || suggestions.length === 0) return null;

  const highlightMatch = (suggestion: string) => {
    const matchIndex = suggestion.toLowerCase().indexOf(inputValue.toLowerCase());
    if (matchIndex === -1) return suggestion;

    const before = suggestion.slice(0, matchIndex);
    const match = suggestion.slice(matchIndex, matchIndex + inputValue.length);
    const after = suggestion.slice(matchIndex + inputValue.length);

    return (
      <>
        {before}
        <span className="text-green-400 font-semibold">{match}</span>
        {after}
      </>
    );
  };

  return (
    <ul
      ref={listRef}
      className="absolute bottom-full left-0 right-0 mb-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto z-50"
    >
      {suggestions.map((suggestion, index) => (
        <li
          key={suggestion}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect(suggestion);
          }}
          className={cn(
            'px-3 py-1.5 cursor-pointer font-mono text-sm transition-colors select-none',
            index === selectedIndex
              ? 'bg-green-600/30 text-green-300 border-l-2 border-green-400'
              : 'text-gray-300 hover:bg-gray-700 border-l-2 border-transparent'
          )}
        >
          {highlightMatch(suggestion)}
        </li>
      ))}
    </ul>
  );
};
