'use client';

import Image from 'next/image';

type ClientInfo = {
  companyName?: string;
  contactName?: string;
  email?: string;
  address?: string;
  logo?: string;
};

type ClientInfoBoxProps = {
  client?: ClientInfo; // now optional to safely handle undefined
};

export default function ClientInfoBox({ client }: ClientInfoBoxProps) {
  if (!client) return null; // prevent rendering when client is undefined

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {client?.logo && (
          <Image
            src={client.logo}
            alt={`${client.companyName ?? 'Client'} logo`}
            width={32}
            height={32}
            className="rounded-full"
          />
        )}
        <div>
          <p className="font-medium text-sm text-gray-700">{client.companyName ?? '—'}</p>
          <p className="text-sm text-gray-500">{client.email ?? 'No email provided'}</p>
        </div>
      </div>
      <p className="text-xs text-gray-500">{client.contactName ?? '—'}</p>
      <p className="text-xs text-gray-500">{client.address ?? '—'}</p>
    </div>
  );
}