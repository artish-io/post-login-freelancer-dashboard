'use client';

import Image from 'next/image';

type ContactSearchItemProps = {
  id: number;
  name: string;
  title: string;
  avatar: string;
  onSelect: (recipientId: number) => void;
};

export default function ContactSearchItem({
  id,
  name,
  title,
  avatar,
  onSelect,
}: ContactSearchItemProps) {
  return (
    <button
      onClick={() => onSelect(id)}
      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-pink-100 transition text-left"
    >
      <div className="flex items-center gap-3">
        <Image
          src={avatar}
          alt={name}
          width={40}
          height={40}
          className="rounded-full object-cover"
        />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">{name}</span>
          <span className="text-xs text-gray-500">{title}</span>
        </div>
      </div>

      <Image
        src="/icons/mail-icon.svg"
        alt="Send Message"
        width={18}
        height={18}
        className="opacity-80"
      />
    </button>
  );
}