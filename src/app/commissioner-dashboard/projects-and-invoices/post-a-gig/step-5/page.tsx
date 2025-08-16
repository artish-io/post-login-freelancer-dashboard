'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ProgressIndicator from '../../../../../../components/commissioner-dashboard/projects-and-invoices/post-a-gig/progress-indicator';
import OrganizationMetadataForm from '../../../../../../components/commissioner-dashboard/projects-and-invoices/post-a-gig/organization-metadata-form';
import { FormPersistence } from '../../../../../../utils/form-persistence';

type StartType = 'Immediately' | 'Custom';
type ExecutionMethod = 'completion' | 'milestone';

interface Organization {
  id?: number;
  name: string;
  email: string;
  logo: string;
  address: string;
  contactPersonId: number;
  website?: string;
  description?: string;
}

export default function PostAGigStep5Page() {
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
  const projectDescription = searchParams.get('projectDescription') || '';
  const skills = JSON.parse(searchParams.get('skills') || '[]');
  const tools = JSON.parse(searchParams.get('tools') || '[]');
  const milestones = JSON.parse(searchParams.get('milestones') || '[]');

  // Get project brief file from form persistence
  const [projectBriefFile, setProjectBriefFile] = useState<{name: string; size: number; type: string; lastModified: number} | null>(null);

  // Check if this is a targeted gig request to a specific freelancer
  const targetFreelancer = searchParams.get('targetFreelancer');
  const freelancerName = searchParams.get('freelancerName');
  const isTargetedRequest = targetFreelancer && freelancerName;

  // State for organization metadata
  const [organizationData, setOrganizationData] = useState<Organization>({
    name: '',
    email: '',
    logo: '',
    address: '',
    contactPersonId: 0,
    website: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load existing organization data and form data
  useEffect(() => {
    const loadData = async () => {
      if (!session?.user?.id) return;

      const commissionerId = parseInt(session.user.id);

      // Load persisted form data first
      const formData = FormPersistence.getMergedFormData(searchParams);

      // Load project brief file from form data
      if (formData.projectBriefFile) {
        setProjectBriefFile(formData.projectBriefFile);
      }

      // Check if cached organization data belongs to the current user
      if (formData.organizationData && formData.organizationData.contactPersonId === commissionerId) {
        setOrganizationData(formData.organizationData);
        return; // Use cached data if available and it belongs to current user
      } else if (formData.organizationData) {
        // Clear stale cache if it belongs to a different user
        FormPersistence.clearFormData();
      }

      // Load organization data using API based on commissionerId
      try {
        const response = await fetch(`/api/organizations?contactPersonId=${commissionerId}`);

        if (response.ok) {
          const orgData = await response.json();

          if (orgData && orgData.id) {
            const organizationData = {
              id: orgData.id,
              name: orgData.name || '',
              email: orgData.email || '',
              logo: orgData.logo || '',
              address: '', // Use address field for role/title as per form design, leave empty for user to fill
              contactPersonId: orgData.contactPersonId || orgData.firstCommissionerId || commissionerId,
              website: orgData.website || '',
              description: orgData.description || orgData.bio || '', // Support both description and bio fields
            };
            setOrganizationData(organizationData);
            // Save to form persistence for future use
            FormPersistence.saveStepData(5, { organizationData });
          } else {
            // Set default values with user info if no organization exists
            const defaultOrgData = {
              name: '',
              email: session.user.email || '',
              logo: '',
              address: '',
              contactPersonId: commissionerId,
              website: '',
              description: '',
            };
            setOrganizationData(defaultOrgData);
          }
        } else {
          // Set default values if API call fails
          const defaultOrgData = {
            name: '',
            email: session.user.email || '',
            logo: '',
            address: '',
            contactPersonId: commissionerId,
            website: '',
            description: '',
          };
          setOrganizationData(defaultOrgData);
        }
      } catch (error) {
        console.error('Error loading organization data:', error);
        // Set default values on error
        const defaultOrgData = {
          name: '',
          email: session.user.email || '',
          logo: '',
          address: '',
          contactPersonId: parseInt(session.user.id),
          website: '',
          description: '',
        };
        setOrganizationData(defaultOrgData);
      }
    };

    loadData();
  }, [session?.user?.id, session?.user?.email, searchParams]);

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
    router.push(`/commissioner-dashboard/projects-and-invoices/post-a-gig/step-4?${params.toString()}`);
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Create the gig data
      const gigData = {
        title: projectTitle || `${selectedSubcategory} Project`, // Use custom title or fallback to auto-generated
        category: selectedCategory,
        subcategory: selectedSubcategory,
        description: projectDescription,
        skills,
        tools,
        milestones,
        startType,
        customStartDate: customStartDate?.toISOString(),
        endDate: endDate?.toISOString(),
        executionMethod,
        lowerBudget: Number(lowerBudget),
        upperBudget: Number(upperBudget),
        organizationData,
        commissionerId: session.user.id,
        // Add targeted request fields
        isTargetedRequest,
        targetFreelancerId: targetFreelancer ? Number(targetFreelancer) : null,
        isPublic: !isTargetedRequest, // Private if targeted, public otherwise
        // Add project brief file if available
        ...(projectBriefFile && { briefFile: projectBriefFile }),
      };

      const response = await fetch('/api/gigs/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gigData),
      });

      if (response.ok) {
        const result = await response.json();
        const gigId = result.gigId;

        // If there's a project brief file, upload it after gig creation
        if (projectBriefFile && gigId) {
          try {
            // For now, we'll show a message that the file metadata was saved
            // In a full implementation, you'd need to store the actual File object
            console.log('Project brief file metadata saved:', projectBriefFile);

            // TODO: Implement actual file upload here when File object is available
            // const uploadFormData = new FormData();
            // uploadFormData.append('gigId', gigId.toString());
            // uploadFormData.append('file', actualFileObject);
            //
            // const uploadResponse = await fetch('/api/gigs/brief-upload', {
            //   method: 'POST',
            //   body: uploadFormData,
            // });

          } catch (uploadError) {
            console.error('Error uploading brief file:', uploadError);
            // Don't fail the entire gig creation for file upload issues
          }
        }

        // Success - clear form data and redirect
        FormPersistence.clearFormData();
        const successMessage = isTargetedRequest ? 'gig-request-sent' : 'gig-posted';
        router.push(`/commissioner-dashboard/projects-and-invoices?success=${successMessage}`);
      } else {
        const errorData = await response.json();
        setSubmitError(errorData.error || 'Failed to post gig');
      }
    } catch (error) {
      console.error('Error posting gig:', error);
      setSubmitError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form validation
  const isFormValid = organizationData.name.trim().length > 0 && 
    organizationData.email.trim().length > 0 && 
    organizationData.description && organizationData.description.trim().length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Indicator */}
        <ProgressIndicator currentStep={5} totalSteps={5} />

        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tell us about you and your company
          </h1>
          <p className="text-gray-600">
            {isTargetedRequest
              ? `Add a description about the organisation you're hiring for. This gig request will be sent privately to ${decodeURIComponent(freelancerName || '')}.`
              : 'Add a description about the organisation you\'re hiring for'
            }
          </p>
        </div>

        {/* Organization Metadata Form */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
          <OrganizationMetadataForm
            organizationData={organizationData}
            onOrganizationDataChange={setOrganizationData}
          />

          {submitError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 text-sm">{submitError}</p>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={handleBack}
            disabled={isSubmitting}
            className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors disabled:opacity-50"
          >
            ← Back
          </button>

          <button
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            className={`px-8 py-3 rounded-xl font-medium transition-all duration-200 ${
              isFormValid && !isSubmitting
                ? 'bg-black text-white hover:bg-gray-800'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {isTargetedRequest ? 'Sending Request...' : 'Posting Gig...'}
              </div>
            ) : (
              isTargetedRequest ? `Send Gig Request To ${decodeURIComponent(freelancerName || '')} →` : 'Post Gig →'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
