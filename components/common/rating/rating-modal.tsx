'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Stars from './stars';
import { ProjectRating, RatingSubmissionRequest, UserType } from '../../../types/ratings';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  projectTitle: string;
  subjectUserId: number;
  subjectUserType: UserType;
  subjectName: string;
  onRatingSubmitted?: (rating: ProjectRating) => void;
}

export default function RatingModal({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  subjectUserId,
  subjectUserType,
  subjectName,
  onRatingSubmitted
}: RatingModalProps) {
  const { data: session } = useSession();
  const [stars, setStars] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingRating, setExistingRating] = useState<ProjectRating | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if rating already exists when modal opens
  useEffect(() => {
    if (isOpen && session?.user?.id) {
      checkExistingRating();
    }
  }, [isOpen, session?.user?.id, projectId, subjectUserId, subjectUserType]);

  const checkExistingRating = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/ratings/exists?projectId=${projectId}&subjectUserId=${subjectUserId}&subjectUserType=${subjectUserType}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.exists && data.rating) {
          setExistingRating(data.rating);
          setStars(data.rating.stars);
          setComment(data.rating.comment || '');
        }
      }
    } catch (error) {
      console.error('Error checking existing rating:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!session?.user?.id || stars === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const requestBody: RatingSubmissionRequest = {
        projectId,
        subjectUserId,
        subjectUserType,
        stars: stars as 1 | 2 | 3 | 4 | 5,
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

      if (!response.ok) {
        if (data.error === 'ALREADY_RATED') {
          setError('You have already rated this project.');
        } else {
          setError(data.error || 'Failed to submit rating');
        }
        return;
      }

      // Success
      if (onRatingSubmitted) {
        onRatingSubmitted(data.saved);
      }
      
      // Show success and close modal
      onClose();
      
    } catch (error) {
      console.error('Error submitting rating:', error);
      setError('Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStars(0);
    setComment('');
    setError(null);
    setExistingRating(null);
    onClose();
  };

  if (!isOpen) return null;

  const isReadOnly = existingRating !== null;
  const showCommentField = stars <= 2 && stars > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {isReadOnly ? 'Your Rating' : `Rate ${subjectUserType}`}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="text-sm text-gray-500">Loading...</div>
          </div>
        ) : (
          <>
            {/* Project Info */}
            <div className="mb-6">
              <div className="text-sm text-gray-600 mb-1">Project: {projectTitle}</div>
              <div className="text-sm text-gray-600">{subjectUserType}: {subjectName}</div>
            </div>

            {/* Star Rating */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {isReadOnly ? 'Your rating:' : 'How would you rate this collaboration?'}
              </label>
              <div className="flex justify-center">
                <Stars
                  value={stars}
                  readOnly={isReadOnly}
                  onChange={setStars}
                  size="lg"
                />
              </div>
            </div>

            {/* Comment Field (for low ratings or existing comments) */}
            {(showCommentField || (isReadOnly && existingRating?.comment)) && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isReadOnly ? 'Your comment:' : 'Add context (optional)'}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  readOnly={isReadOnly}
                  placeholder={isReadOnly ? '' : 'Help others understand your rating...'}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none ${
                    isReadOnly ? 'bg-gray-50 text-gray-600' : ''
                  }`}
                  rows={3}
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm text-red-600">{error}</div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {isReadOnly ? 'Close' : 'Cancel'}
              </button>
              {!isReadOnly && (
                <button
                  onClick={handleSubmit}
                  disabled={stars === 0 || isSubmitting}
                  className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Rating'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
