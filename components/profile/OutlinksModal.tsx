'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import PlatformDropdown, { detectPlatformFromUrl } from './PlatformDropdown';
import type { Outlink } from './PortfolioIcons';

interface OutlinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  outlinks: Outlink[];
  onSave: (outlinks: Outlink[]) => void;
}

interface OutlinkFormData {
  id: string;
  platform: string;
  url: string;
  label?: string;
  order: number;
}

function generateId(): string {
  return `ol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function OutlinksModal({ isOpen, onClose, outlinks, onSave }: OutlinksModalProps) {
  const [formData, setFormData] = useState<OutlinkFormData[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Initialize form data from existing outlinks
      const initialData = outlinks.length > 0 
        ? outlinks.map(link => ({ ...link }))
        : [{ id: generateId(), platform: '', url: '', order: 0 }];
      
      setFormData(initialData);
      setErrors({});
      
      // Focus first input after modal opens
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, outlinks]);

  // Handle escape key and focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleFocusTrap);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleFocusTrap);
    };
  }, [isOpen, onClose]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const urls = new Set<string>();

    formData.forEach((item, index) => {
      const prefix = `${index}`;
      
      if (!item.url.trim()) {
        newErrors[`${prefix}_url`] = 'URL is required';
      } else if (!isValidUrl(item.url)) {
        newErrors[`${prefix}_url`] = 'Please enter a valid URL';
      } else if (urls.has(item.url)) {
        newErrors[`${prefix}_url`] = 'Duplicate URL';
      } else {
        urls.add(item.url);
      }

      if (!item.platform) {
        newErrors[`${prefix}_platform`] = 'Platform is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUrlChange = (index: number, url: string) => {
    const newFormData = [...formData];
    newFormData[index].url = url;
    
    // Auto-detect platform if URL is valid and platform is not set
    if (url && !newFormData[index].platform) {
      const detectedPlatform = detectPlatformFromUrl(url);
      newFormData[index].platform = detectedPlatform;
    }
    
    setFormData(newFormData);
  };

  const handlePlatformChange = (index: number, platform: string) => {
    const newFormData = [...formData];
    newFormData[index].platform = platform;
    setFormData(newFormData);
  };

  const addOutlink = () => {
    if (formData.length < 3) {
      setFormData([...formData, {
        id: generateId(),
        platform: '',
        url: '',
        order: formData.length
      }]);
    }
  };

  const removeOutlink = (index: number) => {
    const newFormData = formData.filter((_, i) => i !== index);
    // Reorder remaining items
    newFormData.forEach((item, i) => {
      item.order = i;
    });
    setFormData(newFormData);
  };

  const moveOutlink = (index: number, direction: 'up' | 'down') => {
    const newFormData = [...formData];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newFormData.length) {
      [newFormData[index], newFormData[targetIndex]] = [newFormData[targetIndex], newFormData[index]];
      // Update order values
      newFormData.forEach((item, i) => {
        item.order = i;
      });
      setFormData(newFormData);
    }
  };

  const handleSave = () => {
    if (validateForm()) {
      const validOutlinks = formData.filter(item => item.url.trim() && item.platform);
      onSave(validOutlinks);
    }
  };

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        ref={modalRef}
        className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Portfolio Links</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Add up to 3 portfolio links to showcase your work. Links will appear as icons on your profile.
          </p>

          {formData.map((item, index) => (
            <div key={item.id} className="p-4 border border-gray-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Link {index + 1}</span>
                <div className="flex items-center gap-1">
                  {/* Move up/down buttons */}
                  <button
                    type="button"
                    onClick={() => moveOutlink(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveOutlink(index, 'down')}
                    disabled={index === formData.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removeOutlink(index)}
                    className="p-1 text-red-400 hover:text-red-600"
                    aria-label="Remove link"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Platform dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Platform
                  </label>
                  <PlatformDropdown
                    value={item.platform}
                    onChange={(platform) => handlePlatformChange(index, platform)}
                    aria-label={`Platform for link ${index + 1}`}
                  />
                  {errors[`${index}_platform`] && (
                    <p className="mt-1 text-xs text-red-600">{errors[`${index}_platform`]}</p>
                  )}
                </div>

                {/* URL input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL
                  </label>
                  <input
                    ref={index === 0 ? firstInputRef : undefined}
                    type="url"
                    value={item.url}
                    onChange={(e) => handleUrlChange(index, e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-[#eb1966] transition-colors"
                    aria-label={`URL for link ${index + 1}`}
                  />
                  {errors[`${index}_url`] && (
                    <p className="mt-1 text-xs text-red-600">{errors[`${index}_url`]}</p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Add link button */}
          {formData.length < 3 && (
            <button
              type="button"
              onClick={addOutlink}
              className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Link
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 bg-[#eb1966] text-white rounded-xl hover:bg-[#d91659] transition-colors"
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(modalContent, document.body);
}
