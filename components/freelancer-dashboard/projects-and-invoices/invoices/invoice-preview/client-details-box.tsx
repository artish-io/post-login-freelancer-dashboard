'use client';

import Image from 'next/image';
import AddCustomerButton from '../../../../ui/add-customer-button';

interface ClientDetailsBoxProps {
  organizationName: string;
  organizationLogo?: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  onAddCustomer?: () => void;
}

export default function ClientDetailsBox({
  organizationName,
  organizationLogo,
  clientName,
  clientEmail,
  clientAddress,
  onAddCustomer,
}: ClientDetailsBoxProps) {
  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Client Details</h3>
        <p className="text-sm text-gray-500">{clientEmail}</p>
      </div>

      <div className="flex items-center gap-3">
        {organizationLogo && (
          <Image
            src={organizationLogo}
            alt={organizationName}
            width={40}
            height={40}
            className="rounded-full object-cover"
          />
        )}
        <div>
          <p className="text-base font-semibold text-gray-900">{organizationName}</p>
          <p className="text-sm text-gray-500">{clientEmail}</p>
        </div>
      </div>

      <div className="border-t pt-4 space-y-1">
        <p className="text-base font-semibold text-gray-900">{clientName}</p>
        <p className="text-sm text-gray-500">{clientAddress}</p>
      </div>

      {onAddCustomer && (
        <AddCustomerButton onClick={onAddCustomer}>
          Add Customer
        </AddCustomerButton>
      )}
    </section>
  );
}