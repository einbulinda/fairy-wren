import { useState } from "react";
import { Mail, Phone, MapPin, Send, Star } from "./icons";
import api from "../api";
const INITIAL = { name: "", email: "", message: "", rating: "", type: "feedback" };

export default function Contact() {
  const [form, setForm] = useState(INITIAL);
  const [status, setStatus] = useState("idle"); // idle | sending | success | error

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    try {
      await api.post("/public/feedback", {
        name: form.name,
        email: form.email || undefined,
        message: form.message,
        rating: form.rating ? parseInt(form.rating, 10) : undefined,
        type: form.type,
      });
      setStatus("success");
      setForm(INITIAL);
    } catch {
      setStatus("error");
    }
  };

  const inputCls =
    "w-full bg-night-950/50 border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-white/40 focus:outline-none focus:border-accent/60 focus:bg-night-950 transition-all";

  return (
    <section id="contact" className="py-24 px-5 relative overflow-hidden">
      {/* Background ambient orb */}
      <div className="ambient-orb w-[40vw] h-[40vw] bg-accent/10 top-1/2 -right-20" style={{ animationDelay: "2s" }} />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid md:grid-cols-2 gap-16">
          {/* Left: contact info */}
          <div>
            <p className="text-[11px] text-gold-light uppercase tracking-[0.3em] font-semibold mb-4">
              Get in Touch
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
              <span className="text-white">Inquire,</span>
              <br />
              <span className="italic text-gradient-purple">or Just Say Hi</span>
            </h2>
            <p className="text-[15px] text-white/50 leading-relaxed mb-10">
              Enquire about events, share your experience, or leave us feedback.
              We'd love to hear from you.
            </p>

            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent-light shrink-0">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="text-white text-[13px] font-medium">Location</p>
                  <p className="text-white/40 text-[12px]">
                    Kiguathi Rd, Utawala <br />
                    Nairobi - Kenya
                  </p>
                  <a
                    href="https://maps.app.goo.gl/phiHuhCykNXrxFkV9"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1 text-[12px] text-accent-light hover:text-white transition-colors"
                  >
                    Open in Google Maps →
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent-light shrink-0">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-white text-[13px] font-medium">Phone</p>
                  <a
                    href="tel:+254718832394"
                    className="text-white/40 text-[12px] hover:text-white/70 transition-colors"
                  >
                    +254 718 832 394
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent-light shrink-0">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-white text-[13px] font-medium">Email</p>
                  <a
                    href="mailto:hello@fairywren.co.ke"
                    className="text-white/40 text-[12px] hover:text-white/70 transition-colors"
                  >
                    hello@fairywren.co.ke
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div>
            {status === "success" ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16 glass-card rounded-3xl">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-5">
                  <span className="text-emerald-400 text-2xl">✓</span>
                </div>
                <h3 className="text-white text-[18px] font-semibold mb-2">
                  Message Sent!
                </h3>
                <p className="text-white/40 text-[14px] max-w-xs">
                  Thanks for reaching out. We'll get back to you shortly.
                </p>
                <button
                  onClick={() => setStatus("idle")}
                  className="mt-8 text-[13px] text-accent-light hover:text-white transition-colors"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="glass-card rounded-3xl p-8 space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[11px] text-white/70 uppercase tracking-wider mb-2">
                      Name *
                    </label>
                    <input
                      required
                      value={form.name}
                      onChange={set("name")}
                      placeholder="Your name"
                      className={inputCls}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[11px] text-white/70 uppercase tracking-wider mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={set("email")}
                      placeholder="your@email.com"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-white/70 uppercase tracking-wider mb-2">
                    Type
                  </label>
                  <div className="flex gap-3">
                    {["feedback", "complaint"].map((t) => (
                      <label
                        key={t}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all text-[13px] font-medium capitalize ${
                          form.type === t
                            ? "border-accent/60 bg-accent/10 text-white"
                            : "border-white/10 bg-night-950/30 text-white/50 hover:border-white/20 hover:text-white/70"
                        }`}
                      >
                        <input
                          type="radio"
                          name="type"
                          value={t}
                          checked={form.type === t}
                          onChange={set("type")}
                          className="sr-only"
                        />
                        {t === "feedback" ? "💬" : "⚠️"} {t}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-white/70 uppercase tracking-wider mb-2">
                    Rating (optional)
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            rating: f.rating == n ? "" : String(n),
                          }))
                        }
                        className="p-1 transition-transform hover:scale-110 focus:outline-none"
                        title={`${n} star${n > 1 ? "s" : ""}`}
                      >
                        <Star
                          size={28}
                          filled={parseInt(form.rating) >= n}
                          className={
                            parseInt(form.rating) >= n
                              ? "text-gold-light"
                              : "text-white/20 hover:text-gold-light/60"
                          }
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-white/70 uppercase tracking-wider mb-2">
                    Message *
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={set("message")}
                    placeholder="Tell us about your visit, ask about reservations, or enquire about events..."
                    className={`${inputCls} resize-none`}
                  />
                </div>

                {status === "error" && (
                  <p className="text-red-400 text-[12px]">
                    Something went wrong. Please try again.
                  </p>
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
                  {status === "sending" ? "Sending..." : "Send Message"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Embedded map */}
        <div className="mt-14 rounded-2xl overflow-hidden border border-white/5">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.81360138495!2d36.94821337473656!3d-1.2858564356251567!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f1136df3e6039%3A0x9600498512232fce!2sFairy%20Wren%20Ltd!5e1!3m2!1sen!2ske!4v1774860043281!5m2!1sen!2ske"
            width="100%"
            height="380"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Fairy Wren Location"
          />
        </div>
      </div>
    </section>
  );
}
