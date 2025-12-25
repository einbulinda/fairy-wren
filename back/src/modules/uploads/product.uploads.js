const supabase = require("../../config/supabase");
const path = require("path");

// Upload product image
exports.uploadImage = async (req, res) => {
  try {
    const file = req.file;
    const { productName } = req.body;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    if (!productName) {
      return res.status(400).json({ error: "Product name is required" });
    }

    //   Validate File Type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: "Invalid file type" });
    }

    //   Generate unique file name
    const fileExt = path.extname(file.originalname);
    const safeName = productName.replace(/\s+/g, "_").toLowerCase();
    const fileName = `${Date.now()}_${safeName}${fileExt}`;
    const filePath = `products/${fileName}`;

    //   Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file.buffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.mimetype,
      });

    if (uploadError) throw uploadError;

    //   Get Public URL
    const { data, error: urlError } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    if (urlError) throw urlError;

    res.status(201).json({
      image_url: data.publicUrl,
      image_path: filePath,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to upload product image",
      error: error.message,
    });
  }
};

// Delete product image
exports.deleteImage = async (req, res) => {
  try {
    const { imagePath } = req.body;

    if (!imagePath) {
      return res.status(400).json({ message: "Image path required" });
    }

    const { error } = await supabaseAdmin.storage
      .from("product-images")
      .remove([imagePath]);

    if (error) throw error;

    return res.status(200).json({
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.error("Image deletion failed:", error);
    return res.status(500).json({
      message: "Failed to delete image",
    });
  }
};
