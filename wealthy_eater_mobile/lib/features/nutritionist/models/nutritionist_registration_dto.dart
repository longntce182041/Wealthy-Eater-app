/// DTO for Step 2: Registering as a nutritionist
/// Supports either certificate file (multipart) or certificate URL (JSON)
class NutritionistRegistrationDto {
  final String professionalTitle;
  final String licenseNumber;
  final int serviceFee;
  final String? certificateUrl;

  const NutritionistRegistrationDto({
    required this.professionalTitle,
    required this.licenseNumber,
    required this.serviceFee,
    this.certificateUrl,
  });

  Map<String, dynamic> toJson() => {
    'professionalTitle': professionalTitle,
    'licenseNumber': licenseNumber,
    'serviceFee': serviceFee,
    if (certificateUrl != null) 'certificateUrl': certificateUrl,
  };
}
