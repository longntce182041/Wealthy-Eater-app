const AppError = require("../utils/AppError");

function validateNutritionistRegistration(data, file) {
  const professionalTitle =
    typeof data?.professionalTitle === "string"
      ? data.professionalTitle.trim()
      : "";
  const licenseNumber =
    typeof data?.licenseNumber === "string" ? data.licenseNumber.trim() : "";
  const serviceFeeRaw = data?.serviceFee;
  const serviceFee = Number(serviceFeeRaw);
  const certificateUrl =
    typeof data?.certificateUrl === "string" ? data.certificateUrl.trim() : "";

  if (!professionalTitle) {
    throw new AppError("Professional title is required", 400);
  }

  if (!licenseNumber) {
    throw new AppError("License number is required", 400);
  }

  if (!Number.isFinite(serviceFee) || serviceFee <= 0) {
    throw new AppError("Service fee must be greater than zero", 400);
  }

  if (!file && !certificateUrl) {
    throw new AppError("Certificate file or URL is required", 400);
  }

  return {
    professionalTitle,
    licenseNumber,
    serviceFee,
    certificateUrl,
  };
}

module.exports = {
  validateNutritionistRegistration,
};
