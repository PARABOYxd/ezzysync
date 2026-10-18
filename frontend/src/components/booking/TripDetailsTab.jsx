import React from 'react';
import {
  MapPin, Calendar, Navigation, Users, UserCheck, IndianRupee,
  Home, Car, Plus, Trash2,
} from 'lucide-react';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import FormRow from '../ui/FormRow.jsx';
import { quotationRef } from '../../utils/quotationRef';

const TRAVEL_STATUSES = ['Confirming', 'Booked', 'Completed', 'Cancelled', 'Refunded'];

const STATUS_HINTS = {
  Confirming: 'In discussions - awaiting final confirmation from customer',
  Booked: 'Confirmed booking - all details verified and payment received',
  Completed: 'Trip successfully completed',
  Cancelled: 'Booking cancelled by customer or agency',
  Refunded: 'Cancelled and the collected amount has been returned to the customer',
};

export default function TripDetailsTab({
  form,
  setForm,
  set,
  errors,
  setErrors,
  isBookedOrBeyond,
  tripOther,
  setTripOther,
  quotations,
  hotels,
  batches,
  teamMembers,
}) {
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
    setForm((prev) => ({ ...prev, batchId: bId, trip: b.tripName, departure: b.departureDate, sourceQuotationId: '' }));
    setErrors((prev) => ({ ...prev, trip: '', departure: '' }));
  };

  const addTransportLeg = () => {
    setForm((prev) => ({
      ...prev,
      transports: [
        ...(prev.transports || []),
        {
          vehicleType: '',
          vehicleNumber: '',
          driverName: '',
          driverPhone: '',
          pickupTime: '',
          pickupLocation: prev.pickup || '',
          dropLocation: '',
          voucherNotes: '',
        },
      ],
    }));
  };

  const removeTransportLeg = (index) => {
    setForm((prev) => {
      const next = (prev.transports || []).filter((_, i) => i !== index);
      return { ...prev, transports: next.length > 0 ? next : [{ vehicleType: '', vehicleNumber: '', driverName: '', driverPhone: '', pickupTime: '', pickupLocation: '', dropLocation: '', voucherNotes: '' }] };
    });
  };

  const updateTransportLeg = (index, field, value) => {
    setForm((prev) => {
      const next = (prev.transports || []).map((item, i) => i === index ? { ...item, [field]: value } : item);
      return { ...prev, transports: next };
    });
  };

  const addHotelStay = () => {
    setForm((prev) => ({
      ...prev,
      hotelsStay: [
        ...(prev.hotelsStay || []),
        {
          hotelId: '',
          roomCategory: '',
          mealPlan: 'CP',
          hotelCheckIn: '',
          hotelCheckOut: '',
          hotelBookingStatus: 'Pending',
          hotelConfirmationNo: '',
        },
      ],
    }));
  };

  const removeHotelStay = (index) => {
    setForm((prev) => {
      const next = (prev.hotelsStay || []).filter((_, i) => i !== index);
      return { ...prev, hotelsStay: next.length > 0 ? next : [{ hotelId: '', roomCategory: '', mealPlan: 'CP', hotelCheckIn: '', hotelCheckOut: '', hotelBookingStatus: 'Pending', hotelConfirmationNo: '' }] };
    });
  };

  const updateHotelStay = (index, field, value) => {
    setForm((prev) => {
      const next = (prev.hotelsStay || []).map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        if (field === 'hotelId') {
          updated.roomCategory = '';
        }
        return updated;
      });
      return { ...prev, hotelsStay: next };
    });
  };

  // The quotation this trip is linked to, if any - its configured pickup
  // points (each with its own price) are what the Pickup field below offers,
  // instead of always being free text disconnected from what was quoted.
  // Prefers the stored reference captured when the dropdown was used, since
  // two quotations can share a display name and a rename shouldn't break
  // an existing link; falls back to a name match only for older bookings
  // saved before that reference existed.
  const matchedQuotation = form.sourceQuotationId
    ? quotations.find((q) => quotationRef(q) === form.sourceQuotationId)
    : quotations.find((q) => {
        const name = q.trip_name || q.tripName || '';
        return name && form.trip && name.toLowerCase() === form.trip.toLowerCase();
      });
  const pickupOptions = matchedQuotation?.pickupOptions || [];
  const pickupIsCustom = pickupOptions.length > 0 && !!form.pickup &&
    !pickupOptions.some((p) => p.location === form.pickup);

  return (
    <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
      {/* Tour Batch / Group Selector */}
      <FormRow>
        <div className="w-full">
          <Select
            label="Tour Batches"
            icon={Users}
            hint="Linking a batch locks trip & departure date to match it"
            value={form.batchId || ''}
            onChange={handleBatchChange}
            options={[
              { value: '', label: 'Select batch' },
              ...batches.map((b) => ({ value: b.id, label: `${b.name} (${b.confirmedSeats}/${b.totalCapacity} filled)` }))
            ]}
          />
        </div>
      </FormRow>

      {/* Row 1: Trip Name & No of Travelers */}
      <FormRow>
        <div className="w-full space-y-1.5">
          <Select
            label="Trip Name"
            required={isBookedOrBeyond}
            disabled={!!form.batchId}
            value={tripOther ? '__other__' : (form.trip || '')}
            error={errors.trip && !tripOther ? errors.trip : ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '__other__') {
                setTripOther(true);
                setForm({ ...form, trip: '', sourceQuotationId: '' });
              } else {
                setTripOther(false);
                const selected = quotations.find((q) => (q.trip_name || q.tripName || '') === val);
                setForm({ ...form, trip: val, sourceQuotationId: quotationRef(selected) });
                if (errors.trip) setErrors({ ...errors, trip: '' });
              }
            }}
            options={[
              { value: '', label: 'Select an itinerary' },
              ...quotations.map((q) => {
                const name = q.trip_name || q.tripName || '';
                return { value: name, label: name };
              }).filter((o) => o.value),
              { value: '__other__', label: 'Other (Custom Itinerary)' }
            ]}
          />
          {tripOther && (
            <Input
              icon={MapPin}
              disabled={!!form.batchId}
              error={errors.trip}
              placeholder="e.g. Himachal Valley Luxury Tour"
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
          label="No of Travelers"
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
      </FormRow>

      {/* Row 2: Pickup Location & Departure Date */}
      <FormRow>
        {pickupOptions.length > 0 ? (
          <div className="w-full space-y-1.5">
            <Select
              label="Pickup Location"
              value={pickupIsCustom ? '__other__' : (form.pickup || '')}
              onChange={(e) => {
                const val = e.target.value;
                setForm({ ...form, pickup: val === '__other__' ? '' : val });
              }}
              options={[
                { value: '', label: 'Select pickup point' },
                ...pickupOptions.map((p) => ({ value: p.location, label: `${p.location} (₹${p.price})` })),
                { value: '__other__', label: 'Other (Custom Location)' }
              ]}
            />
            {pickupIsCustom && (
              <Input
                icon={Navigation}
                placeholder="e.g. IGI Airport Terminal 3"
                value={form.pickup}
                onChange={set('pickup')}
              />
            )}
            <p className="text-[10px] text-slate-400">From the pickup points configured on this quotation.</p>
          </div>
        ) : (
          <Input
            label="Pickup Location"
            icon={Navigation}
            hint="Specific pickup spot details"
            placeholder="e.g. IGI Airport Terminal 3"
            value={form.pickup}
            onChange={set('pickup')}
          />
        )}
        <Input
          label="Departure Date"
          icon={Calendar}
          type="date"
          min={new Date().toISOString().split('T')[0]}
          disabled={!!form.batchId}
          error={errors.departure}
          required={isBookedOrBeyond}
          hint={form.batchId ? "Locked to the linked batch's departure date" : 'Travel starting date'}
          value={form.departure?.slice(0, 10) || ''}
          onKeyDown={(e) => {
            if (e.key !== 'Tab' && e.key !== 'Enter') {
              e.preventDefault();
            }
          }}
          onClick={(e) => {
            try { e.target.showPicker?.(); } catch (_) {}
          }}
          onChange={(e) => {
            set('departure')(e);
            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            if (e.target.value && e.target.value < today) {
              setErrors((prev) => ({ ...prev, departure: 'Departure date must be today or a future date.' }));
            } else {
              setErrors((prev) => ({ ...prev, departure: '' }));
            }
          }}
        />
      </FormRow>

      {/* Hotel Stays & Accommodations Repeater */}
      <div className="pt-2 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home size={15} className="text-teal-600" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Hotel Stays & Accommodations (Optional)
            </span>
          </div>
          <button
            type="button"
            onClick={addHotelStay}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-lg transition shadow-sm"
          >
            <Plus size={12} />
            <span>Add Hotel Stay</span>
          </button>
        </div>

        {(!form.hotelsStay || form.hotelsStay.length === 0) ? (
          <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
            <p className="text-xs text-slate-500">No hotel stays added yet.</p>
            <button
              type="button"
              onClick={addHotelStay}
              className="mt-1.5 text-xs text-teal-600 font-bold hover:underline"
            >
              + Add Hotel Stay
            </button>
          </div>
        ) : (
          form.hotelsStay.map((stay, idx) => (
            <div key={idx} className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/70 space-y-3 relative">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span>🏨 Stay #{idx + 1}</span>
                  {stay.hotelConfirmationNo && (
                    <span className="text-[10px] font-mono font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
                      {stay.hotelConfirmationNo}
                    </span>
                  )}
                </span>
                {form.hotelsStay.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeHotelStay(idx)}
                    className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 transition"
                    title="Remove this hotel stay"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              <FormRow>
                <div className="w-full">
                  <Select
                    label="Hotel / Property"
                    icon={Home}
                    value={stay.hotelId || ''}
                    onChange={(e) => updateHotelStay(idx, 'hotelId', e.target.value)}
                    options={[
                      { value: '', label: '-- No hotel linked --' },
                      ...hotels.map((h) => ({ value: h.id, label: `${h.name}${h.city ? ` - ${h.city}` : ''}` })),
                    ]}
                  />
                </div>
                <div className="w-full">
                  <Select
                    label="Room Category"
                    disabled={!stay.hotelId}
                    hint={stay.hotelId ? 'Room type for this stay' : 'Select a hotel first'}
                    value={stay.roomCategory || ''}
                    onChange={(e) => updateHotelStay(idx, 'roomCategory', e.target.value)}
                    options={[
                      { value: '', label: 'Select room type' },
                      ...(hotels.find((h) => h.id === stay.hotelId)?.rooms_and_rates || [])
                        .filter((r) => r.roomType)
                        .map((r) => ({ value: r.roomType, label: r.roomType })),
                    ]}
                  />
                </div>
              </FormRow>

              <FormRow>
                <Select
                  label="Booking Status"
                  value={stay.hotelBookingStatus || 'Pending'}
                  onChange={(e) => updateHotelStay(idx, 'hotelBookingStatus', e.target.value)}
                  options={['Pending', 'Confirmed', 'Cancelled']}
                />
                <Input
                  label="Confirmation / Voucher No"
                  placeholder="e.g. Hotel's booking reference"
                  value={stay.hotelConfirmationNo || ''}
                  onChange={(e) => updateHotelStay(idx, 'hotelConfirmationNo', e.target.value)}
                />
              </FormRow>

              <FormRow>
                <Select
                  label="Meal Plan"
                  value={stay.mealPlan || 'CP'}
                  onChange={(e) => updateHotelStay(idx, 'mealPlan', e.target.value)}
                  options={[
                    { value: 'EP', label: 'EP (European Plan - Room Only)' },
                    { value: 'CP', label: 'CP (Continental Plan - Breakfast Included)' },
                    { value: 'MAP', label: 'MAP (Modified American - Breakfast + Dinner)' },
                    { value: 'AP', label: 'AP (American Plan - All Meals Included)' },
                  ]}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Check-In Date"
                    type="date"
                    value={stay.hotelCheckIn?.slice(0, 10) || ''}
                    onChange={(e) => updateHotelStay(idx, 'hotelCheckIn', e.target.value)}
                  />
                  <Input
                    label="Check-Out Date"
                    type="date"
                    value={stay.hotelCheckOut?.slice(0, 10) || ''}
                    onChange={(e) => updateHotelStay(idx, 'hotelCheckOut', e.target.value)}
                  />
                </div>
              </FormRow>
            </div>
          ))
        )}
      </div>

      {/* Row 3: Sharing Type & Travel Status */}
      <FormRow>
        <Select
          label="Sharing Type"
          icon={Users}
          value={form.sharingType || 'Double'}
          onChange={set('sharingType')}
          options={[
            { value: 'Double', label: 'Double Sharing' },
            { value: 'Triple', label: 'Triple Sharing' },
            { value: 'Quad', label: 'Quad Sharing' },
            { value: 'Other', label: 'Other' },
          ]}
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

      {(form.travelStatus === 'Cancelled' || form.travelStatus === 'Refunded') && (
        <FormRow>
          <Input
            label="Amount Refunded (₹)"
            icon={IndianRupee}
            type="number"
            min={0}
            max={form.paid || 0}
            hint={`Up to ₹${form.paid || 0} collected on this booking. Leave 0 if nothing has been returned yet.`}
            value={form.refundedAmount || 0}
            onChange={set('refundedAmount')}
          />
        </FormRow>
      )}

      {/* Row 4: Assigned Team Member - picked from real accounts only, so
          assignment always matches a name that Team management, reassignment,
          and per-agent scoping can actually resolve. */}
      <FormRow>
        <div className="w-full">
          <Select
            label="Assigned Team Member"
            icon={UserCheck}
            hint="Agent managing this booking lead"
            value={form.teamMember || ''}
            onChange={(e) => setForm({ ...form, teamMember: e.target.value })}
            options={[
              { value: '', label: '-- Not Assigned --' },
              ...teamMembers.map((m) => ({ value: m.name, label: `${m.name} (${m.role})` })),
            ]}
          />
        </div>
      </FormRow>

      {/* Transport & Chauffeur Voucher Details */}
      <div className="pt-3 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car size={15} className="text-teal-600" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Transport, Vehicles & Drivers (Optional)
            </span>
          </div>
          <button
            type="button"
            onClick={addTransportLeg}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-lg transition shadow-sm"
          >
            <Plus size={12} />
            <span>Add Cab / Driver</span>
          </button>
        </div>

        {(!form.transports || form.transports.length === 0) ? (
          <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
            <p className="text-xs text-slate-500">No transport/cab details added yet.</p>
            <button
              type="button"
              onClick={addTransportLeg}
              className="mt-1.5 text-xs text-teal-600 font-bold hover:underline"
            >
              + Add Vehicle / Driver
            </button>
          </div>
        ) : (
          form.transports.map((transport, idx) => (
            <div key={idx} className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/70 space-y-3 relative">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span>🚗 Cab / Driver #{idx + 1}</span>
                  {transport.vehicleType && (
                    <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
                      {transport.vehicleType} {transport.vehicleNumber ? `(${transport.vehicleNumber})` : ''}
                    </span>
                  )}
                </span>
                {form.transports.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTransportLeg(idx)}
                    className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 transition"
                    title="Remove this vehicle"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              <FormRow>
                <Input
                  label="Vehicle Type / Model"
                  placeholder="e.g. Innova Crysta, Dzire, Tempo 17-str"
                  value={transport.vehicleType || ''}
                  onChange={(e) => updateTransportLeg(idx, 'vehicleType', e.target.value)}
                />
                <Input
                  label="Vehicle Number"
                  placeholder="e.g. DL 01 AB 1234"
                  value={transport.vehicleNumber || ''}
                  onChange={(e) => updateTransportLeg(idx, 'vehicleNumber', e.target.value)}
                />
              </FormRow>

              <FormRow>
                <Input
                  label="Driver Name"
                  placeholder="e.g. Rajesh Kumar"
                  value={transport.driverName || ''}
                  onChange={(e) => updateTransportLeg(idx, 'driverName', e.target.value)}
                />
                <Input
                  label="Driver Phone"
                  placeholder="e.g. +91 9876543210"
                  value={transport.driverPhone || ''}
                  onChange={(e) => updateTransportLeg(idx, 'driverPhone', e.target.value)}
                />
              </FormRow>

              <FormRow>
                <Input
                  label="Pickup Time"
                  placeholder="e.g. 06:00 AM / Flight UK-812 arrival"
                  value={transport.pickupTime || ''}
                  onChange={(e) => updateTransportLeg(idx, 'pickupTime', e.target.value)}
                />
                <Input
                  label="Pickup Spot / Location"
                  placeholder="e.g. Delhi Airport T3 Arrival Gate 4"
                  value={transport.pickupLocation || ''}
                  onChange={(e) => updateTransportLeg(idx, 'pickupLocation', e.target.value)}
                />
              </FormRow>

              <FormRow>
                <Input
                  label="Drop Location"
                  placeholder="e.g. Hotel Grand / Rishikesh Campsite"
                  value={transport.dropLocation || ''}
                  onChange={(e) => updateTransportLeg(idx, 'dropLocation', e.target.value)}
                />
                <Input
                  label="Voucher Notes / Instructions"
                  placeholder="e.g. Toll & Parking included, AC on hills"
                  value={transport.voucherNotes || ''}
                  onChange={(e) => updateTransportLeg(idx, 'voucherNotes', e.target.value)}
                />
              </FormRow>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
