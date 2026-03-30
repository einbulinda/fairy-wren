import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Plus, Pencil, Trash2, Eye, EyeOff, Loader2, X, Globe, ImagePlus } from "lucide-react";
import toast from "react-hot-toast";
import { fetchEvents, createEvent, updateEvent, deleteEvent, uploadEventPoster } from "@/services/events.service";

const STATUS_BADGE = {
  published: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  draft: "bg-surface-700 text-surface-400 border border-surface-600",
};

const EMPTY_FORM = {
  title: "",
  description: "",
  event_date: "",
  start_time: "",
  end_time: "",
  dj_act: "",
  image_url: "",
  ticket_url: "",
  status: "draft",
};

const EventModal = ({ event, onClose, onSave, saving }) => {
  const [form, setForm] = useState(event || EMPTY_FORM);
  const [posterFile, setPosterFile] = useState(null);
  const [posterPreview, setPosterPreview] = useState(event?.image_url || null);
  const fileInputRef = useRef(null);
  const isEdit = !!event?.id;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPosterFile(file);
    setPosterPreview(URL.createObjectURL(file));
  };

  const clearPoster = () => {
    setPosterFile(null);
    setPosterPreview(event?.image_url || null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ form, posterFile });
  };

  const inputCls = "w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500";

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-900 border border-surface-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-surface-700">
          <h2 className="text-[15px] font-semibold text-white">
            {isEdit ? "Edit Event" : "New Event"}
          </h2>
          <button onClick={onClose} className="text-surface-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Poster upload */}
          <div>
            <label className="block text-[12px] text-surface-400 mb-1">Event Poster</label>
            <div
              className="relative w-full rounded-lg border border-dashed border-surface-600 overflow-hidden cursor-pointer hover:border-primary-500 transition-colors"
              style={{ minHeight: posterPreview ? "auto" : "120px" }}
              onClick={() => fileInputRef.current?.click()}
            >
              {posterPreview ? (
                <div className="relative group">
                  <img
                    src={posterPreview}
                    alt="Event poster"
                    className="w-full max-h-52 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 rounded-lg">
                    <span className="text-white text-[12px] font-medium flex items-center gap-1.5">
                      <ImagePlus size={14} /> Change poster
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); clearPoster(); }}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-surface-500">
                  <ImagePlus size={24} className="mb-2" />
                  <p className="text-[12px] font-medium text-surface-400">Click to upload poster</p>
                  <p className="text-[11px] mt-0.5">JPEG, PNG or WebP · max 5 MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div>
            <label className="block text-[12px] text-surface-400 mb-1">Title *</label>
            <input required value={form.title} onChange={set("title")} className={inputCls} placeholder="Event title" />
          </div>

          <div>
            <label className="block text-[12px] text-surface-400 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={set("description")}
              rows={3}
              className={`${inputCls} resize-none`}
              placeholder="Event description"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[12px] text-surface-400 mb-1">Date *</label>
              <input required type="date" value={form.event_date} onChange={set("event_date")} className={inputCls} />
            </div>
            <div>
              <label className="block text-[12px] text-surface-400 mb-1">Start Time</label>
              <input type="time" value={form.start_time} onChange={set("start_time")} className={inputCls} />
            </div>
            <div>
              <label className="block text-[12px] text-surface-400 mb-1">End Time</label>
              <input type="time" value={form.end_time} onChange={set("end_time")} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-[12px] text-surface-400 mb-1">DJ / Act</label>
            <input value={form.dj_act} onChange={set("dj_act")} className={inputCls} placeholder="DJ or performer name" />
          </div>

          <div>
            <label className="block text-[12px] text-surface-400 mb-1">Ticket URL</label>
            <input type="url" value={form.ticket_url} onChange={set("ticket_url")} className={inputCls} placeholder="https://..." />
          </div>

          <div>
            <label className="block text-[12px] text-surface-400 mb-1">Status</label>
            <select value={form.status} onChange={set("status")} className={inputCls}>
              <option value="draft">Draft (hidden from public)</option>
              <option value="published">Published (visible on website)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] text-surface-300 hover:text-white">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-[13px] font-medium rounded-lg disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? "Save Changes" : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function WebEventsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // null | { event? }
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["events", statusFilter],
    queryFn: () => fetchEvents({ status: statusFilter || undefined }),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ form, posterFile }) => {
      // Step 1: create or update event fields
      const saved = form.id
        ? await updateEvent(form.id, form)
        : await createEvent(form);

      // Step 2: upload poster if a new file was selected
      if (posterFile) {
        const eventId = saved.id || form.id;
        await uploadEventPoster(eventId, posterFile);
      }

      return saved;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success(modal?.event?.id ? "Event updated" : "Event created");
      setModal(null);
    },
    onError: () => toast.error("Failed to save event"),
  });

  const togglePublish = useMutation({
    mutationFn: ({ id, status }) => updateEvent(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
    onError: () => toast.error("Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event deleted");
    },
    onError: () => toast.error("Failed to delete event"),
  });

  const handleDelete = (ev) => {
    if (!confirm(`Delete "${ev.title}"? This cannot be undone.`)) return;
    deleteMutation.mutate(ev.id);
  };

  const events = data?.events || [];

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <CalendarDays size={20} className="text-primary-400" />
          <div>
            <h1 className="text-[17px] font-semibold text-white">Events</h1>
            <p className="text-[12px] text-surface-400">Manage events shown on the public website</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none"
          >
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <button
            onClick={() => setModal({})}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-[13px] font-medium rounded-lg"
          >
            <Plus size={15} />
            New Event
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-900 border border-surface-700 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 size={24} className="animate-spin text-primary-400" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 text-surface-400 text-[13px]">
            No events found. Create one to get started.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-surface-700 text-surface-400 text-[11px] uppercase tracking-wider">
                    <th className="text-left px-5 py-3">Event</th>
                    <th className="text-left px-5 py-3">Date</th>
                    <th className="text-left px-5 py-3">DJ / Act</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800">
                  {events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-surface-800/50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-white font-medium">{ev.title}</p>
                        {ev.description && (
                          <p className="text-surface-400 text-[12px] mt-0.5 truncate max-w-xs">
                            {ev.description}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-surface-300">
                        {new Date(ev.event_date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {ev.start_time && (
                          <span className="text-surface-500 ml-1">· {ev.start_time.slice(0, 5)}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-surface-300">{ev.dj_act || "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_BADGE[ev.status]}`}>
                          {ev.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            title={ev.status === "published" ? "Unpublish" : "Publish"}
                            onClick={() =>
                              togglePublish.mutate({
                                id: ev.id,
                                status: ev.status === "published" ? "draft" : "published",
                              })
                            }
                            className="p-1.5 rounded text-surface-400 hover:text-white hover:bg-surface-700"
                          >
                            {ev.status === "published" ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            title="Edit"
                            onClick={() => setModal({ event: ev })}
                            className="p-1.5 rounded text-surface-400 hover:text-white hover:bg-surface-700"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            title="Delete"
                            onClick={() => handleDelete(ev)}
                            className="p-1.5 rounded text-surface-400 hover:text-red-400 hover:bg-surface-700"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-surface-800">
              {events.map((ev) => (
                <div key={ev.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-white font-medium text-[14px]">{ev.title}</p>
                      <p className="text-surface-400 text-[12px]">
                        {new Date(ev.event_date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {ev.dj_act ? ` · ${ev.dj_act}` : ""}
                      </p>
                    </div>
                    <span className={`shrink-0 inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_BADGE[ev.status]}`}>
                      {ev.status}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() =>
                        togglePublish.mutate({
                          id: ev.id,
                          status: ev.status === "published" ? "draft" : "published",
                        })
                      }
                      className="flex items-center gap-1 text-[12px] text-surface-400 hover:text-white"
                    >
                      {ev.status === "published" ? <EyeOff size={13} /> : <Eye size={13} />}
                      {ev.status === "published" ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      onClick={() => setModal({ event: ev })}
                      className="flex items-center gap-1 text-[12px] text-surface-400 hover:text-white"
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(ev)}
                      className="flex items-center gap-1 text-[12px] text-surface-400 hover:text-red-400"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Public site link */}
      <div className="flex items-center gap-2 text-[12px] text-surface-500">
        <Globe size={13} />
        <span>Published events appear on the public website events section.</span>
      </div>

      {modal && (
        <EventModal
          event={modal.event}
          onClose={() => setModal(null)}
          onSave={({ form, posterFile }) => saveMutation.mutate({ form, posterFile })}
          saving={saveMutation.isPending}
        />
      )}
    </div>
  );
}
