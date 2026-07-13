/// nutritionist_verification_screen.dart — Onboarding and verification page for nutritionists.
library;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../providers/auth_provider.dart';

class NutritionistVerificationScreen extends StatefulWidget {
  const NutritionistVerificationScreen({super.key});

  @override
  State<NutritionistVerificationScreen> createState() =>
      _NutritionistVerificationScreenState();
}

class _NutritionistVerificationScreenState
    extends State<NutritionistVerificationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _licenseCtrl = TextEditingController();
  final _feeCtrl = TextEditingController();

  List<String> _links = [''];
  bool _isEditing = false;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  void _loadInitialData() {
    final user = context.read<AuthProvider>().user;
    if (user != null) {
      _titleCtrl.text = user.professionalTitle ?? '';
      _licenseCtrl.text = user.licenseNumber ?? '';
      _feeCtrl.text = user.serviceFee != null ? user.serviceFee!.toStringAsFixed(0) : '';

      final rawLinks = user.certificationUrl ?? '';
      if (rawLinks.isNotEmpty) {
        _links = rawLinks.split(',');
      } else {
        _links = [''];
      }
    }
    // If they have never submitted or were rejected, let them write immediately
    final status = user?.approvalStatus;
    _isEditing = (status == null || status.isEmpty || status == 'REJECTED');
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _licenseCtrl.dispose();
    _feeCtrl.dispose();
    super.dispose();
  }

  Future<void> _submitVerification() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isSaving = true;
    });

    try {
      final api = context.read<ApiClient>();
      // Clean up empty links
      final cleanLinks = _links.map((l) => l.trim()).where((l) => l.isNotEmpty).toList();

      if (cleanLinks.isEmpty) {
        throw Exception('At least one certification link is required.');
      }

      final uniqueLinks = cleanLinks.toSet().toList();
      if (cleanLinks.length != uniqueLinks.length) {
        throw Exception('Duplicate certificate links are not allowed.');
      }

      final auth = context.read<AuthProvider>();
      final response = await api.put(
        '/api/nutritionists/profile/me',
        data: {
          'professionalTitle': _titleCtrl.text.trim(),
          'licenseNumber': _licenseCtrl.text.trim(),
          'serviceFee': int.parse(_feeCtrl.text.trim()),
          'certificateUrl': cleanLinks.join(','),
        },
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        // Refresh session to pull updated approvalStatus
        await auth.restoreSession();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Submission successful!'),
              backgroundColor: Colors.green,
            ),
          );
          setState(() {
            _isEditing = false;
          });
        }
      } else {
        throw Exception(response.data['message'] ?? 'Failed to submit verification profile');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final status = user?.approvalStatus?.toUpperCase();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Expert Verification',
          style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: AppColors.error),
            onPressed: () => auth.logout(),
            tooltip: 'Log Out',
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Status Banner ──
              _buildStatusBanner(status),
              const SizedBox(height: 24),

              if (!_isEditing) ...[
                // ── Info View Screen ──
                _buildSubmittedDetailsView(user),
              ] else ...[
                // ── Submission Form ──
                Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Submit Professional Credentials',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 18),

                      TextFormField(
                        controller: _titleCtrl,
                        decoration: InputDecoration(
                          labelText: 'Professional Title',
                          hintText: 'e.g. Senior Dietitian / Nutrition Specialist',
                          prefixIcon: const Icon(Icons.badge_outlined),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Title is required' : null,
                      ),
                      const SizedBox(height: 16),

                      TextFormField(
                        controller: _licenseCtrl,
                        decoration: InputDecoration(
                          labelText: 'License / Certification Number',
                          hintText: 'e.g. LC-1092837',
                          prefixIcon: const Icon(Icons.verified_user_outlined),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'License number is required' : null,
                      ),
                      const SizedBox(height: 16),

                      TextFormField(
                        controller: _feeCtrl,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          labelText: 'Consultation Fee (VND)',
                          hintText: 'e.g. 200000',
                          prefixIcon: const Icon(Icons.attach_money_rounded),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) return 'Fee is required';
                          final val = int.tryParse(v.trim());
                          if (val == null || val <= 0) return 'Enter a valid positive fee';
                          return null;
                        },
                      ),
                      const SizedBox(height: 24),

                      // ── Links Header ──
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Certificate URLs / Links',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          TextButton.icon(
                            onPressed: () {
                              setState(() {
                                _links.add('');
                              });
                            },
                            icon: const Icon(Icons.add_circle_outline_rounded, size: 18),
                            label: const Text('Add Link'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      // ── Links List ──
                      ..._links.asMap().entries.map((entry) {
                        final idx = entry.key;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Row(
                            children: [
                              Expanded(
                                child: TextFormField(
                                  initialValue: entry.value,
                                  decoration: InputDecoration(
                                    labelText: 'Certificate URL #${idx + 1}',
                                    hintText: 'https://credentials.com/verify/...',
                                    prefixIcon: const Icon(Icons.link_rounded),
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                  onChanged: (val) {
                                    _links[idx] = val;
                                  },
                                  validator: (v) {
                                    if (v == null || v.trim().isEmpty) {
                                      if (idx == 0) return 'At least one certificate link is required';
                                      return null;
                                    }
                                    final trimmedVal = v.trim();
                                    if (!trimmedVal.startsWith('http://') && !trimmedVal.startsWith('https://')) {
                                      return 'Must start with http:// or https://';
                                    }
                                    final count = _links.where((link) => link.trim() == trimmedVal).length;
                                    if (count > 1) {
                                      return 'Duplicate link: this link has already been entered';
                                    }
                                    return null;
                                  },
                                ),
                              ),
                              if (idx > 0) ...[
                                const SizedBox(width: 8),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline_rounded, color: AppColors.error),
                                  onPressed: () {
                                    setState(() {
                                      _links.removeAt(idx);
                                    });
                                  },
                                ),
                              ],
                            ],
                          ),
                        );
                      }),
                      const SizedBox(height: 24),

                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: _isSaving ? null : _submitVerification,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          child: _isSaving
                              ? const CircularProgressIndicator(color: Colors.white)
                              : const Text(
                                  'Submit for Approval',
                                  style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                                ),
                        ),
                      ),
                      if (status == 'PENDING') ...[
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          height: 52,
                          child: OutlinedButton(
                            onPressed: () {
                              setState(() {
                                _isEditing = false;
                              });
                            },
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: AppColors.primary),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            ),
                            child: const Text(
                              'Cancel',
                              style: TextStyle(color: AppColors.primary, fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBanner(String? status) {
    Color bannerColor;
    IconData icon;
    String titleText;
    String subtitleText;

    if (status == 'PENDING') {
      bannerColor = Colors.orange.shade50;
      icon = Icons.hourglass_empty_rounded;
      titleText = 'Submission Successful';
      subtitleText =
          'Your verification request has been successfully submitted! Please wait for administrator approval.';
    } else if (status == 'REJECTED') {
      bannerColor = const Color(0xFFFFEBEE);
      icon = Icons.cancel_outlined;
      titleText = 'Verification Rejected';
      subtitleText = 'Your submission was rejected by the administrator. Please update and re-submit your profile.';
    } else {
      bannerColor = Colors.blue.shade50;
      icon = Icons.info_outline_rounded;
      titleText = 'Account Setup Required';
      subtitleText = 'To start using the Wealthy Eater platform, please submit your professional qualifications.';
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: bannerColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: status == 'PENDING'
              ? Colors.orange.shade200
              : (status == 'REJECTED' ? const Color(0xFFFFCDD2) : Colors.blue.shade200),
          width: 1.5,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            icon,
            color: status == 'PENDING'
                ? Colors.orange.shade800
                : (status == 'REJECTED' ? AppColors.error : Colors.blue.shade800),
            size: 28,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  titleText,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: status == 'PENDING'
                        ? Colors.orange.shade900
                        : (status == 'REJECTED' ? const Color(0xFFC62828) : Colors.blue.shade900),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  subtitleText,
                  style: TextStyle(
                    fontSize: 13,
                    color: status == 'PENDING'
                        ? Colors.orange.shade900.withValues(alpha: 0.8)
                        : (status == 'REJECTED' ? const Color(0xFFD32F2F) : Colors.blue.shade900.withValues(alpha: 0.8)),
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSubmittedDetailsView(dynamic user) {
    final rawLinks = user?.certificationUrl ?? '';
    final linkList = rawLinks.isNotEmpty ? rawLinks.split(',') : [];

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
            color: Color(0x06000000),
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Submitted Information',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const Divider(height: 24),

          _buildDetailRow('Title', user?.professionalTitle ?? 'N/A'),
          const SizedBox(height: 12),
          _buildDetailRow('License ID', user?.licenseNumber ?? 'N/A'),
          const SizedBox(height: 12),
          _buildDetailRow(
            'Consultation Fee',
            user?.serviceFee != null ? '${user.serviceFee.toStringAsFixed(0)} VND' : 'N/A',
          ),
          const SizedBox(height: 16),

          const Text(
            'Certificate Links',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 8),
          if (linkList.isEmpty)
            const Text('No links uploaded.', style: TextStyle(color: AppColors.textTertiary, fontSize: 13))
          else
            ...linkList.map((link) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    children: [
                      const Icon(Icons.link_rounded, size: 16, color: AppColors.primary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          link,
                          style: const TextStyle(color: AppColors.primary, fontSize: 13, decoration: TextDecoration.underline),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                )),
          const SizedBox(height: 28),

          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton.icon(
              onPressed: () {
                setState(() {
                  _isEditing = true;
                });
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.edit_note_rounded, color: Colors.white),
              label: const Text(
                'Edit Submission',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textTertiary, fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(fontSize: 14, color: AppColors.textPrimary, fontWeight: FontWeight.w600)),
      ],
    );
  }
}
