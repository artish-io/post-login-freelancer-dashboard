import type { NextPage } from "next";

export type StyleSecondarySmallTrueDType = {
  className?: string;

  /** Variant props */
  breakpoint?: string;
};

const StyleSecondarySmallTrueD: NextPage<StyleSecondarySmallTrueDType> = ({
  className = "",
  breakpoint = "Desktop",
}) => {
  return (
    <button
      className={`cursor-pointer border-Black border-solid border-[1px] py-2 px-5 bg-White rounded-lg flex flex-row items-center justify-center ${className}`}
      data-breakpoint={breakpoint}
    >
      <b className="relative text-base leading-[150%] font-Text-Regular-Normal text-Black text-left">
        Get Started
      </b>
    </button>
  );
};

export default StyleSecondarySmallTrueD;
