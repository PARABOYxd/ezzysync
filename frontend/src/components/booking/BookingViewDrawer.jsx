import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Drawer from '../common/Drawer.jsx';
import Textarea from '../ui/Textarea.jsx';
import Input from '../ui/Input.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { TravelStatusBadge, PaymentStatusBadge } from '../common/StatusBadge.jsx';
import * as bookingService from '../../services/bookingService';
import { Phone, MessageSquare, Mail, Calendar, FileText, Lock, Plus, User, Info, IndianRupee, MapPin, Home, Tag, Download, Send, Car, Check, Loader2, Bell, AlertCircle } from 'lucide-react';
import { useToast } from '../../hooks/useToast.jsx';
import * as hotelService from '../../services/hotelService';

export default function BookingViewDrawer({ open, onClose, booking, onRefresh }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const [activityType, setActivityType] = useState('note');
  const [nextDate, setNextDate] = useState('');
  const [dateError, setDateError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hotels, setHotels] = useState([]);
  const [downloadingVoucher, setDownloadingVoucher] = useState(null);
  const [sendingVoucher, setSendingVoucher] = useState(null);
  const [sendingReminder, setSendingReminder] = useState(null);

  useEffect(() => {
    if (!open) {
      setDateError('');
      setNoteError('');
      setNextDate('');
      setNote('');
    }
  }, [open]);

  const handleSendReminder = async (type) => {
    if (!booking?.bookingId) return;
    try {
      setSendingReminder(type);
      const res = await bookingService.sendBookingReminder(booking.bookingId, {
        type,
        channel: 'both',
      });
      if (res.success && !res.skipped) {
        toast.success(
          type === 'payment'
            ? `Payment due reminder dispatched to ${booking.customerName}!`
            : `Trip departure reminder dispatched to ${booking.customerName}!`
        );
        if (onRefresh) onRefresh();
        loadLogs();
      } else if (res.skipped) {
        toast.info(res.reason || 'Reminder was already sent today.');
      } else {
        toast.error(res.whatsappError || res.emailError || 'Failed to dispatch reminder.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch reminder.');
    } finally {
      setSendingReminder(null);
    }
  };

  // The backend already normalizes every booking's hotel(s)/transport(s)
  // into these arrays on every create/update (bookingRepository's
  // normalizeHotelsStay/normalizeTransports - including folding a legacy
  // single hotelId/vehicleType booking into a one-item array), so there is
  // nothing left to derive here beyond a safe default. This used to be
  // referenced without ever being declared, so the voucher sections below
  // threw a ReferenceError on every render.
  const displayHotels = booking?.hotelsStay?.length > 0 ? booking.hotelsStay : [];
  const displayTransports = booking?.transports?.length > 0 ? booking.transports : [];

  const handleDownloadVoucher = async (type) => {
    if (!booking?.bookingId) return;
    try {
      setDownloadingVoucher(type);
      const blob = await bookingService.downloadVoucherPdf(booking.bookingId, type);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type === 'hotel' ? 'Hotel' : 'Cab'}-Voucher-${booking.bookingId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${type === 'hotel' ? 'Hotel' : 'Transport'} voucher downloaded.`);
    } catch (err) {
      toast.error('Failed to download voucher PDF.');
    } finally {
      setDownloadingVoucher(null);
    }
  };

  const handleSendVoucher = async (type) => {
    if (!booking?.bookingId) return;
    try {
      setSendingVoucher(type);
      const res = await bookingService.sendVoucherToWhatsApp(booking.bookingId, { type });
      if (res.sentToWhatsApp) {
        toast.success(`Official ${type === 'hotel' ? 'Hotel' : 'Cab'} Voucher sent to ${booking.customerName} via WhatsApp!`);
      } else {
        // The PDF exists, but the customer did not get it - saying "success"
        // here left agents believing a voucher had been delivered.
        toast.error(`Voucher PDF created but NOT sent on WhatsApp: ${res.whatsappError || 'WhatsApp is not connected.'}`);
      }
      onRefresh?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send voucher via WhatsApp.');
    } finally {
      setSendingVoucher(null);
    }
  };

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
  }, [open, booking?.bookingId, loadLogs]);

  if (!booking) return null;

  const handleAddLog = async (e) => {
    e.preventDefault();
    let hasError = false;

    if (!note.trim()) {
      setNoteError('Please enter activity summary / notes.');
      hasError = true;
    } else {
      setNoteError('');
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (nextDate && nextDate < todayStr) {
      setDateError('Next follow-up date must be today or in the future.');
      hasError = true;
    } else {
      setDateError('');
    }

    if (hasError) return;

    setDateError('');
    setNoteError('');
    setSubmitting(true);
    try {
      await bookingService.addFollowUp(booking.bookingId, {
        note: note.trim(),
        activityType,
        nextFollowUpDate: nextDate || null,
      });
      setNote('');
      setNextDate('');
      setDateError('');
      setNoteError('');
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
          {displayHotels.length > 0 && (
            <div className="space-y-4 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-200/60">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <h5 className="text-[11px] uppercase font-bold tracking-wider text-teal-800 flex items-center gap-1.5">
                  <Home size={13} className="text-teal-600" />
                  <span>Hotel Reservation Voucher{displayHotels.length > 1 ? ` (${displayHotels.length} Stays)` : ''}</span>
                </h5>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-100">
                  🏨 {displayHotels.length > 1 ? `${displayHotels.length} Hotels` : (displayHotels[0].hotelBookingStatus || 'Active')}
                </span>
              </div>

              <div className="space-y-3">
                {displayHotels.map((stay, idx) => {
                  const hotelName = hotels.find((h) => h.id === stay.hotelId)?.name || stay.hotelName || 'Linked Hotel';
                  return (
                    <div key={idx} className="bg-white/90 p-3 rounded-xl border border-slate-200/80 space-y-2.5">
                      {displayHotels.length > 1 && (
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                          <span className="text-xs font-bold text-slate-700">Stay #{idx + 1}</span>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            stay.hotelBookingStatus === 'Confirmed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : stay.hotelBookingStatus === 'Cancelled'
                              ? 'bg-red-50 text-red-700 border border-red-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {stay.hotelBookingStatus === 'Confirmed' ? '✅ Confirmed' : stay.hotelBookingStatus === 'Cancelled' ? '❌ Cancelled' : '⏳ Pending'}
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
                        <div className="col-span-2">
                          <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Hotel / Property</span>
                          <span className="font-semibold text-slate-800 text-sm">
                            {hotelName}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Room Category</span>
                          <span className="font-medium text-slate-700">{stay.roomCategory || <span className="text-slate-400 italic">Standard</span>}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Meal Plan</span>
                          <span className="font-medium text-slate-700">{stay.mealPlan || <span className="text-slate-400 italic">CP</span>}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Check-In</span>
                          <span className="font-medium text-slate-700">{formatDate(stay.hotelCheckIn || booking.departure)}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Check-Out</span>
                          <span className="font-medium text-slate-700">{formatDate(stay.hotelCheckOut)}</span>
                        </div>
                        {stay.hotelConfirmationNo && (
                          <div className="col-span-2">
                            <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Confirmation / Voucher No</span>
                            <span className="font-mono font-bold text-slate-800 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-[11px] inline-block">
                              {stay.hotelConfirmationNo}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2">
                <button
                  type="button"
                  disabled={downloadingVoucher === 'hotel'}
                  onClick={() => handleDownloadVoucher('hotel')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {downloadingVoucher === 'hotel' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} className="text-teal-600" />}
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  disabled={sendingVoucher === 'hotel'}
                  onClick={() => handleSendVoucher('hotel')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {sendingVoucher === 'hotel' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>Send to WhatsApp</span>
                </button>
              </div>
            </div>
          )}

          {/* Section 2.6: Transport & Driver Voucher */}
          {displayTransports.length > 0 && (
            <div className="space-y-4 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-200/60">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <h5 className="text-[11px] uppercase font-bold tracking-wider text-blue-800 flex items-center gap-1.5">
                  <Car size={13} className="text-blue-600" />
                  <span>Cab & Chauffeur Voucher{displayTransports.length > 1 ? ` (${displayTransports.length} Cabs)` : ''}</span>
                </h5>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                  🚗 {displayTransports.length > 1 ? `${displayTransports.length} Cabs` : 'Active'}
                </span>
              </div>

              <div className="space-y-3">
                {displayTransports.map((t, idx) => (
                  <div key={idx} className="bg-white/90 p-3 rounded-xl border border-slate-200/80 space-y-2.5">
                    {displayTransports.length > 1 && (
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-xs font-bold text-slate-700">Cab / Driver #{idx + 1}</span>
                        {t.vehicleType && (
                          <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                            {t.vehicleType} {t.vehicleNumber ? `(${t.vehicleNumber})` : ''}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-xs">
                      <div>
                        <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Vehicle Type</span>
                        <span className="font-semibold text-slate-800">{t.vehicleType || 'Assigned Cab'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Vehicle Number</span>
                        <span className="font-mono font-bold text-slate-800">{t.vehicleNumber || <span className="text-slate-400 italic font-normal">TBA</span>}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Driver Name</span>
                        <span className="font-medium text-slate-700">{t.driverName || <span className="text-slate-400 italic">TBA</span>}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Driver Contact</span>
                        <span className="font-medium text-slate-700">{t.driverPhone || <span className="text-slate-400 italic">TBA</span>}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Pickup Time</span>
                        <span className="font-medium text-slate-700">{t.pickupTime || <span className="text-slate-400 italic">As scheduled</span>}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Pickup Location</span>
                        <span className="font-medium text-slate-700 truncate">{t.pickupLocation || booking.pickup || <span className="text-slate-400 italic">-</span>}</span>
                      </div>
                      {t.dropLocation && (
                        <div className="col-span-2">
                          <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Drop / Destination</span>
                          <span className="font-medium text-slate-700">{t.dropLocation}</span>
                        </div>
                      )}
                      {t.voucherNotes && (
                        <div className="col-span-2">
                          <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Special Instructions</span>
                          <span className="text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg block text-[11px]">
                            {t.voucherNotes}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2">
                <button
                  type="button"
                  disabled={downloadingVoucher === 'cab'}
                  onClick={() => handleDownloadVoucher('cab')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {downloadingVoucher === 'cab' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} className="text-blue-600" />}
                  <span>Download Cab PDF</span>
                </button>
                <button
                  type="button"
                  disabled={sendingVoucher === 'cab'}
                  onClick={() => handleSendVoucher('cab')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {sendingVoucher === 'cab' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>Send Cab Voucher</span>
                </button>
              </div>
            </div>
          )}

          {/* Section 2.7: Automated Alerts & Reminders */}
          <div className="space-y-3 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-200/60">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <h5 className="text-[11px] uppercase font-bold tracking-wider text-slate-700 flex items-center gap-1.5">
                <Bell size={13} className="text-amber-500" />
                <span>Travel Alerts & Reminders</span>
              </h5>
              <span className="text-[10px] text-slate-400 font-semibold">
                WhatsApp & Email
              </span>
            </div>

            {/* Reminder History Badges */}
            {Array.isArray(booking.remindersSent) && booking.remindersSent.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {booking.remindersSent.slice(-4).map((r, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-2xs"
                  >
                    <span>{r.type === 'payment_due' ? '💳 Payment Due' : r.type === 'departure_1day' ? '✈️ 1-Day Alert' : '✈️ 3-Day Alert'}</span>
                    <span className="text-[9px] text-slate-400">· {formatDate(r.sentAt || r.sentDate)}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">
                No reminders sent yet. Automatic reminders run at 8:30 AM for Booked trips when switched on in Settings.
              </p>
            )}

            {/* Instant Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={sendingReminder !== null}
                onClick={() => handleSendReminder('departure')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                title="Send departure alert with cab, chauffeur and hotel details to traveler"
              >
                {sendingReminder === 'departure' ? (
                  <Loader2 size={13} className="animate-spin text-teal-600" />
                ) : (
                  <Send size={13} className="text-teal-600" />
                )}
                <span>Send Trip Alert</span>
              </button>

              <button
                type="button"
                disabled={sendingReminder !== null || Number(booking.remaining || 0) <= 0}
                onClick={() => handleSendReminder('payment')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50 ${
                  Number(booking.remaining || 0) > 0
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
                title={Number(booking.remaining || 0) > 0 ? `Send payment due alert for remaining ₹${booking.remaining}` : 'Payment fully settled'}
              >
                {sendingReminder === 'payment' ? (
                  <Loader2 size={13} className="animate-spin text-white" />
                ) : (
                  <IndianRupee size={13} />
                )}
                <span>Send Due Alert</span>
              </button>
            </div>
          </div>

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
            {booking.refundedAmount > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center justify-between text-xs">
                <span className="font-semibold text-red-700">Refunded to customer</span>
                <span className="font-extrabold text-red-700">{formatCurrency(booking.refundedAmount)}</span>
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
          <form onSubmit={handleAddLog} noValidate className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
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
                  error={noteError}
                  onChange={(e) => {
                    setNote(e.target.value);
                    if (e.target.value.trim()) setNoteError('');
                  }}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Input
                  label="Set next follow-up date"
                  type="date"
                  inputClassName="text-xs"
                  min={new Date().toISOString().split('T')[0]}
                  value={nextDate}
                  error={dateError}
                  onKeyDown={(e) => {
                    if (e.key !== 'Tab' && e.key !== 'Enter') {
                      e.preventDefault();
                    }
                  }}
                  onClick={(e) => {
                    try { e.target.showPicker?.(); } catch (_) {}
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNextDate(val);
                    const todayStr = new Date().toISOString().split('T')[0];
                    if (val && val < todayStr) {
                      setDateError('Next follow-up date must be today or a future date.');
                    } else {
                      setDateError('');
                    }
                  }}
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
