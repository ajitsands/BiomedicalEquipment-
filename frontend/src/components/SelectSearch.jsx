import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

export default function SelectSearch({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option...',
  labelKey = 'label',
  valueKey = 'value',
  subLabelKey = null,
  disabled = false,
  hasError = false,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const selectedOption = options.find(opt => String(opt[valueKey]) === String(value));

  const filteredOptions = options.filter(opt => {
    const combined = `${opt[labelKey] || ''} ${subLabelKey && opt[subLabelKey] ? opt[subLabelKey] : ''} ${opt.searchKeywords || ''}`.toLowerCase();
    const words = searchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return true;
    return words.every(w => combined.includes(w));
  });

  const handleSelect = (opt) => {
    onChange(opt[valueKey], opt);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('', null);
  };

  return (
    <div className={`select2-container ${className}`} ref={containerRef}>
      <div 
        className={`select2-trigger ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''} ${hasError ? 'has-error' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span style={{ color: selectedOption ? 'inherit' : 'var(--text-muted)' }}>
          {selectedOption ? selectedOption[labelKey] : placeholder}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {selectedOption && !disabled && (
            <X 
              size={15} 
              style={{ color: 'var(--text-muted)' }} 
              onClick={handleClear} 
            />
          )}
          <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>

      {isOpen && (
        <div className="select2-dropdown">
          <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-subtle)' }}>
            <Search size={15} style={{ color: 'var(--text-muted)' }} />
            <input
              ref={searchInputRef}
              type="text"
              className="select2-search-input"
              placeholder="Search / filter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', padding: '4px 0', width: '100%', fontSize: '0.86rem' }}
            />
          </div>

          <ul className="select2-options-list">
            {filteredOptions.length === 0 ? (
              <li style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                No matches found
              </li>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt[valueKey]) === String(value);
                return (
                  <li
                    key={opt[valueKey]}
                    className={`select2-option-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(opt)}
                  >
                    <div>
                      <div style={{ fontWeight: isSelected ? '600' : '400' }}>
                        {opt[labelKey]}
                      </div>
                      {subLabelKey && opt[subLabelKey] && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          {opt[subLabelKey]}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check size={16} style={{ color: 'var(--color-primary)' }} />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
