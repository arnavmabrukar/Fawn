"use client";

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { DigitalIntakeDoc } from '@/components/admin/DigitalIntakeDoc';

type IntakeData = {
  parentName: string;
  childName: string;
  age: string | number;
  medicalNotes: string;
  ageCare: string;
  hiddenAllergens: string;
  timestamp: string;
};

interface IntakeSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: IntakeData | null;
}

export function IntakeSummaryModal({ isOpen, onClose, data }: IntakeSummaryModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="intake-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 20 }}
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] bg-[#f8f5ef] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/60 bg-white/70 px-6 py-4 backdrop-blur">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Digital Intake Summary</h2>
                <p className="text-sm text-gray-500">Opened from the autonomous actions feed</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <DigitalIntakeDoc data={data} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
