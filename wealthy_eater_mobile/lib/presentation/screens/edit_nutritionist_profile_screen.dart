import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../providers/nutritionist_provider.dart';
import '../../features/nutritionist/presentation/utils/validation.dart';
import '../../features/nutritionist/presentation/widgets/certificate_upload_card.dart';

class EditNutritionistProfileScreen extends StatefulWidget {
  const EditNutritionistProfileScreen({super.key});

  @override
  State<EditNutritionistProfileScreen> createState() =>
      _EditNutritionistProfileScreenState();
}

class _EditNutritionistProfileScreenState
    extends State<EditNutritionistProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isSaving = false;

  final TextEditingController _fullNameCtrl = TextEditingController();
  final TextEditingController _specializationCtrl = TextEditingController();
  final TextEditingController _professionalTitleCtrl = TextEditingController();
  final TextEditingController _licenseNumberCtrl = TextEditingController();
  final TextEditingController _consultationFeeCtrl = TextEditingController();

  File? _certificateFile;
  String? _certificateUrl;

  @override
  void initState() {
    super.initState();
    final profile = context.read<NutritionistProvider>().myProfile ?? {};

    _fullNameCtrl.text = profile['full_name']?.toString() ?? '';
    _specializationCtrl.text = profile['specialization']?.toString() ?? '';
    _professionalTitleCtrl.text = profile['professional_title']?.toString() ?? '';
    _licenseNumberCtrl.text = profile['license_number']?.toString() ?? '';

    final fee = profile['service_fee'];
    if (fee != null) {
      _consultationFeeCtrl.text =
          ExpertRegistrationValidator.formatCurrency(fee.toString());
    }

    _certificateUrl = profile['certification_url']?.toString();
  }

  @override
  void dispose() {
    _fullNameCtrl.dispose();
    _specializationCtrl.dispose();
    _professionalTitleCtrl.dispose();
    _licenseNumberCtrl.dispose();
    _consultationFeeCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    final parsedFee =
        ExpertRegistrationValidator.parseCurrency(_consultationFeeCtrl.text);
    if (parsedFee == null || parsedFee <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a valid consultation fee.'),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }

    setState(() => _isSaving = true);
    final provider = context.read<NutritionistProvider>();

    final success = await provider.updateMyProfile(
      fullName: _fullNameCtrl.text.trim(),
      specialization: _specializationCtrl.text.trim(),
      professionalTitle: _professionalTitleCtrl.text.trim(),
      licenseNumber: _licenseNumberCtrl.text.trim(),
      serviceFee: parsedFee,
      certificateFile: _certificateFile,
      certificateUrl: _certificateUrl,
    );

    if (!mounted) return;
    setState(() => _isSaving = false);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Profile updated successfully!'),
          backgroundColor: AppColors.primary,
        ),
      );
      Navigator.pop(context);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(provider.profileError ?? 'Failed to update profile.'),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final primaryColor = Theme.of(context).colorScheme.primary;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit Professional Profile'),
        elevation: 0,
        actions: [
          if (_isSaving)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.0),
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
              ),
            )
          else
            IconButton(
              icon: const Icon(Icons.check),
              onPressed: _save,
              tooltip: 'Save changes',
            )
        ],
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              // Header description
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: primaryColor.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: primaryColor.withValues(alpha: 0.15)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Professional Profile Configuration',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: primaryColor,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Update your identity, credentials, specialties, and upload your revised certification details here.',
                      style: TextStyle(fontSize: 13, color: Colors.black54, height: 1.4),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Section titles and fields
              const Text(
                'Personal & Career Details',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.black87),
              ),
              const SizedBox(height: 12),

              // Full Name field
              TextFormField(
                controller: _fullNameCtrl,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(
                  labelText: 'Full Name *',
                  prefixIcon: Icon(Icons.person_outline),
                  border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) return 'Full name is required';
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Specialization field
              TextFormField(
                controller: _specializationCtrl,
                decoration: const InputDecoration(
                  labelText: 'Specialization *',
                  hintText: 'e.g., Weight Management, Pediatrics',
                  prefixIcon: Icon(Icons.psychology_outlined),
                  border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) return 'Specialization is required';
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Professional Title field
              TextFormField(
                controller: _professionalTitleCtrl,
                decoration: const InputDecoration(
                  labelText: 'Professional Title *',
                  hintText: 'e.g., Clinical Dietitian, Nutrition Consultant',
                  prefixIcon: Icon(Icons.badge_outlined),
                  border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
                ),
                validator: ExpertRegistrationValidator.validateProfessionalTitle,
              ),
              const SizedBox(height: 16),

              // License Number field
              TextFormField(
                controller: _licenseNumberCtrl,
                decoration: const InputDecoration(
                  labelText: 'License Number *',
                  prefixIcon: Icon(Icons.confirmation_number_outlined),
                  border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
                ),
                validator: ExpertRegistrationValidator.validateLicenseNumber,
              ),
              const SizedBox(height: 16),

              // Consultation Fee field
              TextFormField(
                controller: _consultationFeeCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Consultation Fee (VND) *',
                  prefixIcon: Icon(Icons.monetization_on_outlined),
                  suffixText: 'VND',
                  border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
                ),
                onChanged: (value) {
                  final formatted = ExpertRegistrationValidator.formatCurrency(value);
                  if (formatted != value) {
                    _consultationFeeCtrl.value = TextEditingValue(
                      text: formatted,
                      selection: TextSelection.fromPosition(
                        TextPosition(offset: formatted.length),
                      ),
                    );
                  }
                },
                validator: ExpertRegistrationValidator.validateConsultationFee,
              ),
              const SizedBox(height: 28),

              // Section: Certification Upload
              const Text(
                'Certification Update',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.black87),
              ),
              const SizedBox(height: 12),

              CertificateUploadCard(
                selectedUrl: _certificateUrl,
                selectedFile: _certificateFile,
                onFileSelected: (file) {
                  setState(() {
                    _certificateFile = file;
                    _certificateUrl = null;
                  });
                },
                onUrlSelected: (url) {
                  setState(() {
                    _certificateUrl = url;
                    _certificateFile = null;
                  });
                },
              ),
              const SizedBox(height: 32),

              // Save Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isSaving ? null : _save,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: _isSaving
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                        )
                      : const Text(
                          'Save Changes',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}
