import { useState } from "react";
import { CalendarDays, Clock, Users, Wine, Cake, Phone, Send } from "./icons";
import api from "../api";

const OCCASIONS = ["", "Birthday", "Anniversary", "Date Night", "Business Dinner", "Bachelorette", "Graduation", "Other"];

const INITIAL = {
  name: "",
  phone: "",
  email: "",
  reservation_date: "",
  reservation_time: "",
  party_size: "",
  drink_of_choice: "",
  special_occasion: "",
  notes: "",
};

export default function Reservation() {
  const [form, setForm] = useState(INITIAL);
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [errorMsg, setErrorMsg] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");
    try {
      await api.post("/public/reservations", {
        name: form.name,
        phone: form.phone || undefined,
        email: form.email || undefined,
        reservation_date: form.reservation_date,
        reservation_time: form.reservation_time || undefined,
        party_size: parseInt(form.party_size, 10),
        drink_of_choice: form.drink_of_choice || undefined,
        special_occasion: form.special_occasion || undefined,
        notes: form.notes || undefined,
      });
      setStatus("success");
      setForm(INITIAL);
    } catch (err) {
      const msg = err?.response?.data?.message || "Something went wrong. Please try again.";
      setErrorMsg(msg);
      setStatus("error");
    }
  };

  const inputCls =
    "w-full bg-night-950/50 border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-white/40 focus:outline-none focus:border-accent/60 focus:bg-night-950 transition-all";

  const labelCls = "block text-[11px] text-white/70 uppercase tracking-wider mb-2";

  return (
    <section id="reserve" className="py-24 px-5 relative overflow-hidden">
      <div className="ambient-orb w-[35vw] h-[35vw] bg-accent/8 bottom-0 -left-20" style={{ animationDelay: "1s" }} />

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Heading */}
        <div className="text-center mb-12">
          <p className="text-[11px] text-gold-light uppercase tracking-[0.3em] font-semibold mb-4">
            Book Your Spot
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            <span className="text-white">Reserve</span>{" "}
            <span className="italic text-gradient-purple">a Table</span>
          </h2>
          <p className="text-[15px] text-white/50 leading-relaxed">
            Secure your table at Fairy Wren. We'll confirm your reservation and reach out if we need any additional details.
          </p>
        </div>

        {status === "success" ? (
          <div className="flex flex-col items-center justify-center text-center py-16 glass-card rounded-3xl">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-5">
              <span className="text-emerald-400 text-2xl">✓</span>
            </div>
            <h3 className="text-white text-[18px] font-semibold mb-2">Reservation Received!</h3>
            <p className="text-white/40 text-[14px] max-w-xs">
              We'll review your reservation and get back to you to confirm.
            </p>
            <button
              onClick={() => setStatus("idle")}
              className="mt-8 text-[13px] text-accent-light hover:text-white transition-colors"
            >
              Make another reservation
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-8 space-y-5">
            {/* Name */}
            <div>
              <label className={labelCls}>Full Name *</label>
              <input
                required
                value={form.name}
                onChange={set("name")}
                placeholder="Your full name"
                className={inputCls}
              />
            </div>

            {/* Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  <span className="flex items-center gap-1.5">
                    <Phone size={10} className="inline" /> Phone
                  </span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="+254 700 000 000"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="your@email.com"
                  className={inputCls}
                />
              </div>
            </div>
            <p className="text-[11px] text-white/30 -mt-2">At least one contact method (phone or email) is required.</p>

            {/* Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  <span className="flex items-center gap-1.5">
                    <CalendarDays size={10} className="inline" /> Date *
                  </span>
                </label>
                <input
                  required
                  type="date"
                  value={form.reservation_date}
                  onChange={set("reservation_date")}
                  min={new Date().toISOString().split("T")[0]}
                  className={`${inputCls} [color-scheme:dark]`}
                />
              </div>
              <div>
                <label className={labelCls}>
                  <span className="flex items-center gap-1.5">
                    <Clock size={10} className="inline" /> Preferred Time
                  </span>
                </label>
                <input
                  type="time"
                  value={form.reservation_time}
                  onChange={set("reservation_time")}
                  className={`${inputCls} [color-scheme:dark]`}
                />
              </div>
            </div>

            {/* Party size & Drink */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  <span className="flex items-center gap-1.5">
                    <Users size={10} className="inline" /> Party Size *
                  </span>
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  max="50"
                  value={form.party_size}
                  onChange={set("party_size")}
                  placeholder="Number of guests"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>
                  <span className="flex items-center gap-1.5">
                    <Wine size={10} className="inline" /> Drink of Choice
                  </span>
                </label>
                <input
                  value={form.drink_of_choice}
                  onChange={set("drink_of_choice")}
                  placeholder="e.g. Whisky, Wine, Pilsner..."
                  className={inputCls}
                />
              </div>
            </div>

            {/* Special occasion */}
            <div>
              <label className={labelCls}>
                <span className="flex items-center gap-1.5">
                  <Cake size={10} className="inline" /> Special Occasion
                </span>
              </label>
              <select value={form.special_occasion} onChange={set("special_occasion")} className={inputCls}>
                {OCCASIONS.map((o) => (
                  <option key={o} value={o} className="bg-night-900">
                    {o || "None"}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className={labelCls}>Additional Notes</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={set("notes")}
                placeholder="Any dietary requirements, seating preferences, or other requests..."
                className={`${inputCls} resize-none`}
              />
            </div>

            {status === "error" && (
              <p className="text-red-400 text-[12px]">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-accent hover:bg-accent-dark text-white font-semibold text-[14px] transition-all disabled:opacity-50 neon-glow-hover"
            >
              {status === "sending" ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send size={15} />
              )}
              {status === "sending" ? "Submitting..." : "Reserve My Table"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
