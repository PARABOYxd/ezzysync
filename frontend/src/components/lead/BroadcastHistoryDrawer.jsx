import React, { useEffect, useState } from 'react';
import { History, ChevronLeft, CheckCircle2, XCircle, Clock, MessageCircleReply } from 'lucide-react';
import Drawer from '../common/Drawer.jsx';
import * as leadService from '../../services/leadService';
import { formatDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast.jsx';

const DELIVERY_LABELS = {
  read: { label: 'Read', className: 'text-emerald-600' },
  delivered: { label: 'Delivered', className: 'text-blue-600' },
  sent: { label: 'Sent', className: 'text-slate-500' },
  pending: { label: 'Pending', className: 'text-amber-600' },
  failed: { label: 'Failed', className: 'text-rose-600' },
};

export default function BroadcastHistoryDrawer({ open, onClose }) {
  const toast = useToast();
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setDetail(null);
    setLoading(true);
    leadService.getBroadcastHistory()
      .then(setBroadcasts)
      .catch(() => toast.error('Could not load broadcast history.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const openDetail = (b) => {
    setSelected(b);
    setLoadingDetail(true);
    leadService.getBroadcastDetail(b.id)
      .then(setDetail)
      .catch(() => toast.error('Could not load this broadcast.'))
      .finally(() => setLoadingDetail(false));
  };

  return (
    <Drawer open={open} onClose={onClose} title={selected ? 'Broadcast Details' : 'Broadcast History'} size="lg">
      {selected ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => { setSelected(null); setDetail(null); }}
            className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            <ChevronLeft size={14} /> Back to history
          </button>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
            <p className="text-sm font-bold text-slate-800">{selected.template_name || 'Broadcast'}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Sent by {selected.sent_by || 'someone'} &middot; {formatDate(selected.created_at)} &middot;{' '}
              {selected.sent_count}/{selected.requested_count} sent
            </p>
          </div>

          {loadingDetail ? (
            <p className="text-xs text-slate-400 text-center py-8">Loading...</p>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              <ul className="divide-y divide-slate-100">
                {(detail?.recipients || []).map((r) => {
                  const delivery = DELIVERY_LABELS[r.delivery_status] || null;
                  return (
                    <li key={r.id} className="flex items-center justify-between p-3 text-xs gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-700 truncate">{r.customer_name || r.phone}</p>
                        <p className="text-slate-400">{r.phone}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {r.replied && (
                          <span className="flex items-center gap-1 text-brand-600 font-semibold" title="Customer replied">
                            <MessageCircleReply size={13} /> Replied
                          </span>
                        )}
                        {!r.sent ? (
                          <span className="flex items-center gap-1 text-rose-600 font-semibold" title={r.error}>
                            <XCircle size={13} /> Failed
                          </span>
                        ) : delivery ? (
                          <span className={`flex items-center gap-1 font-semibold ${delivery.className}`}>
                            <CheckCircle2 size={13} /> {delivery.label}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-400 font-semibold">
                            <Clock size={13} /> Sent
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {loading ? (
            <p className="text-xs text-slate-400 text-center py-8">Loading...</p>
          ) : broadcasts.length === 0 ? (
            <div className="text-center py-12">
              <History size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No broadcasts sent yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {broadcasts.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => openDetail(b)}
                    className="w-full flex items-center justify-between p-3.5 text-left hover:bg-slate-50 transition"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{b.template_name || 'Broadcast'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {b.sent_by || 'someone'} &middot; {formatDate(b.created_at)}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-600 shrink-0 ml-3">
                      {b.sent_count}/{b.requested_count}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Drawer>
  );
}
