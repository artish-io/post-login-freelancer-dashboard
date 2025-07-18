'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ProgressIndicator from '../../../../../../components/commissioner-dashboard/projects-and-invoices/post-a-gig/progress-indicator';
import SubcategorySelection from '../../../../../../components/commissioner-dashboard/projects-and-invoices/post-a-gig/subcategory-selection';
import { FormPersistence } from '../../../../../../utils/form-persistence';

export default function PostAGigStep2Page() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCategory = searchParams.get('category');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  // Load persisted form data on component mount
  useEffect(() => {
    const formData = FormPersistence.getMergedFormData(searchParams);
    if (formData.selectedSubcategory) {
      setSelectedSubcategory(formData.selectedSubcategory);
    }
  }, [searchParams]);

  // Redirect if not authenticated
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    router.push('/login-commissioner');
    return null;
  }

  const handleBack = () => {
    router.push('/commissioner-dashboard/projects-and-invoices/post-a-gig');
  };

  const handleNext = () => {
    if (selectedSubcategory) {
      // Save form data before navigation
      FormPersistence.saveStepData(2, {
        selectedCategory: selectedCategory || '',
        selectedSubcategory
      });
      // Navigate to step 3 with both category and subcategory
      router.push(`/commissioner-dashboard/projects-and-invoices/post-a-gig/step-3?category=${encodeURIComponent(selectedCategory || '')}&subcategory=${encodeURIComponent(selectedSubcategory)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Indicator */}
        <ProgressIndicator currentStep={2} totalSteps={5} />

        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            What type of {selectedCategory?.toLowerCase()} do you need?
          </h1>
          <p className="text-gray-600">
            Choose specification
          </p>
        </div>

        {/* Subcategory Selection */}
        <div className="mb-8">
          {selectedCategory && (
            <SubcategorySelection
              category={selectedCategory}
              selectedSubcategory={selectedSubcategory}
              onSubcategorySelect={setSelectedSubcategory}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={handleBack}
            className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            ← Back
          </button>

          <button
            onClick={handleNext}
            disabled={!selectedSubcategory}
            className={`px-8 py-3 rounded-xl font-medium transition-all duration-200 ${
              selectedSubcategory
                ? 'bg-black text-white hover:bg-gray-800'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
