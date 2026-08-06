import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Drawer from '../common/Drawer.jsx';
import Textarea from '../ui/Textarea.jsx';
import Input from '../ui/Input.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { TravelStatusBadge, PaymentStatusBadge } from '../common/StatusBadge.jsx';
import * as bookingService from '../../services/bookingService';
import { Phone, MessageSquare, Mail, Calendar, FileText, Lock, Plus, User, Info, IndianRupee, MapPin, Home, Tag } from 'lucide-react';
import { useToast } from '../../hooks/useToast.jsx';
import * as hotelService from '../../services/hotelService';

export default function BookingViewDrawer({ open, onClose, booking, onRefresh }) {
  const toast = useToast();
  const [followUps, setFollowUps] = useState([]);
  const [note, setNote] = useState('');
  const [activityType, setActivityType] = useState('note');
  const [nextDate, setNextDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hotels, setHotels] = useState([]);

  useEffect(() => {
    if (open) {
      hotelService.getHotels().then(setHotels).catch(() => {});
    }
  }, [open]);

  const loadLogs = useCallback(async () => {
    if (!booking?.bookingId) return;
    try {
      const logs = await bookingService.getFollowUps(booking.bookingId);
      setFollowUps(logs);
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  }, [booking?.bookingId]);

  useEffect(() => {
    if (open && booking?.bookingId) {
      loadLogs();
    }
  }, [open, booking, loadLogs]);

  if (!booking) return null;

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSubmitting(true);
    try {
      await bookingService.addFollowUp(booking.bookingId, {
        note: note.trim(),
        activityType,
        nextFollowUpDate: nextDate || null,
      });
      setNote('');
      setNextDate('');
      setActivityType('note');
      toast.success('Activity logged successfully.');
      loadLogs();
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error('Failed to save follow-up activity.');
    } finally {
      setSubmitting(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'call': return <Phone size={11} className="text-blue-600" />;
      case 'whatsapp': return <MessageSquare size={11} className="text-emerald-600" />;
      case 'email': return <Mail size={11} className="text-violet-600" />;
      case 'meeting': return <Calendar size={11} className="text-amber-600" />;
      default: return <FileText size={11} className="text-slate-500" />;
    }
  };

  const getActivityBg = (type) => {
    switch (type) {
      case 'call': return 'bg-blue-50/70 border-blue-100 text-blue-700';
      case 'whatsapp': return 'bg-emerald-50/70 border-emerald-100 text-emerald-700';
      case 'email': return 'bg-violet-50/70 border-violet-100 text-violet-700';
      case 'meeting': return 'bg-amber-50/70 border-amber-100 text-amber-700';
      default: return 'bg-slate-50/70 border-slate-200/60 text-slate-700';
    }
  };

  const activityOptions = [
    { value: 'note', label: 'Note', icon: <FileText size={12} /> },
    { value: 'call', label: 'Call', icon: <Phone size={12} /> },
    { value: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare size={12} /> },
    { value: 'email', label: 'Email', icon: <Mail size={12} /> },
    { value: 'meeting', label: 'Meeting', icon: <Calendar size={12} /> },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <div className="flex flex-wrap items-center justify-between gap-x-4 w-full pr-8">
          <span>Booking Details · {booking.bookingId}</span>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-zinc-800 px-3 py-1 rounded-xl">
            Assigned: {booking.teamMember || 'Not assigned'}
          </span>
        </div>
      }
      size="xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-slate-700">
        
        {/* Left Column: Clean details pane */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex gap-2">
            <TravelStatusBadge status={booking.travelStatus} />
            <PaymentStatusBadge status={booking.paymentStatus} />
          </div>

          {/* Section 1: Customer Details */}
          <div className="space-y-4">
            <h5 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="flex items-center gap-1.5"><User size={12} /> Customer Information</span>
              {booking.customerId && (
                <Link to={`/customers/${booking.customerId}`} className="normal-case font-semibold text-brand-600 hover:underline">
                  View Customer &rarr;
                </Link>
              )}
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Full Name</span>
                <span className="font-bold text-slate-800">{booking.customerName || '-'}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Email</span>
                <span className="font-medium text-slate-600 break-all">{booking.email || '-'}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Phone</span>
                <span className="font-semibold text-slate-600">{booking.phone}</span>
              </div>
              {booking.emergencyContact && (
                <div className="col-span-3">
                  <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Emergency Contact</span>
                  <span className="font-medium text-slate-600">{booking.emergencyContact}</span>
                </div>
              )}
            </div>
          </div>
          {/* Section 2: Trip Details */}
          <div className="space-y-4">
            <h5 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <MapPin size={12} />
              <span>Trip & Travel Details</span>
            </h5>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-xs">
              <div>
                <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Trip / Destination</span>
                <span className="font-semibold text-slate-700">{booking.trip}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Departure Date</span>
                <span className="font-semibold text-slate-600">{formatDate(booking.departure)}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Group Size</span>
                <span className="font-medium text-slate-600">{booking.members} Person(s)</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Pickup Location</span>
                <span className="font-medium text-slate-600">{booking.pickup || <span className="text-slate-400 italic">-</span>}</span>
              </div>
              {booking.sourceQuotationId && (
                <div className="col-span-2">
                  <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Source Itinerary</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-[10px] font-bold">
                    🔗 {booking.sourceQuotationId}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2.5: Hotel Booking Status & Voucher */}
          {booking.hotelId && (
            <div className="space-y-4">
              <h5 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <Home size={12} />
                <span>Hotel Voucher Details</span>
              </h5>
              <div className="grid grid-cols-2 gap-y-3.5 text-xs">
                <div className="col-span-2">
                  <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Hotel / Property</span>
                  <span className="font-semibold text-slate-700">{hotels.find((h) => h.id === booking.hotelId)?.name || 'Linked Hotel'}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Room Category</span>
                  <span className="font-semibold text-slate-600">{booking.roomCategory || <span className="text-slate-400 italic">Not specified</span>}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Voucher Status</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    booking.hotelBookingStatus === 'Confirmed'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : booking.hotelBookingStatus === 'Cancelled'
                      ? 'bg-red-50 text-red-700 border border-red-100'
                      : 'bg-amber-50 text-amber-700 border border-amber-100'
                  }`}>
                    {booking.hotelBookingStatus === 'Confirmed' ? '✅ Confirmed' : booking.hotelBookingStatus === 'Cancelled' ? '❌ Cancelled' : '⏳ Pending'}
                  </span>
                </div>
                {booking.hotelConfirmationNo && (
                  <div className="col-span-2">
                    <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Confirmation Voucher No</span>
                    <span className="font-mono font-bold text-slate-800 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                      {booking.hotelConfirmationNo}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 3: Billing Info */}
          <div className="space-y-4">
            <h5 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <IndianRupee size={12} />
              <span>Financial Summary</span>
            </h5>
            <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-3.5 grid grid-cols-3 gap-3 text-center text-xs">
              <div className="border-r border-teal-100/60">
                <span className="block text-[9px] text-slate-400 uppercase font-bold mb-1">Total Bill</span>
                <span className="font-extrabold text-slate-800">{formatCurrency(booking.totalAmount)}</span>
              </div>
              <div className="border-r border-teal-100/60">
                <span className="block text-[9px] text-teal-600 uppercase font-bold mb-1">Paid</span>
                <span className="font-extrabold text-teal-700">{formatCurrency(booking.paid)}</span>
              </div>
              <div>
                <span className="block text-[9px] text-slate-400 uppercase font-bold mb-1">Pending</span>
                <span className="font-extrabold text-orange-600">{formatCurrency(booking.remaining)}</span>
              </div>
            </div>
            {(booking.pricePerPerson > 0) && (
              <div className="text-xs text-slate-500 flex items-center justify-between px-1">
                <span>₹{Number(booking.pricePerPerson || 0).toLocaleString('en-IN')} × {booking.members} traveler(s)</span>
                <span className="text-slate-400">Per person price</span>
              </div>
            )}
          </div>


          {/* Section 4: Notes */}
          {booking.notes && (
            <div className="space-y-2">
              <h5 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <FileText size={12} />
                <span>Notes & Comments</span>
              </h5>
              <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200/60 rounded-xl p-3 leading-relaxed whitespace-pre-wrap">{booking.notes}</p>
            </div>
          )}
        </div>

        {/* Right Column: High-fidelity Activity Timeline */}
        <div className="lg:col-span-7 flex flex-col space-y-5 border-l border-slate-100 pl-0 lg:pl-6">
          <div>
            <h4 className="font-extrabold text-slate-800 text-sm">Timeline & Activity Logs</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">{followUps.length} follow-up interactions recorded</p>
          </div>

          {/* Clean Activity Logger */}
          <form onSubmit={handleAddLog} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
            {/* Horizontal Radio buttons for action types */}
            <div className="space-y-1">
              <label className="block text-[10px] text-slate-400 font-bold uppercase">Log Interaction Type</label>
              <div className="flex flex-wrap gap-1.5">
                {activityOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setActivityType(opt.value)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition ${
                      activityType === opt.value
                        ? 'bg-teal-50 border-teal-200 text-teal-700 shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500'
                    }`}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <Textarea
                  inputClassName="text-xs min-h-[60px]"
                  placeholder="Type call summary, traveler response, cancellation reasons..."
                  required
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Input
                  label="Set next follow-up date"
                  type="date"
                  inputClassName="text-xs"
                  value={nextDate}
                  onChange={(e) => setNextDate(e.target.value)}
                />
              </div>
              <div className="col-span-2 sm:col-span-1 flex items-end justify-end">
                <button 
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  {submitting ? 'Saving Log...' : 'Add Log Entry'}
                </button>
              </div>
            </div>
          </form>

          {/* Timeline Feed */}
          <div className="flex-1 overflow-y-auto max-h-[300px] pr-2 space-y-4 no-scrollbar">
            {followUps.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                <Info size={20} className="text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-semibold">No activity logs recorded yet</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Use the logger to keep trace of traveler interactions.</p>
              </div>
            ) : (
              <div className="relative border-l border-slate-200/80 ml-3.5 space-y-5">
                {followUps.map((log) => (
                  <div key={log.id} className="relative pl-6">
                    {/* Compact bullet node */}
                    <div className={`absolute -left-3 top-0.5 w-6 h-6 rounded-full border flex items-center justify-center shadow-sm ${getActivityBg(log.activity_type)}`}>
                      {getActivityIcon(log.activity_type)}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                        <span>Logged by <b className="text-slate-600 font-semibold">{log.created_by || 'Agent'}</b></span>
                        <span>
                          {new Date(log.created_at).toLocaleDateString('en-IN')} &middot; {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 text-xs text-slate-600 leading-relaxed shadow-sm">
                        <p className="whitespace-pre-wrap">{log.note}</p>
                        
                        {log.next_follow_up_date && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[9px] text-teal-700 font-bold uppercase">
                            <Calendar size={11} className="text-teal-600" />
                            <span>Next Follow-up Due: {new Date(log.next_follow_up_date).toLocaleDateString('en-IN')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </Drawer>
  );
}
