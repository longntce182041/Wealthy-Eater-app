const { v2: cloudinary } = require("cloudinary");
const { Readable } = require("stream");
const AppError = require("./AppError");

const cloudName =
  process.env.CLOUDINARY_CLOUD_NAME ||
  process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey =
  process.env.CLOUDINARY_API_KEY || process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

function ensureConfigured() {
  if (!cloudName || !apiKey || !apiSecret) {
    throw new AppError("Cloudinary configuration is missing", 500);
  }
}

function uploadNutritionistCertificate(file, certificateUrl) {
  if (certificateUrl) {
    if (typeof certificateUrl !== "string" || !certificateUrl.trim()) {
      throw new AppError("Invalid certificate URL", 400);
    }
    return Promise.resolve({
      url: certificateUrl,
      publicId: null,
      uploadMethod: "url",
    });
  }

  ensureConfigured();

  if (!file?.buffer) {
    throw new AppError("Certificate file or URL is required", 400);
  }

  const resourceType = file.mimetype === "application/pdf" ? "raw" : "image";

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "wealthy-eater/nutritionists/certificates",
        resource_type: resourceType,
      },
      (error, result) => {
        if (error || !result) {
          return reject(new AppError("Failed to upload certificate file", 502));
        }

        return resolve({
          url: result.secure_url,
          publicId: result.public_id,
          uploadMethod: "file",
        });
      },
    );

    Readable.from(file.buffer).pipe(uploadStream);
  });
}

module.exports = {
  uploadNutritionistCertificate,
};
