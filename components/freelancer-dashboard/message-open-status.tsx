'use client';

// NOTE TO DEV TEAM:
// This is a reusable icon component to indicate message open status.
// If `isUnread` is true, the mail icon is wrapped in a pink #FCD5E3 circle.
// This component is used in both contact lists and message previews.

import Image from 'next/image';

type Props = {
  isUnread: boolean;
};

export default function MessageOpenStatus({ isUnread }: Props) {
  return (
    <div
      className={`rounded-full p-2 transition ${
        isUnread ? 'bg-[#FCD5E3]' : ''
      }`}
    >
      <Image
        src="/icons/mail-icon.svg"
        alt="Message"
        width={16}
        height={16}
        className={`${isUnread ? 'opacity-100' : 'opacity-50'} transition`}
      />
    </div>
  );
}