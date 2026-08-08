import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, Bot, FileCheck, ArrowRight, Star, ShieldAlert, Lock } from 'lucide-react';
import { useToast } from '../hooks/useToast.jsx';
import api from '../services/api';
import * as bookingService from '../services/bookingService';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import * as whatsappService from '../services/whatsappService';
import { useAuth } from '../hooks/useAuth.jsx';

export default function AITools() {
  const toast = useToast();
  const { user, loginWithToken } = useAuth();
  const [bookings, setBookings] = useState([]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgradePlan = async () => {
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Failed to load payment gateway. Please check your internet connection.');
        return;
      }

      const res = await api.post('/payments/create-subscription-order');
      const order = res.data;

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'EzzySync Premium',
        description: 'Unlock AI Travel Tools',
        order_id: order.id,
        handler: async function (response) {
          try {
            const verifyRes = await api.post('/payments/verify-subscription', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.data.success) {
              await loginWithToken(verifyRes.data.token);
              toast.success('Congratulations! Your plan has been upgraded to PRO. AI Tools are now fully unlocked!');
            }
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment verification failed.');
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#0f766e',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error('Could not initiate subscription payment.');
    }
  };
  
  // 1-Click Itinerary Generator states
  const [tripName, setTripName] = useState('');
  const [days, setDays] = useState('3');
  const [itineraryNotes, setItineraryNotes] = useState('');
  const [generatedItinerary, setGeneratedItinerary] = useState('');
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // WhatsApp Simulator states
  const [selectedBooking, setSelectedBooking] = useState('');
  const [phone, setPhone] = useState('');
  const [customerMessage, setCustomerMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    // Load bookings to populate WhatsApp Simulator dropdown
    bookingService.getBookings()
      .then((res) => setBookings(res.bookings || []))
      .catch(() => toast.error('Could not load bookings list.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBookingChange = (e) => {
    const val = e.target.value;
    setSelectedBooking(val);
    if (val) {
      const match = bookings.find((b) => b.bookingId === val);
      if (match) {
        setPhone(match.phone);
      }
    } else {
      setPhone('');
    }
  };

  const handleGenerateItinerary = async (e) => {
    e.preventDefault();
    if (!tripName || !days) return;
    setItineraryLoading(true);
    setGeneratedItinerary('');
    try {
      const response = await api.post('/ai/generate-itinerary', {
        tripName,
        days: Number(days),
        notes: itineraryNotes,
      });
      setGeneratedItinerary(response.data.itinerary);
      toast.success('Itinerary generated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate itinerary.');
    } finally {
      setItineraryLoading(false);
    }
  };

  const handleDownloadItinerary = async () => {
    if (!generatedItinerary || !tripName) return;
    setDownloading(true);
    try {
      const response = await api.post('/ai/download-itinerary', {
        tripName,
        itineraryText: generatedItinerary,
      }, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const safeName = tripName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      link.setAttribute('download', `Itinerary-${safeName}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('PDF Itinerary downloaded successfully!');
    } catch (err) {
      toast.error('Failed to download PDF itinerary.');
    } finally {
      setDownloading(false);
    }
  };

  const handleSendWhatsApp = async (bookingId, text) => {
    try {
      await whatsappService.sendWhatsApp(bookingId, null, text);
      toast.success("Message sent to client's real WhatsApp successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send WhatsApp message. Verify Meta API configuration in .env.');
    }
  };

  const handleSendMockMessage = async (e) => {
    e.preventDefault();
    if (!phone || !customerMessage) return;

    const userMsg = { sender: 'customer', text: customerMessage, timestamp: new Date().toLocaleTimeString() };
    setChatLog((prev) => [...prev, userMsg]);
    setChatLoading(true);
    const msgToSend = customerMessage;
    setCustomerMessage('');

    try {
      const response = await api.post('/ai/whatsapp-reply', {
        phone,
        message: msgToSend,
      });

      const aiMsg = {
        sender: 'ai',
        text: response.data.reply,
        timestamp: new Date().toLocaleTimeString(),
        booking: response.data.matchedBooking,
      };
      setChatLog((prev) => [...prev, aiMsg]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate auto-reply.');
    } finally {
      setChatLoading(false);
    }
  };

  const clearChat = () => {
    setChatLog([]);
  };

  function renderMarkdown(md) {
    if (!md) return null;
    return md.split('\n').map((line, idx) => {
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="font-bold text-slate-800 text-sm mt-3 mb-1">{line.slice(4)}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} className="font-bold text-slate-800 text-base mt-4 mb-1.5">{line.slice(3)}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={idx} className="font-extrabold text-slate-900 text-lg mt-5 mb-2">{line.slice(2)}</h2>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={idx} className="list-disc ml-5 text-slate-600 text-xs my-0.5">{line.slice(2)}</li>;
      }
      if (line.trim() === '') return <div key={idx} className="h-2"></div>;
      
      // Basic bold regex handler for **text**
      const parts = line.split(/\*\*([^*]+)\*\*/g);
      if (parts.length > 1) {
        return (
          <p key={idx} className="text-slate-600 text-xs leading-relaxed my-1">
            {parts.map((p, i) => i % 2 === 1 ? <strong key={i} className="font-semibold text-slate-800">{p}</strong> : p)}
          </p>
        );
      }

      return <p key={idx} className="text-slate-600 text-xs leading-relaxed my-1">{line}</p>;
    });
  }

  return (
    <div className="max-w-5xl space-y-8 pb-10">
      {/* Premium Hero Header */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col justify-center space-y-3">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800 dark:text-zinc-100">
          Supercharge Your Travel Agency with Generative AI
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 leading-relaxed max-w-2xl">
          Automate daily tasks, respond to customer queries in seconds, score leads, and generate personalized travel itineraries automatically.
        </p>
      </div>

      {/* Main Tools Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Tool 1: 1-Click Itinerary Generator */}
        <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm flex flex-col justify-between space-y-4 overflow-hidden">
          {user?.planId === 'FREE' && (
            <div className="absolute inset-0 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-[6px] rounded-2xl flex flex-col items-center justify-center text-center p-6 z-20">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 flex items-center justify-center mb-3 border border-slate-200/50 dark:border-zinc-700/50">
                <Lock size={18} />
              </div>
              <h5 className="font-bold text-slate-800 dark:text-zinc-200 text-sm">Unlock AI Itinerary Planner</h5>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 max-w-[220px] mt-1 mb-4 leading-normal">
                Generate highly detailed, customizable day-by-day travel plans for your clients.
              </p>
              <button 
                onClick={handleUpgradePlan}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl shadow-sm transition"
              >
                Upgrade to Pro (₹999/mo)
              </button>
            </div>
          )}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md">
                <FileCheck size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-zinc-200 text-base">1-Click Itinerary Generator</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Create detailed travel plans powered by Gemini 3.5 Flash</p>
              </div>
            </div>

            <form onSubmit={handleGenerateItinerary} className="space-y-3 pt-2">
              <Input
                label="Destination & Trip Name"
                required
                placeholder="e.g. Goa Beach Holiday, Manali Adventure Tour"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                inputClassName="text-xs"
              />
              <div className="grid grid-cols-3 gap-3">
                <Input
                  className="col-span-1"
                  label="Duration (Days)"
                  type="number"
                  min={1}
                  max={15}
                  required
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  inputClassName="text-xs"
                />
                <Input
                  className="col-span-2"
                  label="Travel Style / Special Requests"
                  placeholder="e.g. luxury, family friendly, veg meals only"
                  value={itineraryNotes}
                  onChange={(e) => setItineraryNotes(e.target.value)}
                  inputClassName="text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={itineraryLoading}
                className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-xl transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {itineraryLoading ? 'Generating Plan...' : 'Generate Itinerary'}
              </button>
            </form>

            {generatedItinerary && (
              <div className="bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-4 max-h-[300px] overflow-y-auto space-y-2 mt-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-zinc-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500">Generated Itinerary</span>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(generatedItinerary);
                        toast.success('Itinerary copied to clipboard!');
                      }}
                      className="text-[10px] text-brand-600 dark:text-brand-400 font-bold hover:underline"
                    >
                      Copy Output
                    </button>
                    <button 
                      onClick={handleDownloadItinerary}
                      disabled={downloading}
                      className="text-[10px] text-orange-600 dark:text-orange-400 font-bold hover:underline disabled:opacity-50 flex items-center gap-1"
                    >
                      {user?.planId === 'FREE' && <Lock size={10} />}
                      {downloading ? 'Downloading...' : user?.planId === 'FREE' ? 'Download Basic PDF' : 'Download Premium PDF'}
                    </button>
                  </div>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {renderMarkdown(generatedItinerary)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tool 2: AI WhatsApp Auto-Replies (Simulator) */}
        <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm flex flex-col justify-between space-y-4 overflow-hidden">
          {user?.planId === 'FREE' && (
            <div className="absolute inset-0 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-[6px] rounded-2xl flex flex-col items-center justify-center text-center p-6 z-20">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 flex items-center justify-center mb-3 border border-slate-200/50 dark:border-zinc-700/50">
                <Lock size={18} />
              </div>
              <h5 className="font-bold text-slate-800 dark:text-zinc-200 text-sm">Unlock AI WhatsApp Agent</h5>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 max-w-[220px] mt-1 mb-4 leading-normal">
                Draft context-aware customer auto-replies referencing actual booking data.
              </p>
              <button 
                onClick={handleUpgradePlan}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl shadow-sm transition"
              >
                Upgrade to Pro (₹999/mo)
              </button>
            </div>
          )}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-md">
                <Bot size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-zinc-200 text-base">WhatsApp AI Auto-Replies</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Test how the AI auto-replies to clients based on database records</p>
              </div>
            </div>

            <form onSubmit={handleSendMockMessage} className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label="Select Booking (To Link Context)"
                  value={selectedBooking}
                  onChange={handleBookingChange}
                  inputClassName="text-xs"
                  options={[
                    { value: '', label: '-- Custom Number (No Booking) --' },
                    ...bookings.map((b) => ({ value: b.bookingId, label: `${b.customerName} (${b.trip})` })),
                  ]}
                />
                <Input
                  label="Phone Number"
                  required
                  placeholder="e.g. +919876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputClassName="text-xs"
                />
              </div>

              <div>
                <label className="label">Mock Customer Message</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g., How much is my remaining balance?"
                    value={customerMessage}
                    onChange={(e) => setCustomerMessage(e.target.value)}
                    className="input text-xs flex-1"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading}
                    className="px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </div>
            </form>

            {chatLog.length > 0 && (
              <div className="border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-500/5 dark:bg-zinc-950/50 flex flex-col h-[250px] overflow-hidden mt-4">
                <div className="bg-slate-100 dark:bg-zinc-800/80 px-3 py-1.5 text-[10px] text-slate-500 dark:text-zinc-400 font-bold flex justify-between items-center border-b border-slate-200 dark:border-zinc-800">
                  <span>MOCK WHATSAPP CONVERSATION</span>
                  <button onClick={clearChat} className="text-red-500 hover:underline">Clear Chat</button>
                </div>
                <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50 dark:bg-zinc-900/50">
                  {chatLog.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.sender === 'customer' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs shadow-sm ${
                        msg.sender === 'customer' 
                          ? 'bg-emerald-600 text-white rounded-tr-none' 
                          : 'bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 rounded-tl-none'
                      }`}>
                        {msg.sender === 'ai' ? renderMarkdown(msg.text) : <p>{msg.text}</p>}
                        
                        {/* Context Match tag for AI auto reply */}
                        {msg.sender === 'ai' && msg.booking && (
                          <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between gap-4 text-[9px] text-slate-400 font-bold">
                            <span>✅ Synced Booking: {msg.booking.customerName}</span>
                            <button
                              type="button"
                              onClick={() => handleSendWhatsApp(msg.booking.bookingId, msg.text)}
                              className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded transition font-bold"
                            >
                              Send via WhatsApp
                            </button>
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex items-start">
                      <div className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 rounded-2xl rounded-tl-none px-3 py-2 text-xs shadow-sm">
                        <span className="animate-pulse text-slate-400 dark:text-zinc-500">AI is drafting a reply...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Subscription Pricing / Info Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-100 dark:border-teal-900/50">
            {user?.planId === 'PRO' ? <Star size={20} className="text-teal-600 dark:text-teal-400 fill-teal-600 dark:fill-teal-400" /> : <ShieldAlert size={20} className="text-slate-400 dark:text-zinc-500" />}
          </div>
          <div>
            <h5 className="font-bold text-slate-800 dark:text-zinc-200 text-sm">
              Current Plan: {user?.planId === 'PRO' ? 'Premium Pro Tier' : 'Free Beta Tier'}
            </h5>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              {user?.planId === 'PRO' 
                ? 'Your AI tools are fully unlocked. Thank you for subscribing to EzzySync Pro!' 
                : 'All AI features are currently locked. Upgrade to unlock the full AI Travel CRM Suite.'}
            </p>
          </div>
        </div>
        {user?.planId !== 'PRO' ? (
          <button
            onClick={handleUpgradePlan}
            className="w-full sm:w-auto px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            Upgrade to Pro (₹999/mo)
          </button>
        ) : (
          <div className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3.5 py-1.5 rounded-full border border-emerald-200">
            PRO UNLOCKED
          </div>
        )}
      </div>
    </div>
  );
}
