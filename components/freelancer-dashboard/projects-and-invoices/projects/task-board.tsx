'use client';

import { useState } from 'react';
import TaskColumn from './task-column';
import { motion, AnimatePresence } from 'framer-motion';

type ColumnId = 'todo' | 'upcoming' | 'review';

const mockColumns: { id: ColumnId; title: string }[] = [
  { id: 'todo', title: "Today's To Do" },
  { id: 'upcoming', title: 'Upcoming This Week' },
  { id: 'review', title: 'Awaiting Review' },
];

export default function TaskBoard() {
  const [columns] = useState(mockColumns);
  const [activeColumn, setActiveColumn] = useState<ColumnId | null>(null);

  return (
    <section className="w-full px-4 pb-8">
      {/* Mobile View */}
      <div className="flex flex-col gap-4 md:hidden relative min-h-[300px]">
        <AnimatePresence mode="wait">
          {!activeColumn ? (
            <motion.div
              key="mobile-menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
              {columns.map((col) => (
                <motion.button
                  key={col.id}
                  layoutId={col.id}
                  className="w-full py-4 px-6 bg-pink-100 text-left rounded-xl shadow-md text-lg font-semibold"
                  onClick={() => setActiveColumn(col.id)}
                  whileTap={{ scale: 0.97 }}
                >
                  {col.title}
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="expanded-column"
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.1, duration: 0.4 }}
              className="absolute top-0 left-0 w-full"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x > 100) {
                  setActiveColumn(null);
                }
              }}
            >
              <button
                className="text-sm text-blue-600 font-medium mb-4"
                onClick={() => setActiveColumn(null)}
              >
                ← Back
              </button>
              <TaskColumn
                columnId={activeColumn}
                title={columns.find((col) => col.id === activeColumn)?.title || ''}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop View */}
      <div className="hidden md:flex justify-center gap-6 overflow-x-auto">
        {columns.map((col) => (
          <TaskColumn
            key={col.id}
            columnId={col.id}
            title={col.title}
          />
        ))}
      </div>
    </section>
  );
}