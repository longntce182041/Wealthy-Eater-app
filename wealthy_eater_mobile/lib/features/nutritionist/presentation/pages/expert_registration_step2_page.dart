import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/expert_registration_notifier.dart';
import '../providers/expert_registration_state.dart';
import '../utils/validation.dart';
import '../widgets/certificate_upload_card.dart';

/// Step 2: Professional Information Registration
/// User enters professional details and uploads certificate
class ExpertRegistrationStep2Page extends StatefulWidget {
  final String? userId;
  final String? accessToken;

  const ExpertRegistrationStep2Page({super.key, this.userId, this.accessToken});

  @override
  State<ExpertRegistrationStep2Page> createState() =>
      _ExpertRegistrationStep2PageState();
}

class _ExpertRegistrationStep2PageState
    extends State<ExpertRegistrationStep2Page> {
  final _formKey = GlobalKey<FormState>();
  final _professionalTitleController = TextEditingController();
  final _licenseNumberController = TextEditingController();
  final _consultationFeeController = TextEditingController();

  File? _certificateFile;
  String? _certificateUrl;

  @override
  void dispose() {
    _professionalTitleController.dispose();
    _licenseNumberController.dispose();
    _consultationFeeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Professional Information'),
        elevation: 0,
        backgroundColor: Colors.green.shade600,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.green.shade200),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Step 2: Professional Details',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Colors.green.shade900,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Provide your professional credentials and certification',
                        style: TextStyle(
                          color: Colors.grey.shade700,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),

                // Section 1: Professional Information
                Text(
                  'Section 1: Professional Information',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),

                // Professional Title
                TextFormField(
                  controller: _professionalTitleController,
                  decoration: InputDecoration(
                    labelText: 'Professional Title *',
                    hintText:
                        'e.g., Registered Dietitian, Clinical Nutritionist',
                    prefixIcon: const Icon(Icons.badge),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade300),
                    ),
                  ),
                  validator:
                      ExpertRegistrationValidator.validateProfessionalTitle,
                ),
                const SizedBox(height: 16),

                // License Number
                TextFormField(
                  controller: _licenseNumberController,
                  decoration: InputDecoration(
                    labelText: 'License Number *',
                    hintText: 'e.g., VN-123456',
                    prefixIcon: const Icon(Icons.confirmation_number),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade300),
                    ),
                  ),
                  validator: ExpertRegistrationValidator.validateLicenseNumber,
                ),
                const SizedBox(height: 28),

                // Section 2: Certification Upload
                Text(
                  'Section 2: Certification',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),

                CertificateUploadCard(
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
                const SizedBox(height: 28),

                // Section 3: Consultation Fee
                Text(
                  'Section 3: Consultation Fee',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),

                TextFormField(
                  controller: _consultationFeeController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: 'Desired Consultation Fee (VND) *',
                    hintText: 'e.g., 300000',
                    prefixIcon: const Icon(Icons.attach_money),
                    suffixText: 'VND',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade300),
                    ),
                  ),
                  onChanged: (value) {
                    final formatted =
                        ExpertRegistrationValidator.formatCurrency(value);
                    if (formatted != value) {
                      _consultationFeeController.value = TextEditingValue(
                        text: formatted,
                        selection: TextSelection.fromPosition(
                          TextPosition(offset: formatted.length),
                        ),
                      );
                    }
                  },
                  validator:
                      ExpertRegistrationValidator.validateConsultationFee,
                ),
                const SizedBox(height: 8),
                Text(
                  'Fee per consultation session',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade600,
                    fontStyle: FontStyle.italic,
                  ),
                ),
                const SizedBox(height: 28),

                // Submit Button
                Consumer<ExpertRegistrationNotifier>(
                  builder: (context, notifier, child) {
                    final isLoading =
                        notifier.state is NutritionistRegistrationLoading;

                    return Column(
                      children: [
                        SizedBox(
                          width: double.infinity,
                          height: 56,
                          child: ElevatedButton(
                            onPressed: isLoading
                                ? null
                                : _handleSubmitRegistration,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.green.shade600,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: isLoading
                                ? const SizedBox(
                                    height: 24,
                                    width: 24,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                        Colors.white,
                                      ),
                                    ),
                                  )
                                : const Text(
                                    'Submit Expert Registration',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        if (notifier.state is NutritionistRegistrationError)
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.red.shade50,
                              border: Border.all(color: Colors.red.shade300),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.error_outline,
                                  color: Colors.red.shade700,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    (notifier.state
                                            as NutritionistRegistrationError)
                                        .message,
                                    style: TextStyle(
                                      color: Colors.red.shade700,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    );
                  },
                ),
                const SizedBox(height: 16),

                // Success Dialog Handler
                Consumer<ExpertRegistrationNotifier>(
                  builder: (context, notifier, child) {
                    // Show success dialog when registration succeeds
                    if (notifier.state is NutritionistRegistrationSuccess) {
                      WidgetsBinding.instance.addPostFrameCallback((_) {
                        _showSuccessDialog(
                          context,
                          notifier.state as NutritionistRegistrationSuccess,
                        );
                      });
                    }
                    return const SizedBox.shrink();
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _handleSubmitRegistration() async {
    if (!_formKey.currentState!.validate()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please fill all required fields'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    if (_certificateFile == null && _certificateUrl == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please upload a certificate file or provide a URL'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final notifier = context.read<ExpertRegistrationNotifier>();
    final fee =
        ExpertRegistrationValidator.parseCurrency(
          _consultationFeeController.text,
        ) ??
        0;

    await notifier.registerAsNutritionist(
      professionalTitle: _professionalTitleController.text.trim(),
      licenseNumber: _licenseNumberController.text.trim(),
      serviceFee: fee,
      certificateFile: _certificateFile,
      certificateUrl: _certificateUrl,
      accessToken: widget.accessToken,
    );
  }

  void _showSuccessDialog(
    BuildContext context,
    NutritionistRegistrationSuccess state,
  ) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        icon: Icon(Icons.check_circle, color: Colors.green.shade600, size: 64),
        title: const Text('Registration Successful!'),
        content: SingleChildScrollView(
          child: ListBody(
            children: [
              Text(
                'Your expert account has been created with ID: ${state.nutritionistId}',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 14),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.amber.shade300),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.info,
                          color: Colors.amber.shade700,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        const Expanded(
                          child: Text(
                            'Status',
                            style: TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Approval Status: ${state.approvalStatus}',
                      style: TextStyle(
                        color: Colors.amber.shade900,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Your registration is pending admin approval. You will be notified once it\'s reviewed.',
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.of(context).popUntil((route) => route.isFirst);
            },
            child: const Text('Return to Home'),
          ),
        ],
      ),
    );
  }
}
