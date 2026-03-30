import api from "@/api";

export const fetchGallery = async () => {
  const { data } = await api.get("/gallery");
  return data;
};

export const uploadGalleryImage = async (file, caption) => {
  const formData = new FormData();
  formData.append("image", file);
  if (caption) formData.append("caption", caption);
  const { data } = await api.post("/gallery", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const updateGalleryImage = async (id, payload) => {
  const { data } = await api.patch(`/gallery/${id}`, payload);
  return data;
};

export const reorderGallery = async (orderedIds) => {
  const { data } = await api.patch("/gallery/reorder", { orderedIds });
  return data;
};

export const deleteGalleryImage = async (id) => {
  await api.delete(`/gallery/${id}`);
};
