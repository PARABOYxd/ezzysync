import React, { useEffect, useState } from 'react';
import Drawer from '../common/Drawer.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Textarea from '../ui/Textarea.jsx';
import FormRow from '../ui/FormRow.jsx';
import Button from '../ui/Button.jsx';
import { isValidEmail, isValidPhone } from '../../utils/validators';
import { formatCurrency } from '../../utils/formatters';
import * as bookingService from '../../services/bookingService';
import * as userService from '../../services/userService';
import * as quotationService from '../../services/quotationService';
import * as hotelService from '../../services/hotelService';
import * as batchService from '../../services/batchService';
import { useToast } from '../../hooks/useToast.jsx';
import { useAuth } from '../../hooks/useAuth.jsx';
import {
  User, Mail, Phone, ShieldAlert, MapPin, Calendar, Navigation,
  Users, UserCheck, IndianRupee, CreditCard, Home, Plane, Car,
  Tag, Sparkles, Check, ChevronRight, ChevronLeft, ArrowRight
} from 'lucide-react';

const TRAVEL_STATUSES = ['New', 'Confirming', 'Booked', 'Completed', 'Cancelled', 'Refunded', 'Postponed'];
const PAYMENT_STATUSES = ['Pending', 'Partial', 'Paid'];

const STATUS_HINTS = {
  New: 'Fresh lead - initial inquiry received',
  Confirming: 'In discussions - awaiting final confirmation from customer',
  Booked: 'Confirmed booking - all details verified and payment received',
  Completed: 'Trip successfully completed',
  Cancelled: 'Booking cancelled by customer or agency',
  Refunded: 'Payment refunded to customer',
  Postponed: 'Trip postponed to a later date',
};

const emptyForm = {
  customerName: '', email: '', phone: '', emergencyContact: '', trip: '', departure: '',
  pickup: '', members: 1, pricePerPerson: '', paid: 0, teamMember: '', travelStatus: 'New',
  paymentStatus: 'Pending', notes: '',
  vendorHotelCost: 0, vendorFlightCost: 0, vendorTransportCost: 0, vendorOtherCost: 0,
  hotelId: '', roomCategory: '', hotelBookingStatus: 'Pending', hotelConfirmationNo: '', sourceQuotationId: '',
  batchId: '',
};

export default function BookingFormDrawer({ open, onClose, onSaved, booking }) {
  const { user } = useAuth();
  const isEdit = !!booking;
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('customer'); // 'customer', 'trip', 'financials'
  const toast = useToast();

  // Team members state
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamMemberOther, setTeamMemberOther] = useState(false);
  const [teamMemberCustom, setTeamMemberCustom] = useState('');

  // Trip name dropdown — other = manual entry
  const [tripOther, setTripOther] = useState(false);

  const [aiText, setAiText] = useState('');
  const [aiFile, setAiFile] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAi, setShowAi] = useState(false);

  // Lists for dropdown selectors
  const [quotations, setQuotations] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    if (open) {
      quotationService.getQuotations({ limit: 100 }).then((data) => {
        const list = data.quotations || data || [];
        setQuotations(list);
        // If editing and trip doesn't match any itinerary name, pre-set Other
        if (booking?.trip) {
          const found = list.find((q) => (q.trip_name || q.tripName) === booking.trip);
          if (!found) setTripOther(true);
        }
      }).catch(() => {});

      hotelService.getHotels().then((data) => {
        setHotels(data || []);
      }).catch(() => {});

      batchService.getBatches().then((data) => {
        setBatches(data || []);
      }).catch(() => {});
    }
  }, [open]);

  const handleQuotationChange = (id) => {
    if (!id) {
      setForm((prev) => ({ ...prev, sourceQuotationId: '' }));
      return;
    }
    const q = quotations.find((x) => x.quotation_id === id || x.id === id);
    if (q) {
      setForm((prev) => ({
        ...prev,
        sourceQuotationId: q.quotation_id,
        customerName: q.customer_name || prev.customerName,
        email: q.email || prev.email,
        phone: q.phone || prev.phone,
        trip: q.trip_name || prev.trip,
        pricePerPerson: q.price_quote || prev.pricePerPerson,
      }));
      toast.success('Itinerary details successfully pre-filled!');
    }
  };

  const handleAiParse = async () => {
    if (!aiText && !aiFile) {
      toast.error('Please enter text or upload a PDF ticket first.');
      return;
    }
    setAiLoading(true);
    try {
      let result;
      if (aiFile) {
        const formData = new FormData();
        formData.append('file', aiFile);
        result = await bookingService.parseTicket(formData, true);
      } else {
        result = await bookingService.parseTicket({ text: aiText }, false);
      }

      setForm((prev) => ({
        ...prev,
        customerName: result.customerName || prev.customerName,
        email: result.email || prev.email,
        phone: result.phone || prev.phone,
        emergencyContact: result.emergencyContact || prev.emergencyContact,
        trip: result.trip || prev.trip,
        departure: result.departure ? result.departure.slice(0, 10) : prev.departure,
        pickup: result.pickup || prev.pickup,
        members: result.members || prev.members,
        pricePerPerson: result.pricePerPerson || prev.pricePerPerson,
        paid: result.paid || prev.paid,
        notes: result.notes || prev.notes,
      }));

      toast.success('Successfully parsed details and pre-filled form!');
      setShowAi(false);
      setAiText('');
      setAiFile(null);
      // Switch to trip tab after successfully prefilling customer details
      setActiveTab('trip');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to parse ticket with AI.');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      const initialForm = booking ? { ...emptyForm, ...booking } : emptyForm;
      setForm(initialForm);
      setErrors({});
      setActiveTab('customer');
      setShowAi(false);
      setTripOther(false);
      // Check if existing booking has a custom team member (not in list)
      if (booking?.teamMember && booking.teamMember !== '') {
        // Will be resolved after team members load
        setTeamMemberCustom(booking.teamMember);
      } else {
        setTeamMemberCustom('');
      }
      setTeamMemberOther(false);
    }
  }, [open, booking]);

  // Fetch team members when modal opens
  useEffect(() => {
    if (open) {
      userService.getUsers().then((users) => {
        setTeamMembers(users || []);
        // If editing and the teamMember doesn't match any user name, set to 'Other'
        if (booking?.teamMember) {
          const found = (users || []).find(u => u.name === booking.teamMember);
          if (!found && booking.teamMember !== '') {
            setTeamMemberOther(true);
            setTeamMemberCustom(booking.teamMember);
          }
        }
      }).catch(() => {});
    }
  }, [open]);

  const totalAmount = Number(form.members || 0) * Number(form.pricePerPerson || 0);
  const remaining = Math.max(totalAmount - Number(form.paid || 0), 0);
  const canEditPhone = user?.role === 'ADMIN' || user?.permissions?.canEditMobileNumber === true;

  const set = (key) => (e) => {
    let val = e.target.value;
    if (key === 'phone' || key === 'emergencyContact') {
      val = val.replace(/[^0-9+\-\s()]/g, '');
    }
    setForm({ ...form, [key]: val });
    if (errors[key]) setErrors({ ...errors, [key]: '' });
  };

  // A batch groups bookings that share one fixed departure - linking one
  // pins trip/departure to the batch's values so the roster can't drift out
  // of sync. Picking "No Batch Linked" just unlocks them again.
  const handleBatchChange = (e) => {
    const bId = e.target.value;
    if (!bId) {
      setForm((prev) => ({ ...prev, batchId: '' }));
      return;
    }
    const b = batches.find((x) => x.id === bId);
    if (!b) return;
    setTripOther(false);
    setForm((prev) => ({ ...prev, batchId: bId, trip: b.tripName, departure: b.departureDate }));
    setErrors((prev) => ({ ...prev, trip: '', departure: '' }));
  };

  const validate = () => {
    const e = {};
    const status = form.travelStatus;
    const isBookedOrBeyond = ['Booked', 'Completed', 'Refunded'].includes(status);
    const previousStatus = booking?.travelStatus;

    // Phone is always required
    if (!isValidPhone(form.phone)) e.phone = 'Contact number is required.';

    // When status is Booked, all key fields become required
    if (isBookedOrBeyond) {
      if (!form.customerName) e.customerName = 'Required when status is Booked+';
      if (!isValidEmail(form.email)) e.email = 'Required when status is Booked+';
      if (!form.trip) e.trip = 'Required when status is Booked+';
      if (!form.departure) e.departure = 'Required when status is Booked+';
      if (!form.members || Number(form.members) < 1) e.members = 'At least 1 member required.';
      if (form.pricePerPerson === '' || Number(form.pricePerPerson) < 0) e.pricePerPerson = 'Required when status is Booked+';
    }

    // Completed/Refunded can only be set if previous status was Booked
    if (isEdit && (status === 'Completed' || status === 'Refunded')) {
      if (previousStatus && previousStatus !== 'Booked' && previousStatus !== 'Completed' && previousStatus !== 'Refunded') {
        e.travelStatus = `Cannot mark as ${status} unless the booking was first Booked. Current status: ${previousStatus}`;
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (e.target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      if (activeTab === 'customer') {
        setActiveTab('trip');
      } else if (activeTab === 'trip') {
        setActiveTab('financials');
      }
    }
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (activeTab !== 'financials') {
      if (activeTab === 'customer') {
        setActiveTab('trip');
      } else if (activeTab === 'trip') {
        setActiveTab('financials');
      }
      return;
    }
    if (!validate()) {
      // Direct user to the first tab with an error
      const e = {};
      if (!form.customerName || !isValidEmail(form.email) || !isValidPhone(form.phone)) {
        setActiveTab('customer');
      } else if (!form.trip || !form.departure || !form.members) {
        setActiveTab('trip');
      } else {
        setActiveTab('financials');
      }
      toast.error('Please fix validation errors on the form before saving.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        members: Number(form.members),
        pricePerPerson: Number(form.pricePerPerson),
        paid: Number(form.paid || 0),
        vendorHotelCost: Number(form.vendorHotelCost || 0),
        vendorFlightCost: Number(form.vendorFlightCost || 0),
        vendorTransportCost: Number(form.vendorTransportCost || 0),
        vendorOtherCost: Number(form.vendorOtherCost || 0),
      };
      if (isEdit) {
        await bookingService.updateBooking(booking.bookingId, payload);
        toast.success('Booking updated.');
      } else {
        await bookingService.createBooking(payload);
        toast.success('Booking created.');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save booking.');
    } finally {
      setSaving(false);
    }
  };

  // Helper validation status checks for Tab headers
  const isCustomerTabValid = isValidPhone(form.phone);
  const isTripTabValid = form.trip && form.departure && Number(form.members) >= 1;
  const isFinancialsTabValid = form.pricePerPerson !== '' && Number(form.pricePerPerson) >= 0;

  // Resolved team member value
  const isBookedOrBeyond = ['Booked', 'Completed', 'Refunded'].includes(form.travelStatus);
  const resolvedTeamMember = teamMemberOther ? teamMemberCustom : form.teamMember;

  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? 'Edit Booking Deal' : 'Create New Booking Deal'}>
      <div className="space-y-6">
        {/* Floating AI Autofill Header */}
        {!isEdit && (
          <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-4 shadow-sm transition hover:shadow-md">
            <button
              type="button"
              onClick={() => setShowAi(!showAi)}
              className="flex items-center justify-between w-full text-left font-semibold text-slate-800 text-sm focus:outline-none"
            >
              <span className="flex items-center gap-2 text-violet-700">
                <Sparkles size={16} className="animate-pulse" />
                <span>AI Magic: Autofill from ticket PDFs or chat copy</span>
              </span>
              <span className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded-lg text-xs font-semibold">
                {showAi ? 'Hide Assistant' : 'Try Now'}
              </span>
            </button>
            
            {showAi && (
              user?.planId === 'FREE' ? (
                <div className="pt-3 mt-3 border-t border-violet-100/60 text-center py-4 space-y-2">
                  <p className="text-xs text-slate-500 font-semibold">✨ AI Autofill is a Premium Feature</p>
                  <p className="text-[10px] text-slate-400">Upgrade to Pro in the AI Tools page to unlock parsing.</p>
                </div>
              ) : (
                <div className="space-y-3 pt-3 mt-3 border-t border-violet-100/60 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Paste Raw Itinerary / Confirmation Copy</label>
                      <textarea
                        placeholder="Paste WhatsApp confirmation messages, flight/hotel confirmation mail copies, or ticket summaries here..."
                        className="input w-full text-xs bg-white focus:ring-violet-400 border-violet-200"
                        rows={3}
                        value={aiText}
                        onChange={(e) => {
                          setAiText(e.target.value);
                          if (e.target.value) setAiFile(null);
                        }}
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Or Upload PDF Ticket File</label>
                      <div className="border-2 border-dashed border-violet-200 rounded-xl p-3 bg-white flex flex-col items-center justify-center min-h-[90px] transition hover:border-violet-400">
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setAiFile(file);
                              setAiText('');
                            }
                          }}
                          className="hidden"
                          id="ai-file-upload"
                        />
                        <label htmlFor="ai-file-upload" className="cursor-pointer text-center text-slate-500 w-full hover:text-slate-700">
                          <span className="block font-medium mb-1">📁 {aiFile ? aiFile.name : 'Select PDF file'}</span>
                          <span className="text-[10px] text-slate-400">Max size 10MB</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-1 border-t border-violet-100/40">
                    <button
                      type="button"
                      disabled={aiLoading}
                      onClick={handleAiParse}
                      className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {aiLoading ? 'Analyzing details...' : 'Autofill Form fields'}
                      {!aiLoading && <ArrowRight size={13} />}
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* Wizard Progress Tabs */}
        <div className="flex border-b border-slate-100 gap-2 p-1 bg-slate-50 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('customer')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold rounded-xl transition ${
              activeTab === 'customer'
                ? 'bg-white text-brand-600 shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <User size={14} className={activeTab === 'customer' ? 'text-brand-500' : 'text-slate-400'} />
            <span className="hidden sm:inline">1. Customer Info</span>
            {isCustomerTabValid && <Check size={14} className="text-emerald-500 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('trip')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold rounded-xl transition ${
              activeTab === 'trip'
                ? 'bg-white text-brand-600 shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <MapPin size={14} className={activeTab === 'trip' ? 'text-brand-500' : 'text-slate-400'} />
            <span className="hidden sm:inline">2. Trip Details</span>
            {isTripTabValid && <Check size={14} className="text-emerald-500 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('financials')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold rounded-xl transition ${
              activeTab === 'financials'
                ? 'bg-white text-brand-600 shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <IndianRupee size={14} className={activeTab === 'financials' ? 'text-brand-500' : 'text-slate-400'} />
            <span className="hidden sm:inline">3. Pricing & P&L</span>
            {isFinancialsTabValid && <Check size={14} className="text-emerald-500 ml-0.5" />}
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">
          {/* TAB 1: CUSTOMER INFO */}
          {activeTab === 'customer' && (
            <div className="animate-[fadeIn_0.2s_ease-out] space-y-5">
              {!isEdit && quotations.length > 0 && (
                <div className="bg-brand-50/50 p-4 rounded-xl border border-brand-100 flex flex-col gap-2">
                  <label className="text-xs font-bold text-brand-800 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-brand-600" /> Link Approved Itinerary (Optional)
                  </label>
                  <select
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none focus:border-brand-500 font-medium text-slate-700"
                    value={form.sourceQuotationId || ''}
                    onChange={(e) => handleQuotationChange(e.target.value)}
                  >
                    <option value="">-- No Itinerary Link (Create Fresh Booking) --</option>
                    {quotations.map((q) => (
                      <option key={q.id || q.quotation_id} value={q.quotation_id}>
                        {q.quotation_id} - {q.customer_name} ({q.trip_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <FormRow>
                <Input
                  label="Customer Name"
                  icon={User}
                  error={errors.customerName}
                  required={isBookedOrBeyond}
                  hint="Main contact passenger name"
                  placeholder="e.g. Rahul Kumar"
                  value={form.customerName}
                  onChange={set('customerName')}
                />
                <Input
                  label="Email Address"
                  icon={Mail}
                  type="email"
                  error={errors.email}
                  required={isBookedOrBeyond}
                  hint="Receipts & vouchers will be sent here"
                  placeholder="e.g. rahul@gmail.com"
                  value={form.email}
                  onChange={set('email')}
                />
              </FormRow>
              <FormRow className="mt-5">
                <Input
                  label="Contact Number"
                  icon={Phone}
                  error={errors.phone}
                  required
                  hint="Include country code for WhatsApp updates"
                  placeholder="e.g. +919876543210"
                  value={form.phone}
                  onChange={set('phone')}
                  disabled={isEdit && !canEditPhone}
                />
                <Input
                  label="Emergency Contact (Optional)"
                  icon={ShieldAlert}
                  hint="Alternative contact number"
                  placeholder="e.g. +919999988888"
                  value={form.emergencyContact}
                  onChange={set('emergencyContact')}
                />
              </FormRow>
            </div>
          )}

          {/* TAB 2: TRIP DETAILS */}
          {activeTab === 'trip' && (
            <div className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
              <FormRow>
                <Select
                  label="Tour Batch / Group (Optional)"
                  icon={Users}
                  hint="Linking a batch locks trip & departure date to match it"
                  value={form.batchId || ''}
                  onChange={handleBatchChange}
                  options={[
                    { value: '', label: '-- No Batch Linked --' },
                    ...batches.map((b) => ({ value: b.id, label: `${b.name} (${b.confirmedSeats}/${b.totalCapacity} filled)` }))
                  ]}
                />
                <Input
                  label="Pickup Location (Optional)"
                  icon={Navigation}
                  hint="Specific pickup spot details"
                  placeholder="e.g. IGI Airport Terminal 3"
                  value={form.pickup}
                  onChange={set('pickup')}
                />
              </FormRow>
              <FormRow>
                <div className="w-full space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Trip / Destination Name {isBookedOrBeyond && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    disabled={!!form.batchId}
                    className={`w-full text-sm bg-white border rounded-xl px-3 py-2.5 outline-none focus:border-brand-500 font-medium text-slate-700 transition disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${errors.trip ? 'border-red-400' : 'border-slate-200'}`}
                    value={tripOther ? '__other__' : (form.trip || '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__other__') {
                        setTripOther(true);
                        setForm({ ...form, trip: '' });
                      } else {
                        setTripOther(false);
                        setForm({ ...form, trip: val });
                        if (errors.trip) setErrors({ ...errors, trip: '' });
                      }
                    }}
                  >
                    <option value="">-- Select an itinerary --</option>
                    {quotations.map((q) => {
                      const name = q.trip_name || q.tripName || '';
                      return name ? <option key={q.quotation_id || q.id} value={name}>{name}</option> : null;
                    })}
                    <option value="__other__">✏️ Other (type manually)</option>
                  </select>
                  {tripOther && (
                    <Input
                      icon={MapPin}
                      disabled={!!form.batchId}
                      error={errors.trip}
                      placeholder="e.g. Himachal Valley Luxury Tour"
                      hint="Target tour package name"
                      value={form.trip}
                      onChange={set('trip')}
                    />
                  )}
                  {errors.trip && !tripOther && (
                    <p className="text-xs text-red-500 mt-0.5">{errors.trip}</p>
                  )}
                  {!!form.batchId && (
                    <p className="text-[10px] text-slate-400">Locked to the linked batch's itinerary. Unlink the batch above to edit.</p>
                  )}
                </div>
                <Input
                  label="Departure Date"
                  icon={Calendar}
                  type="date"
                  disabled={!!form.batchId}
                  error={errors.departure}
                  required={isBookedOrBeyond}
                  hint={form.batchId ? "Locked to the linked batch's departure date" : 'Travel starting date'}
                  value={form.departure?.slice(0, 10) || ''}
                  onChange={set('departure')}
                />
              </FormRow>

              {/* Hotels Selection and Voucher Status */}
              <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100 space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Home size={13} /> Hotel Voucher & Reservations
                </h4>
                <FormRow>
                  <Select
                    label="Select Hotel"
                    icon={Home}
                    value={form.hotelId || ''}
                    onChange={(e) => {
                      const hId = e.target.value;
                      setForm({ ...form, hotelId: hId, roomCategory: '' });
                    }}
                    options={[
                      { value: '', label: '-- No Hotel Linked --' },
                      ...hotels.map((h) => ({ value: h.id, label: `${h.name} (${h.city})` }))
                    ]}
                  />
                  <Select
                    label="Room Category"
                    icon={Home}
                    value={form.roomCategory || ''}
                    disabled={!form.hotelId}
                    onChange={set('roomCategory')}
                    options={[
                      { value: '', label: '-- Select Room Category --' },
                      ...(hotels.find((h) => h.id === form.hotelId)?.rooms_and_rates || []).map((r) => ({
                        value: r.roomType,
                        label: `${r.roomType} (₹${r.sellingPrice}/night)`
                      }))
                    ]}
                  />
                </FormRow>
                {form.hotelId && (
                  <FormRow>
                    <Select
                      label="Hotel Booking Status"
                      icon={Check}
                      value={form.hotelBookingStatus || 'Pending'}
                      onChange={set('hotelBookingStatus')}
                      options={[
                        { value: 'Pending', label: '⏳ Pending Confirmation' },
                        { value: 'Confirmed', label: '✅ Confirmed' },
                        { value: 'Cancelled', label: '❌ Cancelled' },
                      ]}
                    />
                    <Input
                      label="Confirmation Voucher No"
                      icon={Tag}
                      placeholder="e.g. HTL-CONF-90812"
                      value={form.hotelConfirmationNo || ''}
                      onChange={set('hotelConfirmationNo')}
                    />
                  </FormRow>
                )}
              </div>

              <FormRow>
                <div className="w-full">
                  <Select
                    label="Assigned Team Member"
                    icon={UserCheck}
                    hint="Agent managing this booking lead"
                    value={teamMemberOther ? '__other__' : (form.teamMember || '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__other__') {
                        setTeamMemberOther(true);
                        setForm({ ...form, teamMember: teamMemberCustom });
                      } else {
                        setTeamMemberOther(false);
                        setTeamMemberCustom('');
                        setForm({ ...form, teamMember: val });
                      }
                    }}
                    options={[
                      { value: '', label: '-- Not Assigned --' },
                      ...teamMembers.map((m) => ({ value: m.name, label: `${m.name} (${m.role})` })),
                      { value: '__other__', label: 'Other (Type name manually)' },
                    ]}
                  />
                  {teamMemberOther && (
                    <Input
                      className="mt-2"
                      placeholder="e.g. Amit Sharma (external agent)"
                      value={teamMemberCustom}
                      onChange={(e) => {
                        setTeamMemberCustom(e.target.value);
                        setForm({ ...form, teamMember: e.target.value });
                      }}
                    />
                  )}
                </div>
              </FormRow>
              <FormRow>
                <Input
                  label="Number of Travelers"
                  icon={Users}
                  type="number"
                  min={1}
                  error={errors.members}
                  required={isBookedOrBeyond}
                  hint="Total count of passengers"
                  placeholder="e.g. 4"
                  value={form.members}
                  onChange={set('members')}
                />
                <Select
                  label="Travel Status"
                  required
                  hint={STATUS_HINTS[form.travelStatus] || 'Current travel operations stage'}
                  error={errors.travelStatus}
                  value={form.travelStatus}
                  onChange={set('travelStatus')}
                  options={TRAVEL_STATUSES}
                />
              </FormRow>
            </div>
          )}

          {/* TAB 3: FINANCIALS & P&L LEDGER */}
          {activeTab === 'financials' && (
            <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
              <FormRow className="sm:grid-cols-3">
                <Input
                  label="Price Per Person (₹)"
                  icon={IndianRupee}
                  type="number"
                  min={0}
                  error={errors.pricePerPerson}
                  required={isBookedOrBeyond}
                  hint="Cost per single traveler"
                  placeholder="e.g. 15000"
                  value={form.pricePerPerson}
                  onChange={set('pricePerPerson')}
                />
                <Input
                  label="Amount Paid (₹)"
                  icon={CreditCard}
                  type="number"
                  min={0}
                  hint="Advance payment received"
                  placeholder="e.g. 5000"
                  value={form.paid}
                  onChange={set('paid')}
                />
                <Select
                  label="Payment Status"
                  required
                  hint="Invoice collection status"
                  value={form.paymentStatus}
                  onChange={set('paymentStatus')}
                  options={PAYMENT_STATUSES}
                />
              </FormRow>

              {/* B2B Supplier Cost Section */}
              <div className="bg-slate-50/50 dark:bg-zinc-950/30 border border-slate-100 dark:border-zinc-800 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-zinc-800 pb-2">
                  <h4 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">B2B Supplier Costs (P&L Ledger)</h4>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500">Values are subtracted from revenue to yield Net Profit</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Input label="Hotel Cost (₹)" icon={Home} type="number" min={0} hint="Supplier accommodation" placeholder="e.g. 12000" inputClassName="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800" value={form.vendorHotelCost || ''} onChange={set('vendorHotelCost')} />
                  <Input label="Flight Cost (₹)" icon={Plane} type="number" min={0} hint="Supplier airfare charges" placeholder="e.g. 15000" inputClassName="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800" value={form.vendorFlightCost || ''} onChange={set('vendorFlightCost')} />
                  <Input label="Transport Cost (₹)" icon={Car} type="number" min={0} hint="Supplier taxi/bus fees" placeholder="e.g. 5000" inputClassName="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800" value={form.vendorTransportCost || ''} onChange={set('vendorTransportCost')} />
                  <Input label="Other Cost (₹)" icon={Tag} type="number" min={0} hint="Visa/misc supplier fees" placeholder="e.g. 2000" inputClassName="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800" value={form.vendorOtherCost || ''} onChange={set('vendorOtherCost')} />
                </div>
              </div>

              {/* Advanced Live Financial Statement */}
              {(() => {
                const totalCost = Number(form.vendorHotelCost || 0) +
                                  Number(form.vendorFlightCost || 0) +
                                  Number(form.vendorTransportCost || 0) +
                                  Number(form.vendorOtherCost || 0);
                const projectedProfit = totalAmount - totalCost;
                const isPositive = projectedProfit >= 0;
                
                return (
                  <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                    isPositive 
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40 shadow-emerald-50/30' 
                      : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-900/40 shadow-rose-50/30'
                  } shadow-md`}>
                    <div className="grid grid-cols-3 text-center divide-x divide-slate-200/50 dark:divide-zinc-800">
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">Gross Revenue</span>
                        <b className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{formatCurrency(totalAmount)}</b>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">Total Supplier Cost</span>
                        <b className="text-sm font-extrabold text-slate-700 dark:text-slate-300">{formatCurrency(totalCost)}</b>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">Net Profit (P&L)</span>
                        <b className={`text-sm font-extrabold transition-colors duration-200 ${isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                          {formatCurrency(projectedProfit)}
                        </b>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-zinc-500 border-t border-slate-200/30 dark:border-zinc-800 mt-3 pt-2">
                      <span>Pending balance for traveler collection: <b className="text-orange-600 dark:text-orange-400 font-bold">{formatCurrency(remaining)}</b></span>
                      <span className={`font-semibold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isPositive ? '✓ Positive Margin Deal' : '⚠️ Negative Margin Warning'}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Notes field: Always visible below or under trip tab */}
          {activeTab !== 'financials' && (
            <Textarea
              label="General Notes / History log"
              hint="Traveler special requests or conversation timeline notes"
              rows={2}
              placeholder="e.g. Requesting vegetarian meals, ground floor rooms, check callback after 2 days..."
              value={form.notes}
              onChange={set('notes')}
            />
          )}

          {activeTab === 'financials' && (
            <Textarea
              label="Final Summary Notes / Log Description"
              hint="Comments regarding this payment state or package setup"
              rows={2}
              placeholder="e.g. Package discount approved by admin. Advance collection cleared..."
              value={form.notes}
              onChange={set('notes')}
            />
          )}

          {/* Wizard Footer Controls */}
          <div className="flex justify-between items-center pt-5 border-t border-slate-200">
            <div>
              {activeTab !== 'customer' ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveTab(activeTab === 'financials' ? 'trip' : 'customer')}
                  className="text-xs gap-1"
                >
                  <ChevronLeft size={14} />
                  <span>Back</span>
                </Button>
              ) : (
                <span className="text-xs text-slate-500 font-medium">Fields with * are mandatory</span>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>

              {activeTab !== 'financials' ? (
                <Button
                  key="btn-continue"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveTab(activeTab === 'customer' ? 'trip' : 'financials');
                  }}
                  className="text-xs gap-1.5"
                >
                  <span>Continue</span>
                  <ChevronRight size={14} />
                </Button>
              ) : (
                <Button
                  key="btn-submit"
                  type="submit"
                  disabled={saving}
                  className="text-xs gap-1.5"
                >
                  {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Deal'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </Drawer>
  );
}
