'use client';

import { useState, useEffect } from 'react';
import { X, Star, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { RatingSubmissionRequest } from '../../types/ratings';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | number;
  projectTitle: string;
  subjectUserId: number;
  subjectUserType: 'freelancer' | 'commissioner';
  subjectUserName: string;
  onRatingSubmitted?: (rating: number) => void;
}

export default function RatingModal({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  subjectUserId,
  subjectUserType,
  subjectUserName,
  onRatingSubmitted
}: RatingModalProps) {
  const { data: session } = useSession();
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [checkingRating, setCheckingRating] = useState(false);

  // Check if rating already exists when modal opens
  useEffect(() => {
    if (isOpen && session?.user?.id) {
      const checkExistingRating = async () => {
        try {
          setCheckingRating(true);
          const response = await fetch(
            `/api/ratings/exists?projectId=${projectId}&subjectUserId=${subjectUserId}&subjectUserType=${subjectUserType}`
          );
          const data = await response.json();

          if (data.success && data.data.exists) {
            setAlreadyRated(true);
          } else {
            setAlreadyRated(false);
          }
        } catch (error) {
          console.error('Error checking existing rating:', error);
          setAlreadyRated(false);
        } finally {
          setCheckingRating(false);
        }
      };

      checkExistingRating();
    }
  }, [isOpen, projectId, subjectUserId, subjectUserType, session?.user?.id]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedRating(0);
      setHoveredRating(0);
      setComment('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const handleStarClick = (rating: number) => {
    setSelectedRating(rating);
    setError(null);
  };

  const handleStarHover = (rating: number) => {
    setHoveredRating(rating);
  };

  const handleStarLeave = () => {
    setHoveredRating(0);
  };

  const validateForm = (): string | null => {
    if (selectedRating === 0) {
      return 'Please select a rating';
    }

    if (selectedRating <= 2 && (!comment || comment.trim().length === 0)) {
      return 'Please provide a comment for ratings of 2 stars or below';
    }

    if (comment.length > 500) {
      return 'Comment must be 500 characters or less';
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const requestBody: RatingSubmissionRequest = {
        projectId,
        subjectUserId,
        subjectUserType,
        rating: selectedRating,
        comment: comment.trim() || undefined
      };

      const response = await fetch('/api/ratings/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        onRatingSubmitted?.(selectedRating);
        
        // Close modal after a brief success display
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(data.message || 'Failed to submit rating');
      }
    } catch (err) {
      console.error('Error submitting rating:', err);
      setError('Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayRating = hoveredRating || selectedRating;
  const requiresComment = selectedRating > 0 && selectedRating <= 2;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Rate {subjectUserType === 'freelancer' ? 'Freelancer' : 'Commissioner'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {checkingRating ? (
            /* Loading State */
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
              </div>
              <p className="text-gray-600">Checking rating status...</p>
            </div>
          ) : alreadyRated ? (
            /* Already Rated State */
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-blue-600 fill-current" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Already Rated</h3>
              <p className="text-gray-600">You have already rated this {subjectUserType} for this project.</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          ) : success ? (
            /* Success State */
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-green-600 fill-current" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Rating Submitted!</h3>
              <p className="text-gray-600">Thank you for your feedback.</p>
            </div>
          ) : (
            <>
              {/* Project Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-gray-900 mb-1">{projectTitle}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{subjectUserName}</span>
                </div>
              </div>

              {/* Star Rating */}
              <div className="text-center mb-6">
                <p className="text-sm text-gray-600 mb-3">How would you rate this {subjectUserType}?</p>
                <div className="flex justify-center gap-2 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleStarClick(star)}
                      onMouseEnter={() => handleStarHover(star)}
                      onMouseLeave={handleStarLeave}
                      className="p-1 transition-transform hover:scale-110"
                      disabled={isSubmitting}
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          star <= displayRating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {selectedRating > 0 && (
                  <p className="text-sm text-gray-500">
                    {selectedRating} star{selectedRating !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* Comment Section */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {requiresComment ? 'Please explain your rating' : 'Additional comments (optional)'}
                  {requiresComment && <span className="text-red-500 ml-1">*</span>}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={requiresComment 
                    ? "Help us understand what could be improved..." 
                    : "Share your experience working with this person..."
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eb1966] focus:border-transparent resize-none"
                  rows={4}
                  maxLength={500}
                  disabled={isSubmitting}
                />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-500">
                    {comment.length}/500 characters
                  </span>
                  {requiresComment && (
                    <span className="text-xs text-red-500">Required for low ratings</span>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || selectedRating === 0}
                  className="flex-1 px-4 py-2 bg-[#eb1966] text-white rounded-lg hover:bg-[#d1175a] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
