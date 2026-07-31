import React, { useEffect, useState } from 'react';
import { Plus, Search, Building2, MapPin, Phone, Trash2, Edit2, Star, StarOff, DollarSign, X } from 'lucide-react';
import * as hotelService from '../services/hotelService';
import { useToast } from '../hooks/useToast.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import Button from '../components/ui/Button.jsx';

export default function Hotels() {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Modal form states
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [rating, setRating] = useState('3 Star');
  const [address, setAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [rooms, setRooms] = useState([{ roomType: '', costPrice: '', sellingPrice: '' }]);
  
  const toast = useToast();

  const load = () => {
    setLoading(true);
    hotelService.getHotels(search)
      .then(setHotels)
      .catch(() => toast.error('Could not load hotels.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setCity('');
    setRating('3 Star');
    setAddress('');
    setContactPerson('');
    setContactPhone('');
    setRooms([{ roomType: '', costPrice: '', sellingPrice: '' }]);
    setModalOpen(true);
  };

  const openEditModal = (h) => {
    setEditingId(h.id);
    setName(h.name);
    setCity(h.city);
    setRating(h.rating);
    setAddress(h.address);
    setContactPerson(h.contact_person);
    setContactPhone(h.contact_phone);
    setRooms(h.rooms_and_rates?.length ? h.rooms_and_rates : [{ roomType: '', costPrice: '', sellingPrice: '' }]);
    setModalOpen(true);
  };

  const addRoomRow = () => {
    setRooms([...rooms, { roomType: '', costPrice: '', sellingPrice: '' }]);
  };

  const removeRoomRow = (idx) => {
    setRooms(rooms.filter((_, i) => i !== idx));
  };

  const handleRoomChange = (idx, field, value) => {
    const next = [...rooms];
    next[idx][field] = value;
    setRooms(next);
  };

  const handleDelete = async (id, hotelName) => {
    if (!window.confirm(`Are you sure you want to delete ${hotelName} from inventory?`)) return;
    try {
      await hotelService.deleteHotel(id);
      toast.success('Property deleted successfully.');
      setHotels(hotels.filter((h) => h.id !== id));
    } catch {
      toast.error('Could not delete property.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !city.trim()) {
      toast.error('Name and City are required fields.');
      return;
    }

    const payload = {
      name,
      city,
      rating,
      address,
      contactPerson,
      contactPhone,
      roomsAndRates: rooms.filter((r) => r.roomType.trim() !== '')
    };

    try {
      if (editingId) {
        await hotelService.updateHotel(editingId, payload);
        toast.success('Property updated successfully.');
      } else {
        await hotelService.createHotel(payload);
        toast.success('Property created successfully.');
      }
      setModalOpen(false);
      load();
    } catch {
      toast.error('Could not save property credentials.');
    }
  };

  const renderStars = (starStr) => {
    const num = parseInt(starStr?.[0]) || 3;
    return (
      <div className="flex gap-0.5 text-amber-400">
        {Array.from({ length: 5 }).map((_, i) => (
          i < num ? <Star key={i} size={12} fill="currentColor" /> : <StarOff key={i} size={12} className="text-slate-200" />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <Input
            icon={Search}
            placeholder="Search by hotel or city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={openAddModal}>
          <Plus size={16} /> Add Property
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-64 rounded-2xl" />
          ))}
        </div>
      ) : hotels.length === 0 ? (
        <div className="card text-center py-16 max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Building2 size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">No properties in inventory</h3>
            <p className="text-xs text-slate-400 mt-1">Get started by creating your partner hotel properties and tariff rules.</p>
          </div>
          <button className="btn-primary mx-auto" onClick={openAddModal}>
            <Plus size={16} /> Add First Property
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hotels.map((h) => (
            <div key={h.id} className="card flex flex-col justify-between hover:shadow-md transition duration-200">
              <div className="space-y-3.5">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800 text-[15px]">{h.name}</h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><MapPin size={12} /> {h.city}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {renderStars(h.rating)}
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold uppercase tracking-wider">{h.rating || '3 Star'}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-500 space-y-1 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  {h.address && <p className="leading-relaxed"><strong>Addr:</strong> {h.address}</p>}
                  {h.contact_person && <p><strong>Contact:</strong> {h.contact_person} {h.contact_phone && `(${h.contact_phone})`}</p>}
                </div>

                {h.rooms_and_rates?.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Room Rates (Per Night)</h5>
                    <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-slate-600 bg-white">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] text-slate-400 text-left uppercase border-b border-slate-100 font-bold">
                            <th className="py-1.5 px-3">Room Type</th>
                            <th className="py-1.5 px-3 text-right">B2B Cost</th>
                            <th className="py-1.5 px-3 text-right">Selling</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {h.rooms_and_rates.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50/30">
                              <td className="py-1.5 px-3 font-medium text-slate-700">{r.roomType}</td>
                              <td className="py-1.5 px-3 text-right font-mono text-slate-500">₹{r.costPrice}</td>
                              <td className="py-1.5 px-3 text-right font-mono text-brand-600 font-semibold">₹{r.sellingPrice}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-50 pt-3.5 mt-4">
                <button
                  onClick={() => openEditModal(h)}
                  className="p-2 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition"
                  title="Edit Property"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  onClick={() => handleDelete(h.id, h.name)}
                  className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                  title="Delete Property"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-[16px]">{editingId ? 'Edit Property details' : 'Add New Property'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Hotel / Property Name *"
                  placeholder="e.g. Radisson Blu Resort"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  label="City *"
                  placeholder="e.g. Manali"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
                <Select
                  label="Rating Categories"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  options={[
                    { value: '3 Star', label: '3 Star Standard' },
                    { value: '4 Star', label: '4 Star Deluxe' },
                    { value: '5 Star', label: '5 Star Luxury' },
                    { value: 'Budget', label: 'Budget/Homestay' },
                  ]}
                />
                <Input
                  label="Office Address"
                  placeholder="e.g. Near Mall Road, Manali"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
                <Input
                  label="Contact Person Name"
                  placeholder="e.g. Sunil Sharma"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                />
                <Input
                  label="Contact Phone"
                  placeholder="e.g. +91 98123 45678"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>

              {/* Room and Rates management */}
              <div className="space-y-3.5 border-t border-slate-100 pt-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Room categories & tariff rates</h4>
                  <button type="button" onClick={addRoomRow} className="btn-secondary py-1 px-3 text-xs gap-1">
                    <Plus size={12} /> Add Room Type
                  </button>
                </div>

                <div className="space-y-2.5">
                  {rooms.map((room, idx) => (
                    <div key={idx} className="flex gap-3 items-end">
                      <div className="flex-1">
                        {idx === 0 && <label className="label">Room Category Type</label>}
                        <Input
                          placeholder="e.g. Deluxe Room"
                          value={room.roomType}
                          onChange={(e) => handleRoomChange(idx, 'roomType', e.target.value)}
                        />
                      </div>
                      <div className="w-28 sm:w-36">
                        {idx === 0 && <label className="label">B2B Cost Price (INR)</label>}
                        <Input
                          placeholder="Cost ₹"
                          type="number"
                          value={room.costPrice}
                          onChange={(e) => handleRoomChange(idx, 'costPrice', e.target.value)}
                        />
                      </div>
                      <div className="w-28 sm:w-36">
                        {idx === 0 && <label className="label">Selling Price (INR)</label>}
                        <Input
                          placeholder="Sell ₹"
                          type="number"
                          value={room.sellingPrice}
                          onChange={(e) => handleRoomChange(idx, 'sellingPrice', e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRoomRow(idx)}
                        disabled={rooms.length === 1}
                        className="p-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition mb-0.5 disabled:opacity-50"
                        title="Remove category"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingId ? 'Save details' : 'Add Property'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
