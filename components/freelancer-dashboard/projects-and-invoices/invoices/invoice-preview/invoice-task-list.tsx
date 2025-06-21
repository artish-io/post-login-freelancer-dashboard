'use client';

import { useState } from 'react';
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

export default function InvoiceTaskList() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, title: 'Develop colour palette', order: '01', rate: 5244 },
  ]);

  const [discounts, setDiscounts] = useState<Discount[]>([]);

  const handleTaskChange = (id: number, field: keyof Task, value: string | number) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, [field]: field === 'rate' ? Number(value) : value } : task
      )
    );
  };

  const addTask = () => {
    const newId = tasks.length ? Math.max(...tasks.map((t) => t.id)) + 1 : 1;
    setTasks([...tasks, { id: newId, title: '', order: '', rate: 0 }]);
  };

  const handleDiscountChange = (id: number, value: number) => {
    setDiscounts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, amount: value } : d))
    );
  };

  const addDiscount = () => {
    const newId = discounts.length ? Math.max(...discounts.map((d) => d.id)) + 1 : 1;
    setDiscounts([...discounts, { id: newId, amount: 0 }]);
  };

  const subtotal = tasks.reduce((acc, t) => acc + t.rate, 0);
  const totalDiscount = discounts.reduce((acc, d) => acc + d.amount, 0);
  const total = subtotal - totalDiscount;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {tasks.map((task) => (
          <InvoiceTaskRow
            key={task.id}
            task={task}
            onChange={handleTaskChange}
          />
        ))}
        <button
          onClick={addTask}
          className="text-sm text-purple-400 hover:text-purple-600 font-medium"
        >
          Add Task+
        </button>
      </div>

      <div className="w-full flex flex-col items-end space-y-2">
        <div className="text-right text-sm text-gray-800">
          <div className="flex justify-between w-64">
            <span className="font-medium">Subtotal</span>
            <span className="font-semibold">${subtotal.toFixed(2)}</span>
          </div>

          {discounts.map((discount) => (
            <div key={discount.id} className="flex justify-between w-64">
              <span className="text-gray-500">Discount</span>
              <input
                type="number"
                value={discount.amount}
                onChange={(e) => handleDiscountChange(discount.id, Number(e.target.value))}
                className="w-20 text-right bg-transparent border-b border-gray-300 focus:outline-none focus:border-pink-500"
              />
            </div>
          ))}

          <button
            onClick={addDiscount}
            className="text-xs text-purple-400 mt-1 hover:text-purple-600"
          >
            Add +
          </button>

          <div className="flex justify-between w-64 mt-2 pt-2 border-t border-gray-200">
            <span className="font-semibold">Total</span>
            <span className="font-bold">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}