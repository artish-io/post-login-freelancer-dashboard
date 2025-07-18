'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ProgressIndicator from '../../../../../../components/commissioner-dashboard/projects-and-invoices/post-a-gig/progress-indicator';
import TimelinePaymentPlan from '../../../../../../components/commissioner-dashboard/projects-and-invoices/post-a-gig/timeline-payment-plan';
import { FormPersistence } from '../../../../../../utils/form-persistence';

type StartType = 'Immediately' | 'Custom';
type ExecutionMethod = 'completion' | 'milestone';

export default function PostAGigStep3Page() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCategory = searchParams.get('category');
  const selectedSubcategory = searchParams.get('subcategory');

  // State for timeline and payment plan
  const [startType, setStartType] = useState<StartType>('Immediately');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [executionMethod, setExecutionMethod] = useState<ExecutionMethod>('completion');
  const [lowerBudget, setLowerBudget] = useState('');
  const [upperBudget, setUpperBudget] = useState('');

  // Load persisted form data on component mount
  useEffect(() => {
    const formData = FormPersistence.getMergedFormData(searchParams);

    if (formData.startType) setStartType(formData.startType);
    if (formData.customStartDate) setCustomStartDate(new Date(formData.customStartDate));
    if (formData.endDate) setEndDate(new Date(formData.endDate));
    if (formData.executionMethod) setExecutionMethod(formData.executionMethod);
    if (formData.lowerBudget) setLowerBudget(formData.lowerBudget);
    if (formData.upperBudget) setUpperBudget(formData.upperBudget);
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
    router.push(`/commissioner-dashboard/projects-and-invoices/post-a-gig/step-2?category=${encodeURIComponent(selectedCategory || '')}`);
  };

  const handleNext = () => {
    if (isFormValid) {
      // Save form data before navigation
      FormPersistence.saveStepData(3, {
        selectedCategory: selectedCategory || '',
        selectedSubcategory: selectedSubcategory || '',
        startType,
        customStartDate: customStartDate?.toISOString(),
        endDate: endDate?.toISOString(),
        executionMethod,
        lowerBudget,
        upperBudget,
      });

      // Navigate to step 4 with all the data
      const params = new URLSearchParams({
        category: selectedCategory || '',
        subcategory: selectedSubcategory || '',
        startType,
        customStartDate: customStartDate?.toISOString() || '',
        endDate: endDate?.toISOString() || '',
        executionMethod,
        lowerBudget,
        upperBudget,
      });
      router.push(`/commissioner-dashboard/projects-and-invoices/post-a-gig/step-4?${params.toString()}`);
    }
  };

  // Form validation
  const isFormValid = endDate && lowerBudget && upperBudget &&
    Number(lowerBudget) > 0 && Number(upperBudget) > 0 &&
    Number(upperBudget) >= Number(lowerBudget);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Indicator */}
        <ProgressIndicator currentStep={3} totalSteps={5} />

        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create timeline and payment plan
          </h1>
          <p className="text-gray-600">
            Choose specification
          </p>
        </div>

        {/* Timeline and Payment Plan Form */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
          <TimelinePaymentPlan
            startType={startType}
            onStartTypeChange={setStartType}
            customStartDate={customStartDate}
            onCustomStartDateChange={setCustomStartDate}
            endDate={endDate}
            onEndDateChange={setEndDate}
            executionMethod={executionMethod}
            onExecutionMethodChange={setExecutionMethod}
            lowerBudget={lowerBudget}
            onLowerBudgetChange={setLowerBudget}
            upperBudget={upperBudget}
            onUpperBudgetChange={setUpperBudget}
          />
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
            disabled={!isFormValid}
            className={`px-8 py-3 rounded-xl font-medium transition-all duration-200 ${
              isFormValid
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
