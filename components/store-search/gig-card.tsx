import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Gig } from '../../types/gig';

type GigCardProps = {
  gig: Gig;
};

export default function GigCard({ gig }: GigCardProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const {
    name,
    title,
    category,
    skills = [],
    specializations = [],
    rate,
    location,
    rating,
    avatar = '/avatar.png' // Default fallback avatar
  } = gig;

  // Extract tools from both skills and tools arrays (handle data structure inconsistency)
  const tools = (gig as any).tools || [];
  const allSkills = [...skills, ...tools];

  // Format location to show country codes for consistency
  const formatLocation = (location: string) => {
    if (location.toLowerCase().includes('lagos') || location.toLowerCase().includes('nigeria')) {
      return 'NG';
    }
    // Add other location mappings as needed
    if (location.toLowerCase().includes('united states') || location.toLowerCase().includes('usa')) {
      return 'US';
    }
    if (location.toLowerCase().includes('canada')) {
      return 'CA';
    }
    if (location.toLowerCase().includes('united kingdom') || location.toLowerCase().includes('uk')) {
      return 'UK';
    }
    // Return the original location if no mapping found
    return location;
  };

  // Handle message button click with authentication check
  const handleMessageClick = () => {
    if (!session?.user?.id) {
      // User is not logged in, redirect to commissioner login
      router.push('/login-commissioner');
      return;
    }

    // User is logged in, navigate to messages with the freelancer
    // Create a thread ID based on user IDs (smaller ID first for consistency)
    const currentUserId = Number(session.user.id);
    // Use userId from the gig data (which comes from freelancer.userId)
    const freelancerUserId = (gig as any).userId || gig.id; // Fallback to gig.id if userId not available
    const threadId = currentUserId < freelancerUserId
      ? `${currentUserId}-${freelancerUserId}`
      : `${freelancerUserId}-${currentUserId}`;

    router.push(`/commissioner-dashboard/messages?thread=${threadId}`);
  };

  // Handle gig request button click
  const handleGigRequestClick = () => {
    if (!session?.user?.id) {
      // User is not logged in, redirect to commissioner login
      router.push('/login-commissioner');
      return;
    }

    // Navigate to post-a-gig flow with freelancer pre-selected
    const freelancerUserId = (gig as any).userId || gig.id;
    router.push(`/commissioner-dashboard/projects-and-invoices/post-a-gig?targetFreelancer=${freelancerUserId}&freelancerName=${encodeURIComponent(name)}`);
  };

  const skillIcons: Record<string, string> = {
    HTML5: '/HTML5-logo.png',
    TypeScript: '/typescript-logo.png',
    JavaScript: '/js-log.png',
    Ruby: '/ruby-logo.png',
    Figma: '/figma-logo.png',
    Canva: '/canva-logo.png',
    'Adobe Photoshop': '/photoshop-logo.png',
    'Adobe Illustrator': '/illustrator-logo.png',
    Python: '/python-logo.png',
    YouTube: '/youtube-logo.png',
    AWS: '/aws-logo.png',
    Kotlin: '/kotlin-logo.png',
    'React Native': '/react-native-logo.svg',
    'Node.js': '/nodejs-logo.png',
    'After Effects': '/after-effects-logo.png',
    Docker: '/docker-logo.png',
    MongoDB: '/mongodb-logo.svg',
    'VS Code': '/vscode-logo.png',
    GitHub: '/github-logo.png',
    Sketch: '/sketch-logo.png'
  };

  const toolList = Object.keys(skillIcons);
  const isTool = (tag: string) => toolList.includes(tag);

  const filteredSkills = allSkills.filter(
    (skill) =>
      !isTool(skill) &&
      skill !== title &&
      skill !== category
  );

  const toolsFromSkills = allSkills.filter(isTool);

  return (
    <div className="border rounded-2xl shadow-sm w-full bg-white overflow-hidden">
      {/* Top: Avatar + Name + Rating */}
      <div className="p-2 sm:p-4 flex items-center space-x-2 sm:space-x-4">
        <Image
          src={avatar}
          alt={`${name} Avatar`}
          width={56}
          height={56}
          className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border-2 sm:border-4 border-pink-200"
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-xs sm:text-base font-semibold flex flex-col sm:flex-row sm:items-center gap-0 sm:gap-1">
            <span className="truncate">{name}</span>
            <span className="text-[8px] sm:text-[10px] text-gray-500 flex items-center gap-0.5">
              {'★'.repeat(Math.floor(rating))}
              <span className="ml-1">({rating.toFixed(1)})</span>
            </span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 truncate">{title}</p>
          <p className="text-[10px] sm:text-xs text-gray-400 truncate">{category}</p>
        </div>
      </div>

      {/* Skills + Specializations */}
      <div className="px-2 sm:px-4 flex flex-wrap gap-1 sm:gap-2 mb-2">
        {filteredSkills.slice(0, 1).map((skill) => (
          <span
            key={skill}
            className="px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold text-pink-800 bg-pink-100 rounded-full"
          >
            {skill}
          </span>
        ))}
        {specializations.slice(0, 1).map((spec: string) => (
          <span
            key={spec}
            className="px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-medium text-pink-700 bg-pink-50 border border-pink-200 rounded-full"
          >
            {spec}
          </span>
        ))}
      </div>

      {/* Rate + Tools */}
      <div className="px-2 sm:px-4 flex flex-wrap items-center gap-1 sm:gap-2 mb-2 sm:mb-3">
        <div className="flex items-center gap-1 text-[10px] sm:text-xs px-1 sm:px-2 py-1 rounded-full border border-gray-300 text-gray-800">
          💲 {rate}
        </div>

        {toolsFromSkills.slice(0, 2).map((tool) => (
          <div
            key={tool}
            className="flex items-center gap-1 text-[10px] sm:text-xs px-1 sm:px-2 py-1 rounded-full border border-gray-300 text-gray-800"
          >
            {skillIcons[tool] && (
              <Image
                src={skillIcons[tool]}
                alt={tool}
                width={12}
                height={12}
                className="w-3 h-3 sm:w-4 sm:h-4"
              />
            )}
            <span className="hidden sm:inline">{tool}</span>
          </div>
        ))}

        {toolsFromSkills.length > 2 && (
          <span className="text-[10px] sm:text-xs px-1 sm:px-2 py-1 rounded-full border border-gray-300 text-gray-500">
            {toolsFromSkills.length - 2}+
          </span>
        )}
      </div>

      {/* Sample Image - full width, no padding */}
      <Image
        src="/coin-sample-gig-card.png"
        alt="Work Sample"
        width={400}
        height={180}
        className="w-full h-24 sm:h-32 lg:h-auto object-cover"
      />

      {/* Footer */}
      <div className="p-2 sm:p-4 flex items-center justify-between mt-1 sm:mt-2">
        {/* Message Icon - triggers DM */}
        <button
          onClick={handleMessageClick}
          className="hover:bg-gray-100 p-2 rounded-lg transition-colors"
          title="Send direct message"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-600"
          >
            <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/>
          </svg>
        </button>

        {/* Send Gig Request Button - text only */}
        <button
          onClick={handleGigRequestClick}
          className="bg-black text-white px-3 sm:px-4 py-1 sm:py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <span className="text-xs sm:text-sm">Send Gig Request</span>
        </button>

        <span className="text-xs sm:text-sm text-gray-500 truncate max-w-[60px] sm:max-w-none">📍{formatLocation(location)}</span>
      </div>
    </div>
  );
}