// components/ui/popover.tsx
'use client';

import * as RadixPopover from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';

export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;

export function PopoverContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixPopover.Content>) {
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        align="start"
        className={cn(
          'z-50 w-auto rounded-md border border-gray-200 bg-white p-4 text-sm shadow-md outline-none',
          className
        )}
        {...props}
      />
    </RadixPopover.Portal>
  );
}