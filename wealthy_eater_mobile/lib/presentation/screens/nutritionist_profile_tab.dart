import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/theme/app_colors.dart';
import '../providers/auth_provider.dart';
import '../providers/nutritionist_provider.dart';
import 'change_password_screen.dart';
import 'edit_nutritionist_profile_screen.dart';

class NutritionistProfileTab extends StatefulWidget {
  const NutritionistProfileTab({super.key});

  @override
  State<NutritionistProfileTab> createState() => _NutritionistProfileTabState();
}

class _NutritionistProfileTabState extends State<NutritionistProfileTab> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NutritionistProvider>().fetchMyProfile();
    });
  }

  void _showLinkDialog(BuildContext context, bool isEmail) {
    final inputController = TextEditingController();
    final otpController = TextEditingController();
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) {
        bool isLoading = false;
        bool isCodeSent = false;

        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: Text(isCodeSent 
                  ? 'Verify Code' 
                  : (isEmail ? 'Link & Verify Email' : 'Link & Verify Phone')),
              content: Form(
                key: formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (!isCodeSent) ...[
                      Text(
                        isEmail
                            ? 'Link your email address to this account to enable email sign-in and receive notifications.'
                            : 'Link your phone number to this account to enable SMS OTP authentication.',
                        style: const TextStyle(fontSize: 14, color: Colors.black54),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: inputController,
                        keyboardType: isEmail ? TextInputType.emailAddress : TextInputType.phone,
                        decoration: InputDecoration(
                          labelText: isEmail ? 'Email Address' : 'Phone Number',
                          prefixIcon: Icon(isEmail ? Icons.email_outlined : Icons.phone_outlined),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return isEmail ? 'Email is required' : 'Phone number is required';
                          }
                          final trimmed = value.trim();
                          if (isEmail) {
                            final emailRegex = RegExp(r'^[^@]+@[^@]+\.[^@]+');
                            if (!emailRegex.hasMatch(trimmed)) return 'Enter a valid email address';
                          } else {
                            final phoneRegex = RegExp(r'^[0-9]{10}$');
                            if (!phoneRegex.hasMatch(trimmed)) return 'Phone number must be exactly 10 digits';
                          }
                          return null;
                        },
                      ),
                    ] else ...[
                      Text(
                        isEmail
                            ? 'Enter the 6-digit verification code sent to ${inputController.text.trim()}'
                            : 'Enter the 6-digit verification code sent to ${inputController.text.trim()}',
                        style: const TextStyle(fontSize: 14, color: Colors.black54),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: otpController,
                        keyboardType: TextInputType.number,
                        maxLength: 6,
                        decoration: const InputDecoration(
                          labelText: 'Verification Code',
                          prefixIcon: Icon(Icons.pin_outlined),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) return 'Verification code is required';
                          if (value.trim().length < 6) return 'Verification code must be 6 digits';
                          return null;
                        },
                      ),
                    ],
                  ],
                ),
              ),
              actions: [
                if (!isCodeSent) ...[
                  TextButton(
                    onPressed: isLoading ? null : () => Navigator.pop(dialogCtx),
                    child: const Text('Cancel'),
                  ),
                  FilledButton(
                    onPressed: isLoading
                        ? null
                        : () async {
                            if (!formKey.currentState!.validate()) return;
                            setState(() => isLoading = true);
                            final auth = dialogCtx.read<AuthProvider>();
                            final success = await auth.linkRequest(inputController.text.trim());
                            if (dialogCtx.mounted) {
                              setState(() => isLoading = false);
                              if (success) {
                                setState(() {
                                  isCodeSent = true;
                                });
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Verification code sent successfully!')),
                                );
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(auth.errorMessage ?? 'Failed to send verification code')),
                                );
                              }
                            }
                          },
                    child: isLoading
                        ? const SizedBox(
                            height: 16,
                            width: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Text('Send OTP'),
                  ),
                ] else ...[
                  TextButton(
                    onPressed: isLoading
                        ? null
                        : () {
                            setState(() {
                              isCodeSent = false;
                              otpController.clear();
                            });
                          },
                    child: const Text('Back'),
                  ),
                  FilledButton(
                    onPressed: isLoading
                        ? null
                        : () async {
                            if (!formKey.currentState!.validate()) return;
                            setState(() => isLoading = true);
                            final auth = dialogCtx.read<AuthProvider>();
                            final success = await auth.linkVerify(otpController.text.trim());
                            if (dialogCtx.mounted) {
                              setState(() => isLoading = false);
                              if (success) {
                                Navigator.pop(dialogCtx);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(isEmail
                                        ? 'Email linked successfully!'
                                        : 'Phone number linked successfully!'),
                                  ),
                                );
                                // Refresh AuthProvider and NutritionistProvider states
                                await auth.fetchUserProfile();
                                if (dialogCtx.mounted) {
                                  dialogCtx.read<NutritionistProvider>().fetchMyProfile();
                                }
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(auth.errorMessage ?? 'Verification failed')),
                                );
                              }
                            }
                          },
                    child: isLoading
                        ? const SizedBox(
                            height: 16,
                            width: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Text('Verify & Link'),
                  ),
                ],
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _viewCertificate(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open certificate URL')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final primaryColor = Theme.of(context).colorScheme.primary;

    return Consumer<NutritionistProvider>(
      builder: (context, provider, child) {
        if (provider.isLoadingProfile) {
          return const Center(child: CircularProgressIndicator());
        }

        if (provider.profileError != null) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 12),
                  Text(provider.profileError!, textAlign: TextAlign.center),
                  const SizedBox(height: 20),
                  FilledButton.icon(
                    onPressed: () => provider.fetchMyProfile(),
                    icon: const Icon(Icons.refresh),
                    label: const Text('Retry'),
                  ),
                ],
              ),
            ),
          );
        }

        final profile = provider.myProfile;
        if (profile == null) {
          return Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: primaryColor.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(Icons.person_search_outlined, size: 80, color: primaryColor),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'Profile Not Configured',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.black87),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Your professional profile credentials could not be loaded. Please ensure you are fully registered.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 15, color: Colors.grey, height: 1.5),
                  ),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: () => provider.fetchMyProfile(),
                    child: const Text('Retry Fetching Profile'),
                  ),
                ],
              ),
            ),
          );
        }

        final fullName = profile['full_name']?.toString() ?? 'New Expert';
        final professionalTitle = profile['professional_title']?.toString() ?? 'Nutritionist';
        final specialization = profile['specialization']?.toString() ?? 'General Dietetics';
        final serviceFee = (profile['service_fee'] as num?)?.toInt() ?? 0;
        final licenseNumber = profile['license_number']?.toString() ?? 'VN-PENDING';
        final approvalStatus = profile['approval_status']?.toString() ?? 'PENDING';
        final certificationUrl = profile['certification_url']?.toString() ?? '';

        final dynamic rawUser = profile['user_id'];
        final Map<String, dynamic>? userObj = rawUser is Map 
            ? Map<String, dynamic>.from(rawUser) 
            : null;
        final email = userObj?['email']?.toString() ?? '';
        final phone = userObj?['phone']?.toString() ?? '';

        // Status styling
        Color statusBgColor = Colors.orange.shade50;
        Color statusTextColor = Colors.orange.shade800;
        Color statusBorderColor = Colors.orange.shade200;

        if (approvalStatus.toUpperCase() == 'APPROVED' || approvalStatus.toUpperCase() == 'APPROVAL') {
          statusBgColor = AppColors.primaryLight;
          statusTextColor = AppColors.primaryDark;
          statusBorderColor = AppColors.border;
        } else if (approvalStatus.toUpperCase() == 'REJECTED' || approvalStatus.toUpperCase() == 'REJECT') {
          statusBgColor = Colors.red.shade50;
          statusTextColor = Colors.red.shade800;
          statusBorderColor = Colors.red.shade200;
        }

        return Scaffold(
          body: RefreshIndicator(
            onRefresh: () async {
              await provider.fetchMyProfile();
            },
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(20),
              children: [
                // ── Header & Profile Avatar ──
                Center(
                  child: Column(
                    children: [
                      Container(
                        width: 96,
                        height: 96,
                        decoration: BoxDecoration(
                          color: primaryColor.withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                          border: Border.all(color: primaryColor, width: 2),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          fullName.isNotEmpty ? fullName[0].toUpperCase() : 'N',
                          style: TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: primaryColor),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        fullName,
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.black87),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        professionalTitle,
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: Colors.grey[600]),
                      ),
                      const SizedBox(height: 12),

                      // Approval status badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                        decoration: BoxDecoration(
                          color: statusBgColor,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: statusBorderColor),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              approvalStatus.toUpperCase() == 'APPROVED' || approvalStatus.toUpperCase() == 'APPROVAL'
                                  ? Icons.check_circle_outline
                                  : (approvalStatus.toUpperCase() == 'REJECTED' || approvalStatus.toUpperCase() == 'REJECT'
                                      ? Icons.cancel_outlined
                                      : Icons.hourglass_empty_outlined),
                              size: 16,
                              color: statusTextColor,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              approvalStatus.toUpperCase(),
                              style: TextStyle(fontSize: 12, color: statusTextColor, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Edit Profile & Change Password Row
                      Wrap(
                        spacing: 12,
                        runSpacing: 10,
                        alignment: WrapAlignment.center,
                        children: [
                          OutlinedButton.icon(
                            onPressed: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => const EditNutritionistProfileScreen(),
                                ),
                              );
                            },
                            icon: const Icon(Icons.edit_outlined, size: 18),
                            label: const Text('Edit Profile'),
                            style: OutlinedButton.styleFrom(
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                            ),
                          ),
                          TextButton.icon(
                            onPressed: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => const ChangePasswordScreen(),
                                ),
                              );
                            },
                            icon: const Icon(Icons.lock_outline, size: 16),
                            label: const Text(
                              'Change Password',
                              style: TextStyle(fontWeight: FontWeight.w600),
                            ),
                            style: TextButton.styleFrom(
                              foregroundColor: primaryColor,
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),

                // ── Account Links ──
                _buildSectionCard(
                  title: 'Linked Credentials',
                  icon: Icons.link_outlined,
                  primaryColor: primaryColor,
                  children: [
                    if (email.isEmpty) ...[
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Email Address', style: TextStyle(color: Colors.black54)),
                          TextButton(
                            onPressed: () => _showLinkDialog(context, true),
                            child: const Text('Link Email'),
                          ),
                        ],
                      ),
                    ] else ...[
                      _buildInfoRow('Email Address', email),
                    ],
                    if (phone.isEmpty) ...[
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Phone Number', style: TextStyle(color: Colors.black54)),
                          TextButton(
                            onPressed: () => _showLinkDialog(context, false),
                            child: const Text('Link Phone'),
                          ),
                        ],
                      ),
                    ] else ...[
                      _buildInfoRow('Phone Number', phone),
                    ],
                  ],
                ),
                const SizedBox(height: 16),

                // ── Professional Qualifications ──
                _buildSectionCard(
                  title: 'Career & Services',
                  icon: Icons.assignment_ind_outlined,
                  primaryColor: primaryColor,
                  children: [
                    _buildInfoRow('Specialty', specialization),
                    _buildInfoRow('License Number', licenseNumber),
                    _buildInfoRow(
                      'Consultation Fee',
                      '${serviceFee.toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (match) => ',')} VND',
                      valueColor: primaryColor,
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // ── Certification URL ──
                _buildSectionCard(
                  title: 'Certification Verification',
                  icon: Icons.verified_outlined,
                  primaryColor: primaryColor,
                  children: [
                    const SizedBox(height: 4),
                    const Text(
                      'Current Uploaded Certificate Document:',
                      style: TextStyle(fontSize: 13, color: Colors.black54),
                    ),
                    const SizedBox(height: 12),
                    if (certificationUrl.isNotEmpty) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: primaryColor.withValues(alpha: 0.05),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: primaryColor.withValues(alpha: 0.15)),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.description_outlined, color: primaryColor, size: 24),
                            const SizedBox(width: 12),
                            const Expanded(
                              child: Text(
                                'Professional Certificate Document',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                            ),
                            TextButton.icon(
                              onPressed: () => _viewCertificate(certificationUrl),
                              icon: const Icon(Icons.open_in_new, size: 14),
                              label: const Text('View', style: TextStyle(fontSize: 12)),
                            ),
                          ],
                        ),
                      ),
                    ] else ...[
                      Text(
                        'No certificate document linked. Please update your profile.',
                        style: TextStyle(color: Colors.red[700], fontStyle: FontStyle.italic, fontSize: 13),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildSectionCard({
    required String title,
    required IconData icon,
    required Color primaryColor,
    required List<Widget> children,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: primaryColor, size: 22),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.black87),
              ),
            ],
          ),
          const Divider(height: 24, thickness: 0.8),
          ...children,
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(fontSize: 14, color: Colors.grey[600], fontWeight: FontWeight.w500),
          ),
          Flexible(
            child: Text(
              value,
              textAlign: Alignment.centerRight.x > 0 ? TextAlign.right : TextAlign.left,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: valueColor ?? Colors.black87,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
