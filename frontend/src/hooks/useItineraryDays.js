/**
 * Add/remove/reorder handlers for a quotation's day-by-day itinerary array.
 * Renumbers `day` on every change so the displayed order always matches
 * array order - callers never juggle day numbers themselves.
 */
export function useItineraryDays(form, setForm, toast) {
  const handleDayChange = (index, field, value) => {
    const updated = [...form.itineraryDays];
    updated[index][field] = value;
    setForm({ ...form, itineraryDays: updated });
  };

  const addDay = () => {
    const days = [...form.itineraryDays];
    days.push({ day: days.length + 1, title: '', description: '' });
    setForm({ ...form, itineraryDays: days });
    toast.success(`Day ${days.length} added to itinerary!`);
  };

  const removeDay = (index) => {
    let days = form.itineraryDays.filter((_, i) => i !== index);
    days = days.map((d, idx) => ({ ...d, day: idx + 1 }));
    setForm({ ...form, itineraryDays: days });
  };

  const moveDay = (index, direction) => {
    const days = [...form.itineraryDays];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= days.length) return;
    const temp = days[index];
    days[index] = days[targetIdx];
    days[targetIdx] = temp;
    const reindexed = days.map((d, idx) => ({ ...d, day: idx + 1 }));
    setForm({ ...form, itineraryDays: reindexed });
  };

  return { handleDayChange, addDay, removeDay, moveDay };
}
