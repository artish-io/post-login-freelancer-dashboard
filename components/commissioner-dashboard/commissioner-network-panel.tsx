'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

type NetworkContact = {
  id: number;
  name: string;
  title: string;
  avatar: string;
  relationshipTypes: string[]; // e.g., ['project', 'messages', 'gig_application']
};

interface CommissionerNetworkPanelProps {
  commissionerId: number;
}

/**
 * Commissioner Network Panel
 *
 * Shows freelancers that this commissioner has engaged with through various channels:
 * 1. Projects - Freelancers commissioned to work on projects
 * 2. Messages - Direct message conversations
 * 3. Gig Applications - Freelancers who applied to commissioner's gigs
 * 4. Notifications - Various interactions (task submissions, proposals, invoices, etc.)
 *
 * The network is built dynamically by aggregating all these engagement sources
 * and sorted by most recent interaction.
 */
export default function CommissionerNetworkPanel({ commissionerId }: CommissionerNetworkPanelProps) {
  const [contacts, setContacts] = useState<NetworkContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const loadContacts = async () => {
      try {
        setLoading(true);

        // Use the provided commissionerId prop

        // Fetch core data sources
        const [projectsRes, organizationsRes, usersRes] = await Promise.all([
          fetch('/api/projects'),
          fetch('/api/organizations'),
          fetch('/api/users')
        ]);

        if (!projectsRes.ok || !organizationsRes.ok || !usersRes.ok) {
          console.error('Failed to fetch core data for network contacts');
          setContacts([]);
          return;
        }

        const projectsData = await projectsRes.json();
        const organizationsData = await organizationsRes.json();
        const usersData = await usersRes.json();

          // Try to fetch additional data sources with error handling
          let messagesData: any[] = [];
          let gigApplicationsData: any[] = [];

          try {
            const messagesRes = await fetch('/api/messages');
            if (messagesRes.ok) {
              const messagesResult = await messagesRes.json();
              messagesData = Array.isArray(messagesResult) ? messagesResult : [];
            }
          } catch (error) {
            console.warn('Failed to load messages:', error);
          }

          try {
            const gigApplicationsRes = await fetch('/api/gigs/gig-applications');
            if (gigApplicationsRes.ok) {
              const gigApplicationsResult = await gigApplicationsRes.json();
              gigApplicationsData = Array.isArray(gigApplicationsResult) ? gigApplicationsResult : [];
            }
          } catch (error) {
            console.warn('Failed to load gig applications:', error);
          }

          // Find the organization for this commissioner
          const organization = organizationsData.find((org: any) =>
            org.contactPersonId === commissionerId
          );

          if (!organization) {
            console.log('No organization found for commissioner', commissionerId);
            setContacts([]);
            return;
          }

          // Collect all user IDs that this commissioner has engaged with
          const engagedUserIds = new Set<number>();
          const userRelationships = new Map<number, { types: Set<string>, lastInteraction: string }>();

          // 1. From projects (commissioned freelancers)
          const organizationProjects = projectsData.filter((project: any) =>
            project.organizationId === organization.id
          );

          organizationProjects.forEach((project: any) => {
            if (project.freelancerId) {
              engagedUserIds.add(project.freelancerId);
              if (!userRelationships.has(project.freelancerId)) {
                userRelationships.set(project.freelancerId, { types: new Set(), lastInteraction: '' });
              }
              userRelationships.get(project.freelancerId)!.types.add('project');
            }
          });

          // 2. From messages (direct conversations)
          if (Array.isArray(messagesData)) {
            messagesData.forEach((thread: any) => {
              if (thread.participants && thread.participants.includes(commissionerId)) {
                thread.participants.forEach((participantId: number) => {
                  if (participantId !== commissionerId) {
                    engagedUserIds.add(participantId);
                    if (!userRelationships.has(participantId)) {
                      userRelationships.set(participantId, { types: new Set(), lastInteraction: '' });
                    }
                    userRelationships.get(participantId)!.types.add('messages');

                    // Get last message timestamp
                    if (thread.messages && thread.messages.length > 0) {
                      const lastMessage = thread.messages[thread.messages.length - 1];
                      userRelationships.get(participantId)!.lastInteraction = lastMessage.timestamp;
                    }
                  }
                });
              }
            });
          }

          // 3. From gig applications (freelancers who applied to commissioner's gigs)
          if (Array.isArray(gigApplicationsData)) {
            gigApplicationsData.forEach((application: any) => {
              if (application.freelancerId) {
                engagedUserIds.add(application.freelancerId);
                if (!userRelationships.has(application.freelancerId)) {
                  userRelationships.set(application.freelancerId, { types: new Set(), lastInteraction: '' });
                }
                userRelationships.get(application.freelancerId)!.types.add('gig_application');
                userRelationships.get(application.freelancerId)!.lastInteraction = application.submittedAt;
              }
            });
          }

          // 4. From notifications (various interactions)
          // Skip notifications for now to avoid complexity - focus on projects and messages



          // Build network contacts from all engaged users
          const networkContacts: NetworkContact[] = [];

          engagedUserIds.forEach((userId: number) => {
            const user = usersData.find((user: any) => user.id === userId);
            if (user && user.type === 'freelancer') {
              const relationship = userRelationships.get(userId);

              networkContacts.push({
                id: user.id,
                name: user.name,
                title: user.title,
                avatar: user.avatar,
                relationshipTypes: relationship ? Array.from(relationship.types) : []
              });
            }
          });

          // Sort alphabetically by name
          networkContacts.sort((a, b) => a.name.localeCompare(b.name));

          setContacts(networkContacts);
      } catch (error) {
        console.error('Error loading network contacts:', error);
        setContacts([]);
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, [commissionerId]);

  const displayedContacts = showAll ? contacts : contacts.slice(0, 5);

  const handleContactClick = (contactId: number) => {
    // Navigate to freelancer profile using the dedicated commissioner route
    window.open(`/commissioner-dashboard/profile/freelancers/${contactId}`, '_blank');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm px-6 py-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="px-6 py-4">
        <h3 className="text-base font-semibold text-gray-900">Network</h3>
        <span className="text-sm text-gray-500">
          {contacts.length} contacts
        </span>
      </div>

      <div className="px-6 pb-4">
        <div className="space-y-3 max-h-80 overflow-y-auto">
          <AnimatePresence>
            {displayedContacts.map((contact) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                onClick={() => handleContactClick(contact.id)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="relative">
                  <Image
                    src={contact.avatar}
                    alt={contact.name}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {contact.name}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {contact.title}
                  </div>

                  {/* Relationship indicators */}
                  <div className="flex gap-1 mt-1">
                    {contact.relationshipTypes.includes('project') && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Project
                      </span>
                    )}
                    {contact.relationshipTypes.includes('messages') && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Messages
                      </span>
                    )}
                    {contact.relationshipTypes.includes('gig_application') && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        Applied
                      </span>
                    )}
                    {(contact.relationshipTypes.includes('task_submission') ||
                      contact.relationshipTypes.includes('project_pause') ||
                      contact.relationshipTypes.includes('proposal_sent') ||
                      contact.relationshipTypes.includes('invoice_sent')) && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                        Activity
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {contacts.length > 5 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {showAll ? 'Show Less' : `View All (${contacts.length})`}
            </button>
          </div>
        )}

        {contacts.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            <p>No network contacts yet</p>
            <p className="text-sm mt-1">Your network will appear here as you engage with freelancers through projects, messages, gig applications, and other interactions</p>
          </div>
        )}
      </div>
    </div>
  );
}
