import React from 'react';
import { PhoneCall, Users } from 'lucide-react';

export function MetricsHeader({ leads, calls }: { leads: number; calls: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-100 flex items-center space-x-4">
        <div className="p-3 bg-daycare-orange-light rounded-xl text-daycare-orange">
          <Users size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium">Leads Captured Today</p>
          <p className="text-2xl font-bold text-gray-800">{leads}</p>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-teal-100 flex items-center space-x-4">
        <div className="p-3 bg-daycare-teal-light rounded-xl text-daycare-teal">
          <PhoneCall size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium">Calls Handled by Fawn</p>
          <p className="text-2xl font-bold text-gray-800">{calls}</p>
        </div>
      </div>
    </div>
  );
}
