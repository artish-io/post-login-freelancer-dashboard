"use client";
import type { NextPage } from "next";
import { useEffect } from "react";
import Image from "next/image";
import StyleSecondarySmallTrueD from "./style-secondary-small-true-d";
import StylePrimarySmallTrueDar from "./style-primary-small-true-dar";

export type Navbar1Type = {
  className?: string;

  /** Variant props */
  breakpoint?: string;
};

const Navbar1: NextPage<Navbar1Type> = ({
  className = "",
  breakpoint = "Desktop",
}) => {
  useEffect(() => {
    const scrollAnimElements = document.querySelectorAll(
      "[data-animate-on-scroll]",
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            const targetElement = entry.target;
            targetElement.classList.add("animate");
            observer.unobserve(targetElement);
          }
        }
      },
      {
        threshold: 0.15,
      },
    );
    for (let i = 0; i < scrollAnimElements.length; i++) {
      observer.observe(scrollAnimElements[i]);
    }

    return () => {
      for (let i = 0; i < scrollAnimElements.length; i++) {
        observer.unobserve(scrollAnimElements[i]);
      }
    };
  }, []);
  return (
    <div
      className={`w-[1440px] h-[72px] bg-White border-Black border-solid border-b-[1px] box-border max-w-full overflow-hidden shrink-0 flex flex-col items-center justify-center py-0 px-16 [&.animate]:animate-[1s_ease_0s_1_normal_forwards_fade-in] opacity-[0] text-left text-base text-Black font-Text-Regular-Normal ${className}`}
      data-animate-on-scroll
      data-breakpoint={breakpoint}
    >
      <div className="self-stretch flex flex-row items-center justify-between gap-0">
        <div className="h-[37px] w-[277px] flex flex-row items-start justify-start bg-[url('/content@3x.png')] bg-cover bg-no-repeat bg-[top]">
        </div>
        <div className="flex flex-row items-center justify-center gap-8">
          <div className="overflow-hidden flex flex-row items-start justify-start gap-8">
            <div className="relative leading-[150%]" />
            <b className="relative leading-[150%]">Post A Gig</b>
            <b className="relative leading-[150%]">Blog</b>
            <div className="flex flex-row items-center justify-center gap-1">
            <b className="leading-[150%]">About Us</b>
              <Image
                src="/chevron-down.svg"
                alt="Chevron Down"
                width={20}
                height={20}
                className="shrink-0"
              />
            </div>
          </div>
          <div className="flex flex-row items-center justify-center gap-4">
            <StyleSecondarySmallTrueD breakpoint="Desktop" />
            <StylePrimarySmallTrueDar breakpoint="Desktop" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar1;
