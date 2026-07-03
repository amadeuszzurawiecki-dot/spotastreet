import { useState, useRef, useEffect } from 'react';
import { fuzzySearchStreets, normalizeStreetName } from '../utils/streets';
import './StreetAutocomplete.css';

/**
 * Autocomplete input for street name guessing
 */
function StreetAutocomplete({ streetNames, onSubmit, disabled, requireValidSelection = true }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (query.length > 0 && !disabled) {
      const results = fuzzySearchStreets(query, streetNames);
      setSuggestions(results);
      setIsOpen(results.length > 0);
      setSelectedIndex(-1);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [query, streetNames, disabled]);

  // Focus input on mount
  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  const handleSelect = (name) => {
    setQuery(name);
    setIsOpen(false);
    setSuggestions([]);
  };

  const findMatchingStreet = (q) => {
    if (!q) return null;
    const cleanQ = normalizeStreetName(q);
    
    return streetNames.find(name => {
      return normalizeStreetName(name) === cleanQ;
    });
  };

  const matchedStreet = findMatchingStreet(query);
  const trimmedQuery = query.trim();
  const isSubmittable = requireValidSelection ? !!matchedStreet : trimmedQuery.length > 0;

  const handleSubmit = () => {
    const matched = findMatchingStreet(query);
    const submittedValue = matched || trimmedQuery;
    if (submittedValue && (!requireValidSelection || matched)) {
      onSubmit(submittedValue, matched);
      setQuery('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSelect(suggestions[selectedIndex]);
      } else {
        handleSubmit();
      }
    }
  };

  // Highlight matching characters
  const highlightMatch = (name) => {
    const normalizedQuery = query.toLowerCase();
    const normalizedName = name.toLowerCase();
    const startIndex = normalizedName.indexOf(normalizedQuery);
    
    if (startIndex === -1) return name;
    
    return (
      <>
        {name.slice(0, startIndex)}
        <mark className="autocomplete__highlight">{name.slice(startIndex, startIndex + query.length)}</mark>
        {name.slice(startIndex + query.length)}
      </>
    );
  };



  return (
    <div 
      className="autocomplete"
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      {/* Suggestions dropdown */}
      {isOpen && (
        <div className="autocomplete__dropdown glass-card">
          {suggestions.map((name, i) => (
            <button
              key={name}
              className={`autocomplete__option ${i === selectedIndex ? 'autocomplete__option--selected' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(name);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(name);
              }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              {highlightMatch(name)}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="autocomplete__input-row">
        <div className="autocomplete__input-wrapper glass-card">
          <input
            ref={inputRef}
            type="text"
            className="autocomplete__input"
            placeholder="Wpisz nazwę ulicy..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck="false"
          />
        </div>
        <button
          className="autocomplete__submit"
          onClick={handleSubmit}
          disabled={disabled || !isSubmittable}
        >
          Sprawdź
        </button>
      </div>
    </div>
  );
}

export default StreetAutocomplete;
