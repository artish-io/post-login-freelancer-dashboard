import Image from 'next/image';
import { Gig } from '../../types/gig';

type GigCardProps = {
  gig: Gig;
};

export default function GigCard({ gig }: GigCardProps) {
  const {
    name,
    title,
    category,
    skills = [],
    skillCategories = [],
    tools = [],
    specializations = [],
    rate,
    location,
    rating,
    avatar = '/avatar.png' // Default fallback avatar
  } = gig;

  // Combine all skill-related data for display
  const allSkills = [...skills, ...skillCategories, ...tools];

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
    MongoDB: '/mongodb-logo.svg'
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
    <div className="border rounded-2xl shadow-sm w-full max-w-sm bg-white overflow-hidden">
      {/* Top: Avatar + Name + Rating */}
      <div className="p-4 flex items-center space-x-4">
        <Image
          src={avatar}
          alt={`${name} Avatar`}
          width={56}
          height={56}
          className="rounded-full border-4 border-pink-200"
        />
        <div>
          <h3 className="text-base font-semibold flex items-center gap-1">
            {name}
            <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
              {'★'.repeat(Math.floor(rating))} 
              <span className="ml-1">({rating.toFixed(1)})</span>
            </span>
          </h3>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-xs text-gray-400">{category}</p>
        </div>
      </div>

      {/* Skills + Specializations */}
      <div className="px-4 flex flex-wrap gap-2 mb-2">
        {filteredSkills.slice(0, 1).map((skill) => (
          <span
            key={skill}
            className="px-3 py-1 text-xs font-semibold text-pink-800 bg-pink-100 rounded-full"
          >
            {skill}
          </span>
        ))}
        {specializations.map((spec: string) => (
          <span
            key={spec}
            className="px-3 py-1 text-xs font-medium text-pink-700 bg-pink-50 border border-pink-200 rounded-full"
          >
            {spec}
          </span>
        ))}
      </div>

      {/* Rate + Tools */}
      <div className="px-4 flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-gray-300 text-gray-800">
          💲 {rate}
        </div>

        {toolsFromSkills.slice(0, 4).map((tool) => (
          <div
            key={tool}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-gray-300 text-gray-800"
          >
            {skillIcons[tool] && (
              <Image
                src={skillIcons[tool]}
                alt={tool}
                width={16}
                height={16}
              />
            )}
            <span>{tool}</span>
          </div>
        ))}

        {toolsFromSkills.length > 4 && (
          <span className="text-xs px-2 py-1 rounded-full border border-gray-300 text-gray-500">
            {toolsFromSkills.length - 4}+
          </span>
        )}
      </div>

      {/* Sample Image - full width, no padding */}
      <Image
        src="/coin-sample-gig-card.png"
        alt="Work Sample"
        width={400}
        height={180}
        className="w-full h-auto object-cover"
      />

      {/* Footer */}
      <div className="p-4 flex items-center justify-between mt-2">
        <button className="text-2xl">＋</button>
        <button className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Image src="/gig-chats.png" alt="Chat" width={18} height={18} />
          Contact
        </button>
        <span className="text-sm text-gray-500">📍{location}</span>
      </div>
    </div>
  );
}