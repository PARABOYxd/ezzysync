import React, { useEffect, useState } from 'react';
import Drawer from '../common/Drawer.jsx';
import Button from '../ui/Button.jsx';
import * as bookingService from '../../services/bookingService';
import * as userService from '../../services/userService';
import * as quotationService from '../../services/quotationService';
import * as hotelService from '../../services/hotelService';
import * as batchService from '../../services/batchService';
import * as expenseService from '../../services/expenseService';
import { validateBookingForm } from '../../utils/bookingFormValidation';
import { isValidEmail, isValidPhone } from '../../utils/validators';
import { useToast } from '../../hooks/useToast.jsx';
import { useAuth } from '../../hooks/useAuth.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import {
  User, MapPin, IndianRupee, Check, ChevronRight, ChevronLeft,
} from 'lucide-react';
import AiAutofillPanel from './AiAutofillPanel.jsx';
import CustomerInfoTab from './CustomerInfoTab.jsx';
import TripDetailsTab from './TripDetailsTab.jsx';
import FinancialsTab from './FinancialsTab.jsx';
import { quotationRef } from '../../utils/quotationRef';

const emptyForm = {
  customerName: '', email: '', phone: '', emergencyContact: '', trip: '', departure: '',
  pickup: '', members: 1, pricePerPerson: '', paid: 0, teamMember: '', travelStatus: 'Confirming',
  paymentStatus: 'Pending', notes: '', refundedAmount: 0,
  vendorHotelCost: 0, vendorFlightCost: 0, vendorTransportCost: 0, vendorOtherCost: 0,
  hotelId: '', roomCategory: '', hotelBookingStatus: 'Pending', hotelConfirmationNo: '', sourceQuotationId: '',
  batchId: '', costTemplateId: '',
  mealPlan: 'CP', hotelCheckIn: '', hotelCheckOut: '',
  vehicleType: '', driverName: '', driverPhone: '', vehicleNumber: '',
  pickupTime: '', pickupLocation: '', dropLocation: '', voucherNotes: '',
  transports: [],
  hotelsStay: [],
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

  // Trip name dropdown — other = manual entry
  const [tripOther, setTripOther] = useState(false);

  // Lists for dropdown selectors
  const [quotations, setQuotations] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [batches, setBatches] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showCosting, setShowCosting] = useState(false);

  useEffect(() => {
    if (open) {
      quotationService.getQuotations({ limit: 100 }).then((data) => {
        const list = data.quotations || data || [];
        setQuotations(list);
        // If editing, prefer the stored quotation reference over a name
        // match - two quotations can share a display name, and a rename
        // would otherwise silently drop an existing booking into "Other".
        if (booking?.trip) {
          const found = booking.sourceQuotationId
            ? list.find((q) => quotationRef(q) === booking.sourceQuotationId)
            : list.find((q) => (q.trip_name || q.tripName) === booking.trip);
          if (!found) setTripOther(true);
        }
      }).catch(() => { });

      hotelService.getHotels().then((data) => {
        setHotels(data || []);
      }).catch(() => { });

      batchService.getBatches().then((data) => {
        setBatches(data || []);
      }).catch(() => { });

      if (user?.role === 'ADMIN') {
        expenseService.listTemplates().then((data) => {
          setTemplates(data || []);
        }).catch(() => { });
      }
    }
  }, [open, user?.role, booking?.bookingId]);

  useEffect(() => {
    if (open) {
      const rawTransports = (Array.isArray(booking?.transports) && booking.transports.length > 0)
        ? booking.transports
        : [{
            vehicleType: booking?.vehicleType || '',
            vehicleNumber: booking?.vehicleNumber || '',
            driverName: booking?.driverName || '',
            driverPhone: booking?.driverPhone || '',
            pickupTime: booking?.pickupTime || '',
            pickupLocation: booking?.pickupLocation || booking?.pickup || '',
            dropLocation: booking?.dropLocation || '',
            voucherNotes: booking?.voucherNotes || '',
          }];

      const rawHotelsStay = (Array.isArray(booking?.hotelsStay) && booking.hotelsStay.length > 0)
        ? booking.hotelsStay
        : (booking?.hotelId ? [{
            hotelId: booking.hotelId || '',
            roomCategory: booking.roomCategory || '',
            mealPlan: booking.mealPlan || 'CP',
            hotelCheckIn: booking.hotelCheckIn ? (typeof booking.hotelCheckIn === 'string' ? booking.hotelCheckIn.slice(0, 10) : '') : '',
            hotelCheckOut: booking.hotelCheckOut ? (typeof booking.hotelCheckOut === 'string' ? booking.hotelCheckOut.slice(0, 10) : '') : '',
            hotelBookingStatus: booking.hotelBookingStatus || 'Pending',
            hotelConfirmationNo: booking.hotelConfirmationNo || '',
          }] : [{
            hotelId: '',
            roomCategory: '',
            mealPlan: 'CP',
            hotelCheckIn: '',
            hotelCheckOut: '',
            hotelBookingStatus: 'Pending',
            hotelConfirmationNo: '',
          }]);

      const initialForm = booking
        ? { ...emptyForm, ...booking, transports: rawTransports, hotelsStay: rawHotelsStay }
        : { ...emptyForm, transports: rawTransports, hotelsStay: rawHotelsStay };

      setForm(initialForm);
      setErrors({});
      setActiveTab('customer');
      setTripOther(false);

      if (booking && (
        Number(booking.vendorHotelCost) > 0 ||
        Number(booking.vendorFlightCost) > 0 ||
        Number(booking.vendorTransportCost) > 0 ||
        Number(booking.vendorOtherCost) > 0 ||
        booking.costTemplateId
      )) {
        setShowCosting(true);
      } else {
        setShowCosting(false);
      }
    }
  }, [open, booking]);

  // Fetch team members when modal opens
  useEffect(() => {
    if (open) {
      userService.getUsers().then((users) => {
        setTeamMembers(users || []);
      }).catch(() => { });
    }
  }, [open]);

  const totalAmount = Number(form.members || 0) * Number(form.pricePerPerson || 0);
  const remaining = Math.max(totalAmount - Number(form.paid || 0), 0);
  const canEditPhone = usePermission('bookings', 'editPhone');

  const set = (key) => (e) => {
    let val = e.target.value;
    if (key === 'phone' || key === 'emergencyContact') {
      val = val.replace(/[^0-9+\-\s()]/g, '');
    }

    setForm((prev) => {
      const updated = { ...prev, [key]: val };
      if (key === 'members' && prev.costTemplateId) {
        const t = templates.find((x) => x.id === prev.costTemplateId);
        if (t) {
          const pax = Number(val || 1);
          updated.vendorHotelCost = Number(t.hotel_cost_per_pax || 0) * pax;
          updated.vendorFlightCost = Number(t.flight_cost_per_pax || 0) * pax;
          updated.vendorTransportCost = Number(t.transport_cost_per_pax || 0) * pax;
          updated.vendorOtherCost = Number(t.other_cost_per_pax || 0) * pax;
        }
      }

      // Auto-calculate Payment Status
      if (key === 'paid' || key === 'pricePerPerson' || key === 'members') {
        const membersCount = Number(key === 'members' ? val : updated.members || 1);
        const priceVal = Number(key === 'pricePerPerson' ? val : updated.pricePerPerson || 0);
        const paidVal = Number(key === 'paid' ? val : updated.paid || 0);
        const calculatedTotal = priceVal * membersCount;

        if (paidVal <= 0) {
          updated.paymentStatus = 'Pending';
        } else if (paidVal >= calculatedTotal) {
          updated.paymentStatus = 'Paid';
        } else {
          updated.paymentStatus = 'Partial';
        }
      }
      return updated;
    });

    if (errors[key]) setErrors({ ...errors, [key]: '' });
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
    const validationErrors = validateBookingForm(form, { isEdit, previousStatus: booking?.travelStatus });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      // Direct user to the first tab with an error
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
      const validTransports = (form.transports || []).filter(
        (t) => t.vehicleType || t.driverName || t.vehicleNumber || t.pickupLocation || t.pickupTime || t.voucherNotes
      );
      const validHotelsStay = (form.hotelsStay || []).filter(
        (h) => h.hotelId || h.roomCategory || h.hotelConfirmationNo
      );

      const payload = {
        ...form,
        transports: validTransports,
        hotelsStay: validHotelsStay,
        // top-level backward compatibility sync
        vehicleType: validTransports[0]?.vehicleType || form.vehicleType || '',
        vehicleNumber: validTransports[0]?.vehicleNumber || form.vehicleNumber || '',
        driverName: validTransports[0]?.driverName || form.driverName || '',
        driverPhone: validTransports[0]?.driverPhone || form.driverPhone || '',
        pickupTime: validTransports[0]?.pickupTime || form.pickupTime || '',
        pickupLocation: validTransports[0]?.pickupLocation || form.pickupLocation || form.pickup || '',
        dropLocation: validTransports[0]?.dropLocation || form.dropLocation || '',
        voucherNotes: validTransports[0]?.voucherNotes || form.voucherNotes || '',
        hotelId: validHotelsStay[0]?.hotelId || form.hotelId || null,
        roomCategory: validHotelsStay[0]?.roomCategory || form.roomCategory || '',
        mealPlan: validHotelsStay[0]?.mealPlan || form.mealPlan || 'CP',
        hotelCheckIn: validHotelsStay[0]?.hotelCheckIn || form.hotelCheckIn || null,
        hotelCheckOut: validHotelsStay[0]?.hotelCheckOut || form.hotelCheckOut || null,
        hotelBookingStatus: validHotelsStay[0]?.hotelBookingStatus || form.hotelBookingStatus || 'Pending',
        hotelConfirmationNo: validHotelsStay[0]?.hotelConfirmationNo || form.hotelConfirmationNo || '',
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

  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? 'Edit Booking Deal' : 'Create New Booking Deal'}>
      <div className="space-y-6">
        {/* Floating AI Autofill Header */}
        {!isEdit && (
          <AiAutofillPanel
            user={user}
            onParsed={(result) => {
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
              // Switch to trip tab after successfully prefilling customer details
              setActiveTab('trip');
            }}
          />
        )}

        {/* Wizard Progress Tabs */}
        <div className="flex border-b border-slate-100 gap-2 p-1 bg-slate-50 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('customer')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold rounded-xl transition ${activeTab === 'customer'
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
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold rounded-xl transition ${activeTab === 'trip'
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
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold rounded-xl transition ${activeTab === 'financials'
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
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate className="space-y-6">
          {activeTab === 'customer' && (
            <CustomerInfoTab
              form={form}
              setForm={setForm}
              errors={errors}
              set={set}
              isBookedOrBeyond={isBookedOrBeyond}
              canEditPhone={canEditPhone}
              isEdit={isEdit}
            />
          )}

          {activeTab === 'trip' && (
            <TripDetailsTab
              form={form}
              setForm={setForm}
              set={set}
              errors={errors}
              setErrors={setErrors}
              isBookedOrBeyond={isBookedOrBeyond}
              tripOther={tripOther}
              setTripOther={setTripOther}
              quotations={quotations}
              hotels={hotels}
              batches={batches}
              teamMembers={teamMembers}
            />
          )}

          {activeTab === 'financials' && (
            <FinancialsTab
              form={form}
              setForm={setForm}
              set={set}
              errors={errors}
              user={user}
              showCosting={showCosting}
              setShowCosting={setShowCosting}
              templates={templates}
              totalAmount={totalAmount}
              remaining={remaining}
              bookingId={booking?.bookingId}
              isEdit={isEdit}
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
