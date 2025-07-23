'use client';

import CustomDropdown from '../../../ui/custom-dropdown';

type Filters = {
  status: string;
  sortBy: string;
};

type Props = {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
};

export default function InvoiceHistoryFilters({ filters, onFiltersChange }: Props) {
  const handleStatusChange = (status: string) => {
    onFiltersChange({
      ...filters,
      status
    });
  };

  const handleSortChange = (sortBy: string) => {
    onFiltersChange({
      ...filters,
      sortBy
    });
  };

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'paid', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'sent', label: 'On Hold' },
    { value: 'failed', label: 'Failed' },
    { value: 'pending', label: 'Pending' },
    { value: 'draft', label: 'Processing' }
  ];

  const sortOptions = [
    { value: 'order', label: 'Order' },
    { value: 'date-desc', label: 'Date' },
    { value: 'amount-desc', label: 'Price' },
    { value: 'name', label: 'Name' }
  ];

  return (
    <div className="flex items-center gap-4">
      {/* Transaction Status Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Transaction Status:</span>
        <CustomDropdown
          value={filters.status}
          options={statusOptions}
          onChange={handleStatusChange}
          className="min-w-[140px]"
        />
      </div>

      {/* Sort By Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Sort by:</span>
        <CustomDropdown
          value={filters.sortBy}
          options={sortOptions}
          onChange={handleSortChange}
          className="min-w-[100px]"
        />
      </div>
    </div>
  );
}
