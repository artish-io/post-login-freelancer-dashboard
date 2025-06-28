'use client';

import Image from 'next/image';
import AddCustomerButton from '../../../../ui/add-customer-button';

export interface ClientDetailsBoxProps {
  organizationName?: string;
  organizationLogo?: string;
  clientName?: string;
  clientEmail?: string;
  clientAddress?: string;
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
  // Debug props
  console.log('🧾 ClientDetailsBox props:', {
    organizationName,
    organizationLogo,
    clientName,
    clientEmail,
    clientAddress,
  });

  return (
    <section className="bg-white rounded-xl shadow-sm p-6 space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Client Details</h3>
      </div>

      {/* Org Logo + Name + Email */}
      {(organizationLogo || organizationName || clientEmail) && (
        <div className="flex items-center gap-3">
          {organizationLogo && (
            <div className="w-10 h-10 relative shrink-0">
              <Image
                src={organizationLogo}
                alt={organizationName || 'Client logo'}
                fill
                className="rounded-full object-cover"
              />
            </div>
          )}
          <div>
            {organizationName && (
              <p className="text-sm font-semibold text-gray-900">
                {organizationName}
              </p>
            )}
            {clientEmail && (
              <p className="text-sm text-gray-500">{clientEmail}</p>
            )}
          </div>
        </div>
      )}

      {/* Divider */}
      {(clientName || clientAddress) && <hr className="border-gray-200" />}

      {/* Contact Person Info */}
      {(clientName || clientAddress) && (
        <div className="space-y-1">
          {clientName && (
            <p className="text-sm font-semibold text-gray-900">{clientName}</p>
          )}
          {clientAddress && (
            <p className="text-sm text-gray-500">{clientAddress}</p>
          )}
        </div>
      )}

      {/* Add Customer Button */}
      {onAddCustomer && (
        <div>
          <AddCustomerButton onClick={onAddCustomer}>
            Add Customer
          </AddCustomerButton>
        </div>
      )}
    </section>
  );
}