"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, Calendar, Clock, ChevronRight } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: any[];
  calls: any[];
}

export function HistoryModal({ isOpen, onClose, leads, calls }: HistoryModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[32px] w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Fawn Persistent Memory</h2>
                  <p className="text-sm text-gray-500">Retrieving historical state from MongoDB</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Tabs / Content */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="space-y-8">
                  
                  {/* Recent Leads Section */}
                  <section>
                    <div className="flex items-center gap-2 mb-4 text-daycare-teal">
                      <User size={18} />
                      <h3 className="font-bold uppercase tracking-widest text-xs">Recent Intake Leads</h3>
                    </div>
                    
                    <div className="space-y-3">
                      {leads.length === 0 ? (
                        <p className="text-gray-400 text-sm italic">No history found in database yet...</p>
                      ) : (
                        leads.map((lead) => (
                          <div key={lead.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between group hover:border-daycare-teal/30 transition-all">
                            <div className="flex items-center gap-4">
                              <div className="bg-white p-2.5 rounded-xl shadow-sm">
                                <span className="text-lg font-bold text-daycare-teal">
                                  {lead.childName.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-800">{lead.childName}</h4>
                                <p className="text-xs text-gray-500">Parent: {lead.parentName} • {lead.age} years old</p>
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end">
                               <span className="text-[10px] uppercase font-bold text-gray-400 mb-1">
                                 {new Date(lead.timestamp).toLocaleDateString()}
                               </span>
                               <ChevronRight size={16} className="text-gray-300 group-hover:text-daycare-teal transition-colors" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  {/* Recent Calls Section */}
                  <section>
                    <div className="flex items-center gap-2 mb-4 text-daycare-orange">
                      <Phone size={18} />
                      <h3 className="font-bold uppercase tracking-widest text-xs">Call Performance History</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {calls.map((call) => (
                        <div key={call.id} className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm flex items-center gap-3">
                           <div className="text-daycare-orange bg-orange-50 p-2 rounded-lg">
                             <Clock size={16} />
                           </div>
                           <div>
                             <p className="text-sm font-bold text-gray-800">{call.duration}s Call Duration</p>
                             <p className="text-[10px] text-gray-400 font-medium">
                               {new Date(call.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                             </p>
                           </div>
                        </div>
                      ))}
                    </div>
                  </section>

                </div>
              </div>
              
              {/* Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                 <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                   End of Persistent Records • Secured by MongoDB Atlas
                 </p>
              </div>
            </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
