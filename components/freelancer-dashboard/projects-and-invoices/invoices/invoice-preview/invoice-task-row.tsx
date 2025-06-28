type Task = {
  id: number;
  title: string;
  order: string;
  rate: number;
};

type InvoiceTaskRowProps = {
  task: Task;
  onChange?: (id: number, field: keyof Task, value: string | number) => void;
  readOnly?: boolean;
};

export default function InvoiceTaskRow({ task, onChange, readOnly = false }: InvoiceTaskRowProps) {
  if (readOnly) {
    return (
      <div className="grid grid-cols-4 gap-4">
        <div className="py-2 text-sm text-gray-800">{task.title || '—'}</div>
        <div className="py-2 text-sm text-gray-800">{task.order || '—'}</div>
        <div className="py-2 text-sm text-gray-800">${task.rate.toFixed(2)}</div>
        <div className="py-2 text-sm text-gray-900 font-medium text-right">${task.rate.toFixed(2)}</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      <input
        type="text"
        className="bg-white border border-gray-300 px-3 py-2 rounded-md text-sm w-full"
        placeholder="Deliverable"
        value={task.title}
        onChange={(e) => onChange?.(task.id, 'title', e.target.value)}
      />
      <input
        type="text"
        className="bg-white border border-gray-300 px-3 py-2 rounded-md text-sm w-full"
        placeholder="Order/Type"
        value={task.order}
        onChange={(e) => onChange?.(task.id, 'order', e.target.value)}
      />
      <input
        type="number"
        className="bg-white border border-gray-300 px-3 py-2 rounded-md text-sm w-full"
        placeholder="Rate"
        value={task.rate}
        onChange={(e) => onChange?.(task.id, 'rate', Number(e.target.value))}
      />
      <input
        type="text"
        readOnly
        className="bg-gray-100 border border-gray-200 px-3 py-2 rounded-md text-sm w-full text-right"
        value={`$${task.rate.toFixed(2)}`}
      />
    </div>
  );
}