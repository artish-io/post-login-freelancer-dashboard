'use client';

import { useEffect, useRef, useState } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  createdAt: string;
  deleted?: boolean;
}

export interface AiChatThreadProps {
  prompt: string;
  userType: 'freelancer' | 'commissioner';
  onAddMessage?: (message: ChatMessage) => void;
}

// Create a simple event system for component communication
export const chatEvents = {
  addMessage: (message: ChatMessage) => {
    window.dispatchEvent(new CustomEvent('addChatMessage', { detail: message }));
  }
};

// Utility to validate content is user-safe
function isValidContent(str: string): boolean {
  if (!str || typeof str !== 'string') return false;

  // Check for JSON-like content
  if (str.startsWith('{') || str.startsWith('[')) return false;

  // Check for API debug keys
  if (str.includes('opportunities_results') ||
      str.includes('freelancer_selection') ||
      str.includes('step:') ||
      str.includes('"message"') ||
      str.includes('"result"')) return false;

  // Check for overly long responses (likely raw data)
  if (str.length > 1000) return false;

  return true;
}

// Dynamic gig category matching removed - now handled by API

// Match organizations based on project type and tags
async function matchOrganizations(projectType: string): Promise<any[]> {
  try {
    const [orgsResponse, gigsResponse] = await Promise.all([
      fetch('/data/organizations.json'),
      fetch('/data/gigs/gigs.json')
    ]);

    const organizations = await orgsResponse.json();
    const gigs = await gigsResponse.json();

    // Find organizations that have posted similar gigs
    const relevantOrgIds = new Set();
    gigs.forEach((gig: any) => {
      if (gig.category?.toLowerCase().includes(projectType.toLowerCase()) ||
          gig.tags?.some((tag: string) => tag.toLowerCase().includes(projectType.toLowerCase()))) {
        relevantOrgIds.add(gig.organizationId);
      }
    });

    // Return matching organizations with mock tags for demo
    const matchedOrgs = organizations
      .filter((org: any) => relevantOrgIds.has(org.id))
      .slice(0, 3)
      .map((org: any) => ({
        ...org,
        tags: ['Design', 'Tech'] // Mock tags - in real app would come from data
      }));

    // If no matches, return first 3 organizations
    if (matchedOrgs.length === 0) {
      return organizations.slice(0, 3).map((org: any) => ({
        ...org,
        tags: ['Design', 'Tech']
      }));
    }

    return matchedOrgs;
  } catch (error) {
    console.error('Failed to match organizations:', error);
    return [];
  }
}

// Generate proposal draft based on project type and organization
async function generateProposalDraft(projectType: string, organization: any): Promise<any> {
  try {
    // Get category info for better estimates
    const categoriesResponse = await fetch('/data/gigs/gig-categories.json');
    const categories = await categoriesResponse.json();

    // Find matching category for pricing estimates
    let matchedCategory = null;
    for (const cat of categories) {
      if (cat.label.toLowerCase().includes(projectType.toLowerCase())) {
        matchedCategory = cat;
        break;
      }
      for (const sub of cat.subcategories || []) {
        if (sub.name.toLowerCase().includes(projectType.toLowerCase())) {
          matchedCategory = cat;
          break;
        }
      }
      if (matchedCategory) break;
    }

    // Generate realistic estimates based on project type
    const baseAmount = Math.floor(Math.random() * 4000) + 2000; // $2000-$6000
    const isComplexProject = projectType.toLowerCase().includes('app') ||
                            projectType.toLowerCase().includes('web') ||
                            projectType.toLowerCase().includes('system');

    const milestoneCount = isComplexProject ? Math.floor(Math.random() * 3) + 4 : 3; // 3-6 milestones
    const invoicingModel = milestoneCount > 3 ? 'milestone' : 'completion';
    const duration = isComplexProject ? Math.floor(Math.random() * 6) + 6 : Math.floor(Math.random() * 4) + 3; // 3-12 weeks

    // Generate milestones
    const milestoneAmount = Math.floor(baseAmount / milestoneCount);
    const milestones = Array.from({ length: milestoneCount }, (_, i) => ({
      title: `${projectType} Milestone ${i + 1}`,
      amount: i === milestoneCount - 1 ? baseAmount - (milestoneAmount * (milestoneCount - 1)) : milestoneAmount,
      description: `Phase ${i + 1} deliverables for ${projectType.toLowerCase()} project`
    }));

    return {
      projectTitle: `${projectType} Project for ${organization.name}`,
      organizationId: organization.id,
      commissionerId: organization.contactPersonId,
      projectType: matchedCategory?.label || 'Custom',
      invoicingModel,
      projectAmount: baseAmount,
      summary: `A comprehensive ${projectType.toLowerCase()} solution tailored to ${organization.name}'s specific needs and brand requirements. This project will deliver high-quality results that align with your business objectives and user expectations.`,
      milestones,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + duration * 7 * 24 * 60 * 60 * 1000).toISOString(),
      duration: `${duration} weeks`
    };
  } catch (error) {
    console.error('Failed to generate proposal draft:', error);
    return null;
  }
}

// Smart intent classification for local overrides
function classifyIntent(prompt: string, previousMessages: ChatMessage[] = []): string {
  const lowerPrompt = prompt.toLowerCase().trim();

  // Gratitude
  if (lowerPrompt.includes('thank') || lowerPrompt.includes('thanks')) {
    return 'gratitude';
  }

  // Greetings
  if (lowerPrompt.match(/^(hi|hello|hey|good morning|good afternoon)/)) {
    return 'greeting';
  }

  // Intent routing - Invoice
  if (lowerPrompt.includes('invoice') || lowerPrompt.includes('send bill') ||
      lowerPrompt.includes('client payment') || lowerPrompt.includes('billing')) {
    return 'invoice_intent';
  }

  // Intent routing - Product upload
  if (lowerPrompt.includes('upload product') || lowerPrompt.includes('sell template') ||
      lowerPrompt.includes('sell course') || lowerPrompt.includes('list product')) {
    return 'product_intent';
  }

  // Gig posting
  if (lowerPrompt.includes('post') && (lowerPrompt.includes('gig') || lowerPrompt.includes('job'))) {
    return 'post_gig';
  }

  // Custom proposal confirmation - now handled by direct routing
  // Removed since we route directly to proposal page

  // Project type response
  const hasIdeaQuestion = previousMessages.some(msg =>
    msg.content.includes('What kind of idea do you want to work on?'));
  if (hasIdeaQuestion) {
    return 'project_type_response';
  }

  // Commissioner research
  if (lowerPrompt.includes('who') && (lowerPrompt.includes('commission') || lowerPrompt.includes('hire'))) {
    return 'commissioner_research';
  }

  // Default: let API handle gig matching
  return 'api_gig_matching';
}

// Utility functions for message handling
function generateMessageId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 11);
}

function createMessage(role: 'user' | 'ai', content: string): ChatMessage {
  return {
    id: generateMessageId(),
    role,
    content,
    createdAt: new Date().toISOString(),
    deleted: false
  };
}

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const messageTime = new Date(timestamp);
  const diffMs = now.getTime() - messageTime.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return messageTime.toLocaleDateString();
}

function formatAbsoluteTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export default function AiChatThread({ prompt, userType }: AiChatThreadProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage('user', prompt)
  ]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (newMessage.trim()) {
          handleSendMessage();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [newMessage]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // Listen for messages from other components
  useEffect(() => {
    const handleAddMessage = (event: CustomEvent<ChatMessage>) => {
      setMessages(prev => [...prev, event.detail]);
    };

    const handleGigSelection = (event: CustomEvent<any>) => {
      const gig = event.detail;
      const dynamicMessage = `Here's a quick pitch idea for the ${gig.projectName} opportunity focused on ${gig.skillsRequired.slice(0, 2).join(', ')}, and your past work experience.

✨ I drafted a quick pitch for you! Feel free to edit, add a portfolio link, and send when you're ready 🚀

Want to create a custom proposal instead?`;

      const messageWithButton = `${dynamicMessage}

<div style="margin-top: 12px;">
  <button onclick="window.location.href='/freelancer-dashboard/projects-and-invoices/create-proposal/proposal-preview?gigId=${gig.gigId}'"
          style="background: #eb1966; color: white; padding: 8px 16px; border-radius: 8px; border: none; font-size: 14px; cursor: pointer; font-family: Plus Jakarta Sans;">
    Open Proposal Form
  </button>
</div>`;

      setMessages(prev => [...prev, createMessage('ai', messageWithButton)]);
    };

    const handleQuickReply = (event: CustomEvent<string>) => {
      const reply = event.detail;
      if (reply === 'Yes') {
        // Add user message
        setMessages(prev => [...prev, createMessage('user', 'Yes')]);

        // Route directly to proposal creation with prompt context
        window.location.href = `/freelancer-dashboard/proposals/create?fromPrompt=${encodeURIComponent(prompt)}`;
      }
    };

    const handleCommissionerSelection = async (event: CustomEvent<any>) => {
      const { organization, projectType } = event.detail;

      // Add user selection message
      setMessages(prev => [...prev, createMessage('user', `I'd like to work with ${organization.name}`)]);

      // Generate proposal draft
      const proposalDraft = await generateProposalDraft(projectType, organization);

      if (proposalDraft) {
        const proposalMessage = `Great choice! Here's a draft proposal for your ${projectType} project with ${organization.name}:

**Project Title:** ${proposalDraft.projectTitle}
**Commissioner:** ${organization.name}
**Invoicing Model:** ${proposalDraft.invoicingModel}
**Duration:** ${proposalDraft.duration}
**Amount Estimate:** $${proposalDraft.projectAmount.toLocaleString()}

**Milestones:**
${proposalDraft.milestones.map((m: any, i: number) => `${i + 1}. ${m.title} - $${m.amount.toLocaleString()}`).join('\n')}

**Project Scope:** ${proposalDraft.summary}

Want to review before sending?`;

        const messageWithButton = `${proposalMessage}

<div style="margin-top: 12px;">
  <button onclick="window.location.href='/freelancer-dashboard/projects-and-invoices/create-proposal'"
          style="background: #eb1966; color: white; padding: 8px 16px; border-radius: 8px; border: none; font-size: 14px; cursor: pointer; font-family: Plus Jakarta Sans;">
    Open Proposal Form
  </button>
</div>`;

        // Save proposal draft to AI intake
        try {
          const session = await fetch('/api/auth/session').then(res => res.json());
          if (session?.user?.id) {
            await fetch('/api/app/ai-intake/proposals', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: session.user.id,
                proposal: proposalDraft
              })
            });
          }
        } catch (error) {
          console.error('Failed to save proposal draft:', error);
        }

        setMessages(prev => [...prev, createMessage('ai', messageWithButton)]);
      }
    };

    window.addEventListener('addChatMessage', handleAddMessage as EventListener);
    window.addEventListener('gigSelected', handleGigSelection as EventListener);
    window.addEventListener('quickReply', handleQuickReply as unknown as EventListener);
    window.addEventListener('commissionerSelected', handleCommissionerSelection as unknown as EventListener);

    return () => {
      window.removeEventListener('addChatMessage', handleAddMessage as EventListener);
      window.removeEventListener('gigSelected', handleGigSelection as EventListener);
      window.removeEventListener('quickReply', handleQuickReply as unknown as EventListener);
      window.removeEventListener('commissionerSelected', handleCommissionerSelection as unknown as EventListener);
    };
  }, []);

  // Auto-create chat history on prompt start
  useEffect(() => {
    const createChatHistory = async () => {
      // Get session data
      const session = await fetch('/api/auth/session').then(res => res.json());
      if (!session?.user?.id) return;

      try {
        await fetch('/api/app/chat-history/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: session.user.id,
            prompt,
            userType,
            timestamp: new Date().toISOString()
          })
        });
        console.log('✅ Chat history created successfully');

        // Notify chat history panel to refresh
        window.dispatchEvent(new CustomEvent('newChatSession'));
      } catch (error) {
        console.error('❌ Failed to create chat history:', error);
      }
    };

    if (prompt.trim()) {
      createChatHistory();
    }
  }, [prompt, userType]);

  // Initialize chat with AI response to the prompt
  useEffect(() => {
    if (!prompt.trim()) return;

    const initializeChat = async () => {
      setLoading(true);
      try {
        // Check for local intent overrides first
        const intent = classifyIntent(prompt, messages);
        let friendlyMessage = '';

        switch (intent) {
          case 'gratitude':
            friendlyMessage = "You're welcome! Let me know how else I can help 🌟";
            break;
          case 'greeting':
            friendlyMessage = "Hello! I'm here to help you find amazing creative opportunities. What are you looking to work on?";
            break;
          case 'post_gig':
            friendlyMessage = "Let's get your creative brief in shape. What's the title of your gig?";
            break;
          case 'custom_proposal_ideas':
            friendlyMessage = `Let's build something amazing. What's the core idea you want to pitch?

Here are some creative directions to consider:
<span class="bg-gray-100 text-xs rounded-full px-2 py-1 mr-2 mb-1 inline-block">Brand Identity Design</span>
<span class="bg-gray-100 text-xs rounded-full px-2 py-1 mr-2 mb-1 inline-block">User Experience Audit</span>
<span class="bg-gray-100 text-xs rounded-full px-2 py-1 mr-2 mb-1 inline-block">Content Strategy</span>
<span class="bg-gray-100 text-xs rounded-full px-2 py-1 mr-2 mb-1 inline-block">Digital Marketing Campaign</span>
<span class="bg-gray-100 text-xs rounded-full px-2 py-1 mr-2 mb-1 inline-block">Product Photography</span>`;
            break;
          case 'mobile_app_ideas':
            friendlyMessage = `Perfect! Mobile apps are exciting projects. Here are some focused ideas for your custom proposal:

<span class="bg-gray-100 text-xs rounded-full px-2 py-1 mr-2 mb-1 inline-block">iOS/Android UI Design</span>
<span class="bg-gray-100 text-xs rounded-full px-2 py-1 mr-2 mb-1 inline-block">User Flow Optimization</span>
<span class="bg-gray-100 text-xs rounded-full px-2 py-1 mr-2 mb-1 inline-block">App Icon & Branding</span>
<span class="bg-gray-100 text-xs rounded-full px-2 py-1 mr-2 mb-1 inline-block">Prototype Development</span>
<span class="bg-gray-100 text-xs rounded-full px-2 py-1 mr-2 mb-1 inline-block">App Store Assets</span>

What type of mobile app are you thinking about?`;
            break;
          case 'commissioner_research':
            friendlyMessage = "I can help you research recent commissioners! Let me check who's been posting creative projects lately.";
            break;
          case 'invoice_intent':
            friendlyMessage = `I can help you create an invoice! Let me gather the details you need.

Want to review this as an invoice?`;
            // Add route button
            setTimeout(() => {
              const routeButton = `<div style="margin-top: 12px;">
                <button onclick="window.location.href='/freelancer-dashboard/projects-and-invoices/create-invoice'"
                        style="background: #eb1966; color: white; padding: 8px 16px; border-radius: 8px; border: none; font-size: 14px; cursor: pointer; font-family: Plus Jakarta Sans;">
                  Create Invoice
                </button>
              </div>`;
              setMessages(prev => [...prev, createMessage('ai', routeButton)]);
            }, 1000);
            break;
          case 'product_intent':
            friendlyMessage = `I can help you list a new product! Let me set that up for you.

Want to review this as a product listing?`;
            // Add route button
            setTimeout(() => {
              const routeButton = `<div style="margin-top: 12px;">
                <button onclick="document.dispatchEvent(new CustomEvent('openProductModal'))"
                        style="background: #eb1966; color: white; padding: 8px 16px; border-radius: 8px; border: none; font-size: 14px; cursor: pointer; font-family: Plus Jakarta Sans;">
                  List Product
                </button>
              </div>`;
              setMessages(prev => [...prev, createMessage('ai', routeButton)]);
            }, 1000);
            break;

          default:
            // Make API call for general queries
            const apiEndpoint = userType === 'freelancer'
              ? '/api/ai-intake/freelancer'
              : '/api/ai-intake/client';

            const res = await fetch(apiEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                intent: prompt,
                step: 'initial',
                prompt: userType === 'commissioner' ? prompt : undefined
              }),
            });

            const data = await res.json();
            const resultText = typeof data.result === 'string' ? data.result : '';

            // Validate content before showing to user
            if (isValidContent(resultText)) {
              friendlyMessage = resultText;
            } else {
              // Try to parse structured response
              try {
                const parsedResult = JSON.parse(data.result || '{}');
                if (parsedResult.step === 'opportunities_results' && Array.isArray(parsedResult.opportunities)) {
                  const count = parsedResult.opportunities.length;
                  if (count === 0) {
                    // True zero matches - show fallback with proposal option
                    friendlyMessage = `Yikes — I couldn't find any gigs that match your prompt.

Do you want to create a custom proposal instead?`;

                    // Add quick reply button for proposal creation
                    setTimeout(() => {
                      const quickReply = `<div style="margin-top: 12px;">
                        <button onclick="window.location.href='/freelancer-dashboard/proposals/create?fromPrompt=${encodeURIComponent(prompt)}'"
                                style="background: #FCD5E3; color: #eb1966; padding: 8px 16px; border-radius: 8px; border: none; font-size: 14px; cursor: pointer; font-family: Plus Jakarta Sans; margin-right: 8px;">
                          ✅ Yes
                        </button>
                      </div>`;
                      setMessages(prev => [...prev, createMessage('ai', quickReply)]);
                    }, 1000);
                  } else {
                    // Valid gigs found - let worksheet handle display
                    friendlyMessage = `✨ Found ${count} matching opportunit${count !== 1 ? 'ies' : 'y'} for you! Check them out in the worksheet.`;
                  }
                } else {
                  friendlyMessage = "Hmm, I'm not sure how to help with that yet — want to try asking differently?";
                }
              } catch {
                friendlyMessage = "Hmm, I'm not sure how to help with that yet — want to try asking differently?";
              }
            }
        }

        // Add AI response to chat, avoiding duplicates and similar gig-matching messages
        setMessages(prev => {
          const aiMessage = createMessage('ai', friendlyMessage);

          // Check for exact duplicates
          const isDuplicate = prev.some(msg => msg.role === 'ai' && msg.content === friendlyMessage);
          if (isDuplicate) return prev;

          // Check for similar gig-matching messages to prevent redundancy
          const hasGigMatchMessage = prev.some(msg =>
            msg.role === 'ai' && (
              msg.content.includes('gigs that might be a perfect fit') ||
              msg.content.includes('see if any of these') ||
              msg.content.includes('based on your profile') ||
              msg.content.includes('checked the marketplace') ||
              msg.content.includes('might catch your creative spark') ||
              msg.content.includes('interesting opportunit') ||
              msg.content.includes('could be your next big project') ||
              msg.content.includes('potential match')
            )
          );

          // If we already have a gig-matching message and this is another one, skip it
          const isGigMatchMessage = friendlyMessage.includes('gigs that might be a perfect fit') ||
                                   friendlyMessage.includes('see if any of these') ||
                                   friendlyMessage.includes('based on your profile') ||
                                   friendlyMessage.includes('checked the marketplace') ||
                                   friendlyMessage.includes('might catch your creative spark') ||
                                   friendlyMessage.includes('interesting opportunit') ||
                                   friendlyMessage.includes('could be your next big project') ||
                                   friendlyMessage.includes('potential match');

          if (hasGigMatchMessage && isGigMatchMessage) {
            return prev; // Skip adding another similar gig-matching message
          }

          return [...prev, aiMessage];
        });
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        setMessages(prev => [...prev, createMessage('ai', 'Sorry, I encountered an error. Please try again.')]);
      } finally {
        setLoading(false);
      }
    };

    initializeChat();
  }, [prompt, userType]);

  // Unified AI agent intake system for chat thread
  const sendMessageToAgent = async (prompt: string) => {
    setLoading(true);
    try {
      const session = await fetch('/api/auth/session').then(res => res.json());
      const response = await fetch('/api/ai-intake/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          userType: session?.user?.type || 'freelancer',
          intent: 'ai_chat_thread',
          context: {
            pathname: window.location.pathname,
            session: session?.user || null,
          },
        }),
      });

      const result = await response.json();

      if (result?.result) {
        setMessages((prev) => [
          ...prev,
          createMessage('user', prompt),
          createMessage('ai', result.result),
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          createMessage('user', prompt),
          createMessage('ai', result?.error || 'Agent did not respond as expected.'),
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        createMessage('user', prompt),
        createMessage('ai', 'Something went wrong while contacting the agent.'),
      ]);
      console.error('Agent error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const prompt = newMessage;
    setNewMessage('');
    await sendMessageToAgent(prompt);
  };

  return (
    <div className="h-full bg-white flex flex-col">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.filter(msg => !msg.deleted).map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`px-4 py-3 rounded-lg shadow max-w-[80%] relative group ${
                msg.role === 'user'
                  ? 'bg-black text-white self-end'
                  : 'bg-white text-black border border-gray-200'
              }`}
              style={{ fontFamily: 'Plus Jakarta Sans' }}
            >
              <div className="pr-16" dangerouslySetInnerHTML={{ __html: msg.content }} />

              {/* Copy button for AI messages */}
              {msg.role === 'ai' && (
                <button
                  onClick={() => copyToClipboard(msg.content)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
                  title="Copy message"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              )}

              <div
                className="absolute bottom-2 right-2 text-xs text-gray-400 cursor-help"
                title={formatAbsoluteTime(msg.createdAt)}
              >
                {formatRelativeTime(msg.createdAt)}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white text-black border border-gray-200 px-4 py-3 rounded-lg max-w-[80%]">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                <span>AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Sticky Input Field */}
      <div className="sticky bottom-0 bg-white p-3 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ask me anything... (⌘+Enter to send)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
            style={{ fontFamily: 'Plus Jakarta Sans' }}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newMessage.trim()) {
                handleSendMessage();
              }
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              newMessage.trim() && !loading
                ? 'bg-black text-white hover:bg-gray-800'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            style={{ fontFamily: 'Plus Jakarta Sans' }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
