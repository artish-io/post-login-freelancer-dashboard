'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ProgressIndicator from '../../../../../../components/commissioner-dashboard/projects-and-invoices/post-a-gig/progress-indicator';
import ProjectBriefForm from '../../../../../../components/commissioner-dashboard/projects-and-invoices/post-a-gig/project-brief-form';
import { FormPersistence } from '../../../../../../utils/form-persistence';

type StartType = 'Immediately' | 'Custom';
type ExecutionMethod = 'completion' | 'milestone';

export default function PostAGigStep4Page() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get data from previous steps
  const selectedCategory = searchParams.get('category');
  const selectedSubcategory = searchParams.get('subcategory');
  const projectTitle = searchParams.get('projectTitle') || '';
  const startType = searchParams.get('startType') as StartType;
  const customStartDate = searchParams.get('customStartDate') ? new Date(searchParams.get('customStartDate')!) : null;
  const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : null;
  const executionMethod = searchParams.get('executionMethod') as ExecutionMethod;
  const lowerBudget = searchParams.get('lowerBudget') || '';
  const upperBudget = searchParams.get('upperBudget') || '';

  // State for project brief
  const [projectDescription, setProjectDescription] = useState('');
  const [projectBriefFile, setProjectBriefFile] = useState<File | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [tools, setTools] = useState<string[]>([]);
  const [milestones, setMilestones] = useState<Array<{
    id: string;
    title: string;
    description: string;
    startDate: Date | null;
    endDate: Date | null;
    amount?: number;
  }>>([]);

  // Load persisted form data on component mount
  useEffect(() => {
    const formData = FormPersistence.getMergedFormData(searchParams);

    if (formData.projectDescription) setProjectDescription(formData.projectDescription);
    if (formData.skills) setSkills(formData.skills);
    if (formData.tools) setTools(formData.tools);
    if (formData.milestones) {
      const restoredMilestones = formData.milestones.map(m => ({
        ...m,
        startDate: m.startDate ? new Date(m.startDate) : null,
        endDate: m.endDate ? new Date(m.endDate) : null,
      }));
      setMilestones(restoredMilestones);
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
    // Save current form data before navigating back
    const milestonesToSave = milestones.map(m => ({
      ...m,
      startDate: m.startDate?.toISOString() || null,
      endDate: m.endDate?.toISOString() || null,
    }));

    FormPersistence.saveStepData(4, {
      projectDescription,
      skills,
      tools,
      milestones: milestonesToSave,
    });

    const params = new URLSearchParams({
      category: selectedCategory || '',
      subcategory: selectedSubcategory || '',
      projectTitle,
      startType: startType || '',
      customStartDate: customStartDate?.toISOString() || '',
      endDate: endDate?.toISOString() || '',
      executionMethod: executionMethod || '',
      lowerBudget,
      upperBudget,
    });
    router.push(`/commissioner-dashboard/projects-and-invoices/post-a-gig/step-3?${params.toString()}`);
  };

  const handleNext = () => {
    if (isFormValid) {
      // Save form data before navigation
      const milestonesToSave = milestones.map(m => ({
        ...m,
        startDate: m.startDate?.toISOString() || null,
        endDate: m.endDate?.toISOString() || null,
      }));

      FormPersistence.saveStepData(4, {
        selectedCategory: selectedCategory || '',
        selectedSubcategory: selectedSubcategory || '',
        projectTitle,
        startType: startType || '',
        customStartDate: customStartDate?.toISOString(),
        endDate: endDate?.toISOString(),
        executionMethod: executionMethod || '',
        lowerBudget,
        upperBudget,
        projectDescription,
        skills,
        tools,
        milestones: milestonesToSave,
        // Save project brief file metadata (not the actual file)
        projectBriefFile: projectBriefFile ? {
          name: projectBriefFile.name,
          size: projectBriefFile.size,
          type: projectBriefFile.type,
          lastModified: projectBriefFile.lastModified
        } : null,
      });

      // Navigate to step 5 with all the data
      const params = new URLSearchParams({
        category: selectedCategory || '',
        subcategory: selectedSubcategory || '',
        projectTitle,
        startType: startType || '',
        customStartDate: customStartDate?.toISOString() || '',
        endDate: endDate?.toISOString() || '',
        executionMethod: executionMethod || '',
        lowerBudget,
        upperBudget,
        projectDescription,
        skills: JSON.stringify(skills),
        tools: JSON.stringify(tools),
        milestones: JSON.stringify(milestones),
      });
      router.push(`/commissioner-dashboard/projects-and-invoices/post-a-gig/step-5?${params.toString()}`);
    }
  };

  // Form validation
  const isFormValid = projectDescription.trim().length > 0 && 
    skills.length > 0 && 
    tools.length > 0 && 
    milestones.length > 0 &&
    milestones.every(m => m.title.trim().length > 0 && m.description.trim().length > 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Progress Indicator */}
        <ProgressIndicator currentStep={4} totalSteps={5} />

        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Describe Project Brief
          </h1>
          <p className="text-gray-600">
            Add a project description and deliverables for success
          </p>
        </div>

        {/* Project Brief Form */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
          <ProjectBriefForm
            projectDescription={projectDescription}
            onProjectDescriptionChange={setProjectDescription}
            projectBriefFile={projectBriefFile}
            onProjectBriefFileChange={setProjectBriefFile}
            skills={skills}
            onSkillsChange={setSkills}
            tools={tools}
            onToolsChange={setTools}
            milestones={milestones}
            onMilestonesChange={setMilestones}
            executionMethod={executionMethod}
            upperBudget={Number(upperBudget)}
            endDate={endDate}
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
