

'use client';

type IntakeMode = 'building' | 'executing';

interface Props {
  mode: IntakeMode;
  onChange: (mode: IntakeMode) => void;
}

export default function IntakeToggle({ mode, onChange }: Props) {
  const handleToggle = (newMode: IntakeMode) => {
    onChange(newMode);
  };

  return (
    <div className="relative flex rounded-full border border-gray-300 bg-white p-1 w-fit shadow-lg">
      {/* Sliding background indicator */}
      <div
        className={`absolute top-1 bottom-1 bg-black rounded-full transition-all duration-300 ease-out ${
          mode === 'building'
            ? 'left-1 right-[50%]'
            : 'left-[50%] right-1'
        }`}
      />

      <button
        onClick={() => handleToggle('building')}
        className={`relative z-10 px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 ease-out transform ${
          mode === 'building'
            ? 'text-white scale-105'
            : 'text-gray-700 hover:text-gray-900 hover:scale-102'
        }`}
      >
        I’m Building Something
      </button>
      <button
        onClick={() => handleToggle('executing')}
        className={`relative z-10 px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 ease-out transform ${
          mode === 'executing'
            ? 'text-white scale-105'
            : 'text-gray-700 hover:text-gray-900 hover:scale-102'
        }`}
      >
        I’m Available to Execute
      </button>
    </div>
  );
}