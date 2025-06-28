'use client';

type FreelancerInfoProps = {
  name: string;
  email: string;
  address: string;
};

export default function FreelancerInfoBox({ name, email, address }: FreelancerInfoProps) {
  return (
    <div className="w-full bg-zinc-900 text-white rounded-md px-6 py-4 flex flex-col gap-2 md:gap-4">
      <div className="flex flex-col">
        <span className="text-base font-semibold">{name}</span>
        <span className="text-sm text-zinc-300">{email}</span>
      </div>
      <div className="text-sm text-zinc-400 md:text-right">
        {address}
      </div>
    </div>
  );
}