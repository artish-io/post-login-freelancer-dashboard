import type { NextPage } from "next";

export type StylePrimarySmallTrueDarType = {
  className?: string;

  /** Variant props */
  breakpoint?: string;
};

const StylePrimarySmallTrueDar: NextPage<StylePrimarySmallTrueDarType> = ({
  className = "",
  breakpoint = "Desktop",
}) => {
  return (
    <div
      className={`rounded-lg bg-[#130e01] border-Black border-solid border-[1px] flex flex-row items-center justify-center py-2 px-10 text-left text-base text-white font-Text-Regular-Normal ${className}`}
      data-breakpoint={breakpoint}
    >
      <b className="relative leading-[150%]">Login</b>
    </div>
  );
};

export default StylePrimarySmallTrueDar;
