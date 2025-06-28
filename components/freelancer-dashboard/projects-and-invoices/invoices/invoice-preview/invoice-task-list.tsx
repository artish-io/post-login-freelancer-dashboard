'use client';

import { useEffect, useState } from 'react';
import InvoiceTaskRow from './invoice-task-row';

type Task = {
  id: number;
  title: string;
  order: string;
  rate: number;
};

type Discount = {
  id: number;
  amount: number;
};

type Props = {
  tasks: Task[];
  readOnly?: boolean; // ✅ FIX: allow passing readOnly prop
};

export default function InvoiceTaskList({ tasks: initialTasks, readOnly = false }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]); // for potential future use

  useEffect(() => {
    if (initialTasks && initialTasks.length) {
      setTasks(initialTasks);
    }
  }, [initialTasks]);

  const subtotal = tasks.reduce((acc, t) => acc + t.rate, 0);
  const total = subtotal;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {tasks.map((task) => (
          <InvoiceTaskRow
            key={task.id}
            task={task}
            readOnly={readOnly}
            onChange={() => {}}
          />
        ))}
      </div>

      <div className="w-full flex flex-col items-end space-y-2">
        <div className="text-right text-sm text-gray-800">
          <div className="flex justify-between w-64">
            <span className="font-medium">Subtotal</span>
            <span className="font-semibold">${subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between w-64 mt-2 pt-2 border-t border-gray-200">
            <span className="font-semibold">Total</span>
            <span className="font-bold">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}