import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Images, Upload, Trash2, Eye, EyeOff, Loader2, X, Pencil, GripVertical,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  fetchGallery, uploadGalleryImage, updateGalleryImage,
  reorderGallery, deleteGalleryImage,
} from "@/services/gallery.service";

/* ── Caption edit modal ─────────────────────────────────── */
const CaptionModal = ({ image, onClose, onSave, saving }) => {
  const [caption, setCaption] = useState(image.caption || "");
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-900 border border-surface-700 rounded-xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-white">Edit Caption</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-white"><X size={16} /></button>
        </div>
        <img src={image.url} alt="" className="w-full h-36 object-cover rounded-lg" />
        <input
          autoFocus
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Caption (optional)"
          className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-[13px] text-surface-400 hover:text-white">Cancel</button>
          <button
            onClick={() => onSave(caption)}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-[13px] font-medium rounded-lg disabled:opacity-50"
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Upload zone ─────────────────────────────────────────── */
const UploadZone = ({ onFiles }) => {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ["image/jpeg", "image/png", "image/webp"].includes(f.type)
    );
    if (files.length) onFiles(files);
  }, [onFiles]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors ${
        dragging ? "border-primary-500 bg-primary-500/5" : "border-surface-700 hover:border-surface-500"
      }`}
    >
      <Upload size={28} className="text-surface-500" />
      <div className="text-center">
        <p className="text-[13px] font-medium text-surface-300">Drop images here or click to upload</p>
        <p className="text-[11px] text-surface-500 mt-0.5">JPEG, PNG or WebP · max 8 MB each · multiple allowed</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onFiles(Array.from(e.target.files))}
      />
    </div>
  );
};

/* ── Main page ───────────────────────────────────────────── */
export default function WebGalleryPage() {
  const qc = useQueryClient();
  const [captionModal, setCaptionModal] = useState(null);
  const [uploading, setUploading] = useState(false);
  const dragItem = useRef(null);
  const dragOver = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ["gallery"],
    queryFn: fetchGallery,
  });

  const images = data?.images || [];

  /* Upload multiple files sequentially */
  const handleFiles = async (files) => {
    setUploading(true);
    let successCount = 0;
    for (const file of files) {
      try {
        await uploadGalleryImage(file, "");
        successCount++;
      } catch (err) {
        const msg = err?.response?.data?.message;
        if (msg) {
          toast.error(msg, { duration: 6000 });
        } else {
          toast.error(`Failed to upload "${file.name}". Please try again.`);
        }
      }
    }
    if (successCount) {
      qc.invalidateQueries({ queryKey: ["gallery"] });
      toast.success(`${successCount} image${successCount > 1 ? "s" : ""} uploaded`);
    }
    setUploading(false);
  };

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => updateGalleryImage(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gallery"] }),
    onError: () => toast.error("Failed to update"),
  });

  const captionMutation = useMutation({
    mutationFn: ({ id, caption }) => updateGalleryImage(id, { caption }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gallery"] });
      toast.success("Caption saved");
      setCaptionModal(null);
    },
    onError: () => toast.error("Failed to save caption"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGalleryImage,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gallery"] });
      toast.success("Image deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  /* Drag-to-reorder */
  const handleDragStart = (index) => { dragItem.current = index; };
  const handleDragEnter = (index) => { dragOver.current = index; };
  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOver.current === null) return;
    const reordered = [...images];
    const dragged = reordered.splice(dragItem.current, 1)[0];
    reordered.splice(dragOver.current, 0, dragged);
    dragItem.current = null;
    dragOver.current = null;
    // Optimistic UI update then persist
    qc.setQueryData(["gallery"], (old) => ({ ...old, images: reordered }));
    try {
      await reorderGallery(reordered.map((i) => i.id));
    } catch {
      toast.error("Failed to save order");
      qc.invalidateQueries({ queryKey: ["gallery"] });
    }
  };

  const handleDelete = (img) => {
    if (!confirm(`Delete this image? This cannot be undone.`)) return;
    deleteMutation.mutate(img.id);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Images size={20} className="text-primary-400" />
        <div>
          <h1 className="text-[17px] font-semibold text-white">Gallery</h1>
          <p className="text-[12px] text-surface-400">
            Manage images shown on the public website · drag to reorder
          </p>
        </div>
      </div>

      {/* Upload zone */}
      {uploading ? (
        <div className="flex items-center justify-center gap-3 py-10 border-2 border-dashed border-surface-700 rounded-xl">
          <Loader2 size={20} className="animate-spin text-primary-400" />
          <span className="text-[13px] text-surface-400">Uploading...</span>
        </div>
      ) : (
        <UploadZone onFiles={handleFiles} />
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-primary-400" />
        </div>
      ) : images.length === 0 ? (
        <p className="text-center text-surface-500 text-[13px] py-10">
          No images yet. Upload some above.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img, index) => (
            <div
              key={img.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className={`group relative rounded-xl overflow-hidden border transition-all cursor-grab active:cursor-grabbing ${
                img.active ? "border-surface-700" : "border-surface-700 opacity-50"
              }`}
            >
              <img
                src={img.url}
                alt={img.caption || "Gallery image"}
                className="w-full h-44 object-cover"
              />

              {/* Drag handle */}
              <div className="absolute top-2 left-2 p-1 rounded bg-black/50 text-white/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical size={14} />
              </div>

              {/* Hidden badge */}
              {!img.active && (
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white/60 text-[10px] font-medium">
                  Hidden
                </div>
              )}

              {/* Action overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-end justify-center pb-3 gap-2 opacity-0 group-hover:opacity-100">
                <button
                  title={img.active ? "Hide" : "Show"}
                  onClick={() => toggleMutation.mutate({ id: img.id, active: !img.active })}
                  className="p-2 rounded-lg bg-surface-800/90 text-white hover:bg-surface-700"
                >
                  {img.active ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  title="Edit caption"
                  onClick={() => setCaptionModal(img)}
                  className="p-2 rounded-lg bg-surface-800/90 text-white hover:bg-surface-700"
                >
                  <Pencil size={14} />
                </button>
                <button
                  title="Delete"
                  onClick={() => handleDelete(img)}
                  className="p-2 rounded-lg bg-surface-800/90 text-red-400 hover:bg-surface-700"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Caption */}
              {img.caption && (
                <div className="px-2 py-1.5 bg-surface-900 border-t border-surface-800">
                  <p className="text-[11px] text-surface-400 truncate">{img.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {captionModal && (
        <CaptionModal
          image={captionModal}
          onClose={() => setCaptionModal(null)}
          onSave={(caption) => captionMutation.mutate({ id: captionModal.id, caption })}
          saving={captionMutation.isPending}
        />
      )}
    </div>
  );
}
