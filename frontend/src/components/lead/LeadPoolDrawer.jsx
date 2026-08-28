import React, { useEffect, useState } from 'react';
import * as leadService from '../../services/leadService';
import { useToast } from '../../hooks/useToast.jsx';

export default function LeadPoolDrawer({ isOpen, onClose, onLeadClaimed, onPoolCountChange, poolCount }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const fetchPool = async () => {
    setLoading(true);
    try {
      const list = await leadService.getLeadPool();
      setLeads(list);
      if (onPoolCountChange) {
        onPoolCountChange(list.length);
      }
    } catch (err) {
      toast.error('Failed to load leads from pool.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPool();
    }
  }, [isOpen, poolCount]);

  const handleClaim = async (leadId) => {
    try {
      await leadService.claimLead(leadId);
      toast.success('Lead claimed successfully!');
      fetchPool();
      if (onLeadClaimed) {
        onLeadClaimed();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to claim lead.';
      toast.error(msg);
      fetchPool();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Invisible backdrop to capture outside clicks */}
      <div className="fixed inset-0 z-40 cursor-default" onClick={onClose} />

      {/* Floating Dropdown Card */}
      <div className="absolute right-0 top-full mt-2.5 z-50 w-80 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-xl flex flex-col overflow-hidden max-h-[380px] animate-[fadeIn_0.15s_ease-out]">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/80 dark:bg-zinc-900">
          <h2 className="text-xs font-bold text-slate-800 dark:text-zinc-200">New Leads Pool</h2>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-[10px] text-slate-400 hover:text-slate-500 font-semibold"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 no-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-500"></div>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No new leads in the pool.
            </div>
          ) : (
            leads.map((lead) => (
              <div 
                key={lead.leadId} 
                className="border border-slate-100 dark:border-zinc-800 rounded-xl p-3 bg-slate-50/50 dark:bg-zinc-900/50 flex items-center justify-between gap-3 hover:border-slate-200 dark:hover:border-zinc-700 transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-700 dark:text-zinc-200 text-xs truncate">
                    {lead.customerName || 'New Inquiry'}
                  </div>
                  {lead.interest && (
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium truncate mt-0.5">
                      {lead.interest}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
                    {lead.phone}
                  </div>
                  <div className="text-[9px] text-slate-400 dark:text-zinc-500 mt-0.5 font-mono">
                    {lead.createdAt ? new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleClaim(lead.leadId)}
                  className="shrink-0 px-2.5 py-1.5 text-[10px] font-bold rounded-lg text-white bg-orange-500 hover:bg-orange-600 active:scale-95 transition"
                >
                  Claim
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
