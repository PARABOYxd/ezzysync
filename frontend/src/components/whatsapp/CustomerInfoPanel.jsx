import React from 'react';
import { Briefcase, Calendar, Paperclip, FileText, Loader2, CalendarPlus, X } from 'lucide-react';
import { mediaTypeOf, mediaNameOf } from '../../utils/whatsappMessageFormatters';

export default function CustomerInfoPanel({ selectedChat, chatMediaFiles, sendingVoucherType, onSendVoucher, sendingReminderType, onSendReminder, onViewMedia, onCreateBooking, creatingBooking, onCreateLead, creatingLead, onClose }) {
  return (
    <div className="w-full md:w-72 h-full border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 overflow-y-auto shrink-0 space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Customer 360°</h4>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close panel"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
          <p className="font-bold text-sm text-slate-900 dark:text-white">{selectedChat.customer_name || 'Guest'}</p>
          <p className="text-xs text-slate-500 mt-0.5">+{selectedChat.phone}</p>
        </div>
      </div>

      {/* Lead Card */}
      {selectedChat.formatted_lead_id ? (
        <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              {selectedChat.formatted_lead_id}
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-200/60 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
              {selectedChat.lead_stage || 'New'}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <strong>Interest:</strong> {selectedChat.lead_interest || 'Inquiry'}
          </p>
          {selectedChat.lead_notes && (
            <p className="text-[11px] text-slate-500 mt-1 italic">"{selectedChat.lead_notes}"</p>
          )}
          {!selectedChat.booking_trip && (
            <button
              type="button"
              disabled={creatingBooking}
              onClick={onCreateBooking}
              className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
              title="Convert this lead straight into a booking, pre-filled from what's already known"
            >
              {creatingBooking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarPlus className="w-3.5 h-3.5" />}
              <span>Create Booking</span>
            </button>
          )}
        </div>
      ) : (
        <div className="p-3.5 rounded-xl border border-dashed border-amber-300 dark:border-amber-700/60 bg-amber-50/40 dark:bg-amber-950/20 text-center space-y-2">
          <p className="text-xs text-slate-500">No CRM Lead linked yet.</p>
          {onCreateLead && (
            <button
              type="button"
              disabled={creatingLead}
              onClick={onCreateLead}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {creatingLead ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Briefcase className="w-3.5 h-3.5" />}
              <span>Create CRM Lead</span>
            </button>
          )}
        </div>
      )}

      {/* Active Booking Card */}
      {selectedChat.booking_trip ? (
        <div className="p-3.5 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {selectedChat.booking_trip}
            </span>
            {selectedChat.formatted_booking_id && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700">
                {selectedChat.formatted_booking_id}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 flex justify-between">
            <span>Total: ₹{Number(selectedChat.total_amount || 0).toLocaleString('en-IN')}</span>
            <span className="text-rose-600 font-medium">Pending: ₹{Number(selectedChat.remaining || 0).toLocaleString('en-IN')}</span>
          </div>

          {/* Multi-item count badges if present */}
          {(Array.isArray(selectedChat.booking_hotels_stay) && selectedChat.booking_hotels_stay.length > 1) || (Array.isArray(selectedChat.booking_transports) && selectedChat.booking_transports.length > 1) ? (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {Array.isArray(selectedChat.booking_hotels_stay) && selectedChat.booking_hotels_stay.length > 1 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-100/80 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200">
                  🏨 {selectedChat.booking_hotels_stay.length} Hotels
                </span>
              )}
              {Array.isArray(selectedChat.booking_transports) && selectedChat.booking_transports.length > 1 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100/80 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                  🚗 {selectedChat.booking_transports.length} Cabs
                </span>
              )}
            </div>
          ) : null}

          {/* 1-Click WhatsApp Voucher Actions */}
          <div className="pt-2 border-t border-teal-200/60 dark:border-teal-800/60 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={sendingVoucherType !== null}
              onClick={() => onSendVoucher('hotel')}
              className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold shadow-sm transition disabled:opacity-50"
              title="Generate branded Hotel Voucher PDF & send directly to this chat"
            >
              {sendingVoucherType === 'hotel' ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <span>🏨 Hotel Voucher{Array.isArray(selectedChat.booking_hotels_stay) && selectedChat.booking_hotels_stay.length > 1 ? ` (${selectedChat.booking_hotels_stay.length})` : ''}</span>
              )}
            </button>
            <button
              type="button"
              disabled={sendingVoucherType !== null}
              onClick={() => onSendVoucher('cab')}
              className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold shadow-sm transition disabled:opacity-50"
              title="Generate branded Cab/Transport Voucher PDF & send directly to this chat"
            >
              {sendingVoucherType === 'cab' ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <span>🚗 Cab Voucher{Array.isArray(selectedChat.booking_transports) && selectedChat.booking_transports.length > 1 ? ` (${selectedChat.booking_transports.length})` : ''}</span>
              )}
            </button>
          </div>

          {/* 1-Click WhatsApp Reminders (Departure & Payment Due) */}
          <div className="pt-1.5 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={sendingReminderType !== null}
              onClick={() => onSendReminder('departure')}
              className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[10px] font-bold shadow-2xs transition disabled:opacity-50"
              title="Send departure briefing & travel alert directly to this chat"
            >
              {sendingReminderType === 'departure' ? (
                <Loader2 className="w-3 h-3 animate-spin text-teal-600" />
              ) : (
                <span>✈️ Trip Alert</span>
              )}
            </button>
            <button
              type="button"
              disabled={sendingReminderType !== null || Number(selectedChat.remaining || 0) <= 0}
              onClick={() => onSendReminder('payment')}
              className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[10px] font-bold shadow-2xs transition disabled:opacity-50 ${
                Number(selectedChat.remaining || 0) > 0
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700'
              }`}
              title={Number(selectedChat.remaining || 0) > 0 ? `Send pending payment alert for ₹${Number(selectedChat.remaining).toLocaleString('en-IN')}` : 'No balance due'}
            >
              {sendingReminderType === 'payment' ? (
                <Loader2 className="w-3 h-3 animate-spin text-white" />
              ) : (
                <span>💳 Due Alert</span>
              )}
            </button>
          </div>
        </div>
      ) : null}

      {/* Documents & Media Vault */}
      <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5" />
            <span>Media & Docs</span>
          </h4>
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {chatMediaFiles.length}
          </span>
        </div>

        {chatMediaFiles.length === 0 ? (
          <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
            <p className="text-[11px] text-slate-400">No media or documents shared yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
            {chatMediaFiles.map((m) => {
              const isImg = m.message_type === 'image' || mediaTypeOf(m).startsWith('image/');
              return (
                <button
                  key={m.id || m.message_id}
                  type="button"
                  onClick={() => onViewMedia(m)}
                  className="group relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:opacity-90 transition-opacity"
                  title={mediaNameOf(m)}
                >
                  {isImg ? (
                    <img
                      src={m.media_url}
                      alt={mediaNameOf(m)}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-1 text-slate-500 hover:text-emerald-600">
                      <FileText className="w-5 h-5 mb-0.5 text-rose-500" />
                      <span className="text-[8px] truncate w-full text-center px-0.5 font-medium">{mediaNameOf(m)}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
