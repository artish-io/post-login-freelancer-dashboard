'use client';

type PageHeadingProps = {
  heading: string;
};

export default function PageHeading({ heading }: PageHeadingProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 pt-4 pb-4">
      {/* Page title */}
      <h1 className="text-[40px] leading-tight font-bold text-black mb-4 font-plus-jakarta-sans">
        {heading}
      </h1>

      {/* Popular Tags */}
      <div className="flex items-center flex-wrap gap-2">
        <span className="text-sm font-medium text-gray-700 mr-2">
          Popular Tags:
        </span>

        {[
          'Programming',
          'JavaScript',
          'Python',
          'Mac OS',
          'VSCode',
          'Flutter',
          'Ruby',
          'Computer Science',
          'Machine Learning',
        ].map((tag, idx) => (
          <button
            key={idx}
            className="text-xs font-semibold border border-gray-300 rounded-full px-3 py-1 hover:bg-gray-100"
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}