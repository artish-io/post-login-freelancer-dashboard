import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { differenceInWeeks } from 'date-fns';
import { logGigRequestSent } from '../../../../lib/events/event-logger';
import { saveGig, getNextGigId, type Gig } from '../../../../lib/gigs/hierarchical-storage';
import { getAllOrganizations, writeOrganization } from '@/lib/storage/unified-storage-service';

export async function POST(req: Request) {
  try {
    const gigData = await req.json();

    // Get next available gig ID
    const newGigId = await getNextGigId();

    // Read existing organizations
    const organizations = await getAllOrganizations();

    // Handle organization data
    let organizationId = gigData.organizationData.id;
    
    if (!organizationId) {
      // Check if organization exists for this contact person
      const existingOrg = organizations.find((org: any) => 
        org.contactPersonId === gigData.commissionerId
      );

      if (existingOrg) {
        // Update existing organization
        Object.assign(existingOrg, {
          ...gigData.organizationData,
          contactPersonId: gigData.commissionerId,
        });
        organizationId = existingOrg.id;
      } else {
        // Create new organization
        const newOrgId = Math.max(...organizations.map((org: any) => org.id), 0) + 1;
        const newOrganization = {
          id: newOrgId,
          ...gigData.organizationData,
          contactPersonId: gigData.commissionerId,
          firstCommissionerId: gigData.commissionerId,
          associatedCommissioners: [gigData.commissionerId],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Write new organization using hierarchical storage
        await writeOrganization(newOrganization);
        organizationId = newOrgId;
      }
    }

    // Calculate project duration and hourly rate
    const startDate = gigData.customStartDate ? new Date(gigData.customStartDate) : new Date();
    const endDate = new Date(gigData.endDate);
    const deliveryTimeWeeks = differenceInWeeks(endDate, startDate);
    const estimatedHours = deliveryTimeWeeks * 40; // Assuming 40 hours per week
    const hourlyRateMin = Math.round(gigData.lowerBudget / estimatedHours);
    const hourlyRateMax = Math.round(gigData.upperBudget / estimatedHours);

    // Create new gig
    const newGig: Gig = {
      id: newGigId,
      title: `${gigData.subcategory} - ${gigData.organizationData.name}`,
      organizationId,
      commissionerId: gigData.commissionerId,
      category: gigData.category,
      subcategory: gigData.subcategory,
      tags: gigData.skills,
      hourlyRateMin,
      hourlyRateMax,
      description: gigData.description,
      deliveryTimeWeeks,
      estimatedHours,
      status: 'Available',
      toolsRequired: gigData.tools,
      executionMethod: gigData.executionMethod,
      milestones: gigData.milestones,
      startType: gigData.startType,
      customStartDate: gigData.customStartDate,
      endDate: gigData.endDate,
      lowerBudget: gigData.lowerBudget,
      upperBudget: gigData.upperBudget,
      postedDate: new Date().toISOString().split('T')[0],
      notes: `Budget range: $${gigData.lowerBudget.toLocaleString()} - $${gigData.upperBudget.toLocaleString()}`,
      // Add targeted request fields
      isPublic: gigData.isPublic !== false, // Default to public unless explicitly set to false
      targetFreelancerId: gigData.targetFreelancerId || null,
      isTargetedRequest: gigData.isTargetedRequest || false,
    };

    // Save the gig using hierarchical storage
    await saveGig(newGig);

    // Log event for targeted gig requests
    if (gigData.isTargetedRequest && gigData.targetFreelancerId) {
      try {
        await logGigRequestSent(
          gigData.commissionerId,
          gigData.targetFreelancerId,
          newGigId,
          newGig.title,
          gigData.organizationData.name,
          organizationId
        );
      } catch (error) {
        console.error('Error logging gig request event:', error);
        // Don't fail the request if event logging fails
      }
    }

    const message = gigData.isTargetedRequest
      ? 'Gig request sent successfully'
      : 'Gig posted successfully';

    return NextResponse.json({
      success: true,
      gigId: newGigId,
      message,
      isTargetedRequest: gigData.isTargetedRequest
    });

  } catch (error) {
    console.error('Error posting gig:', error);
    return NextResponse.json({ 
      error: 'Failed to post gig. Please try again.' 
    }, { status: 500 });
  }
}
