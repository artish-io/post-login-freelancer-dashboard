'use client';

import { useState, useEffect } from 'react';

export interface RateRange {
  rateMin: number;
  rateMax: number;
  rateUnit?: 'hour' | 'project' | 'day';
}

interface RateRangeEditorProps {
  rateRange?: RateRange;
  isEditMode: boolean;
  onUpdateRateRange: (rateRange: RateRange) => void;
  // Legacy support for old rate format
  legacyRate?: string;
  legacyMinRate?: number;
  legacyMaxRate?: number;
}

export default function RateRangeEditor({
  rateRange,
  isEditMode,
  onUpdateRateRange,
  legacyRate,
  legacyMinRate,
  legacyMaxRate
}: RateRangeEditorProps) {
  const [localMin, setLocalMin] = useState<string>('');
  const [localMax, setLocalMax] = useState<string>('');
  const [errors, setErrors] = useState<{ min?: string; max?: string }>({});

  // Initialize local state from props
  useEffect(() => {
    if (rateRange) {
      setLocalMin(rateRange.rateMin.toString());
      setLocalMax(rateRange.rateMax.toString());
    } else if (legacyMinRate && legacyMaxRate) {
      // Fallback to legacy rate data
      setLocalMin(legacyMinRate.toString());
      setLocalMax(legacyMaxRate.toString());
    } else {
      setLocalMin('');
      setLocalMax('');
    }
    setErrors({});
  }, [rateRange, legacyMinRate, legacyMaxRate, isEditMode]);

  const validateAndSave = () => {
    const newErrors: { min?: string; max?: string } = {};
    
    const minValue = parseInt(localMin, 10);
    const maxValue = parseInt(localMax, 10);

    // Validation
    if (!localMin.trim() || isNaN(minValue) || minValue <= 0) {
      newErrors.min = 'Enter a valid minimum rate';
    }
    
    if (!localMax.trim() || isNaN(maxValue) || maxValue <= 0) {
      newErrors.max = 'Enter a valid maximum rate';
    }
    
    if (!newErrors.min && !newErrors.max && minValue > maxValue) {
      newErrors.max = 'Maximum must be greater than or equal to minimum';
    }

    setErrors(newErrors);

    // If no errors, save the changes
    if (Object.keys(newErrors).length === 0) {
      onUpdateRateRange({
        rateMin: minValue,
        rateMax: maxValue,
        rateUnit: rateRange?.rateUnit || 'hour'
      });
    }
  };

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numeric input
    if (value === '' || /^\d+$/.test(value)) {
      setLocalMin(value);
      if (errors.min) {
        setErrors(prev => ({ ...prev, min: undefined }));
      }
    }
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numeric input
    if (value === '' || /^\d+$/.test(value)) {
      setLocalMax(value);
      if (errors.max) {
        setErrors(prev => ({ ...prev, max: undefined }));
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent non-numeric keys except backspace, delete, arrow keys, tab
    if (!/[\d]/.test(e.key) && 
        !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) {
      e.preventDefault();
    }
    
    if (e.key === 'Enter') {
      validateAndSave();
    }
  };

  const formatDisplayRate = () => {
    if (rateRange) {
      const unit = rateRange.rateUnit === 'hour' ? '/hr' :
                   rateRange.rateUnit === 'day' ? '/day' :
                   rateRange.rateUnit === 'project' ? '/project' : '/hr';

      return `$${rateRange.rateMin}–${rateRange.rateMax}${unit}`;
    } else if (legacyMinRate && legacyMaxRate) {
      return `$${legacyMinRate}–${legacyMaxRate}/hr`;
    } else if (legacyRate) {
      return legacyRate.startsWith('$') ? legacyRate : `$${legacyRate}`;
    }

    return 'No rate set';
  };

  if (!isEditMode) {
    // Display mode
    return (
      <div className="inline-flex items-center justify-center px-4 py-2 bg-white border border-black rounded-full text-sm text-gray-700 min-w-[120px]">
        {formatDisplayRate()}
      </div>
    );
  }

  // Edit mode
  return (
    <div className="space-y-2">
      <div className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-full text-sm min-w-[160px] focus-within:border-[#eb1966] transition-colors">
        <span className="text-gray-600">$</span>
        <input
          type="text"
          value={localMin}
          onChange={handleMinChange}
          onKeyDown={handleKeyDown}
          onBlur={validateAndSave}
          placeholder="80"
          className={`bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 w-12 text-center ${
            errors.min ? 'text-red-600' : ''
          }`}
          aria-label="Minimum hourly rate"
        />
        <span className="text-gray-600 font-medium">–</span>
        <input
          type="text"
          value={localMax}
          onChange={handleMaxChange}
          onKeyDown={handleKeyDown}
          onBlur={validateAndSave}
          placeholder="200"
          className={`bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 w-12 text-center ${
            errors.max ? 'text-red-600' : ''
          }`}
          aria-label="Maximum hourly rate"
        />
        <span className="text-gray-600">/hr</span>
      </div>
      
      {/* Error messages */}
      {(errors.min || errors.max) && (
        <div className="text-xs text-red-600 space-y-1">
          {errors.min && <div>{errors.min}</div>}
          {errors.max && <div>{errors.max}</div>}
        </div>
      )}
      
      {/* Helper text */}
      {!errors.min && !errors.max && (
        <div className="text-xs text-gray-500">
          Enter your hourly rate range
        </div>
      )}
    </div>
  );
}
