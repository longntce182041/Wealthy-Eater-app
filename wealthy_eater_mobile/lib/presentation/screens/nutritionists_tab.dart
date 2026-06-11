import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../data/models/nutritionist_model.dart';
import '../providers/consultation_provider.dart';
import '../providers/nutritionist_provider.dart';
import 'my_nutritionist_dashboard.dart';
import 'nutritionist_detail_screen.dart';
import 'payment_checkout_screen.dart';

class NutritionistsTab extends StatefulWidget {
  const NutritionistsTab({super.key});

  @override
  State<NutritionistsTab> createState() => _NutritionistsTabState();
}

class _NutritionistsTabState extends State<NutritionistsTab> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NutritionistProvider>().fetchNutritionists();
      context.read<ConsultationProvider>().loadActiveContract();
    });
  }

  // Generate deterministic colors based on index for the avatar
  Color _getBgColor(int index) {
    const colors = [Color(0xFFE3F2FD), Color(0xFFE8F5E9), Color(0xFFFFF3E0), Color(0xFFFCE4EC), Color(0xFFF3E5F5)];
    return colors[index % colors.length];
  }

  Color _getFgColor(int index) {
    const colors = [Color(0xFF1E88E5), Color(0xFF43A047), Color(0xFFFB8C00), Color(0xFFD81B60), Color(0xFF8E24AA)];
    return colors[index % colors.length];
  }

  void _showHireSheet(BuildContext context, NutritionistModel doctor) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color.fromARGB(255, 247, 250, 245),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) {
        return _HireConfirmationSheet(doctor: doctor);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Consumer<ConsultationProvider>(
      builder: (context, consultProvider, child) {
        if (consultProvider.isLoadingActiveContract) {
          return const Center(child: CircularProgressIndicator());
        }

        if (consultProvider.hasActiveNutritionist) {
          return MyNutritionistDashboard(contract: consultProvider.activeContract!);
        }

        return Consumer<NutritionistProvider>(
          builder: (context, provider, child) {
            if (provider.isLoading) {
              return const Center(child: CircularProgressIndicator());
            }

        if (provider.error != null) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, color: Colors.red, size: 48),
                const SizedBox(height: 16),
                Text(
                  'Failed to load nutritionists',
                  style: theme.textTheme.titleMedium,
                ),
                TextButton(
                  onPressed: () => provider.fetchNutritionists(),
                  child: const Text('Retry'),
                )
              ],
            ),
          );
        }

        final nutritionists = provider.nutritionists;

        return ListView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
          children: [
            if (nutritionists.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(32.0),
                  child: Text('No nutritionists available at the moment.'),
                ),
              ),

            // Doctors List
            ...nutritionists.asMap().entries.map((entry) {
              final index = entry.key;
              final doc = entry.value;
              final bgColor = _getBgColor(index);
              final fgColor = _getFgColor(index);

              return Container(
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                  color: theme.cardTheme.color ?? Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.02),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(24),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () async {
                        final shouldBook = await Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => NutritionistDetailScreen(
                              nutritionist: doc,
                              bgColor: bgColor,
                              fgColor: fgColor,
                            ),
                          ),
                        );
                        if (shouldBook == true && context.mounted) {
                          _showHireSheet(context, doc);
                        }
                      },
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Doctor Avatar
                                Container(
                                  width: 64,
                                  height: 64,
                                  decoration: BoxDecoration(
                                    color: bgColor,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Center(
                                    child: Text(
                                      doc.initials,
                                      style: TextStyle(
                                        color: fgColor,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 20,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 16),
                                // Doctor Info
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Expanded(
                                            child: Text(
                                              doc.fullName,
                                              style: theme.textTheme.titleMedium?.copyWith(
                                                fontWeight: FontWeight.bold,
                                                color: theme.colorScheme.tertiary,
                                              ),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                          Row(
                                            children: [
                                              const Icon(Icons.star, color: Colors.amber, size: 18),
                                              const SizedBox(width: 4),
                                              Text(
                                                doc.averageRating.toStringAsFixed(1),
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 14,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        doc.specialization,
                                        style: TextStyle(
                                          color: theme.colorScheme.primary,
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 14),
                            // Default bio/description when none is provided
                            Text(
                              'Certified professional ready to guide you towards a healthier lifestyle through custom meal plans and expert nutrition advice.',
                              style: TextStyle(
                                color: Colors.grey.shade600,
                                fontSize: 12,
                                height: 1.5,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const Divider(height: 24),
                            // Cost & CTA
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'CONSULTATION FEE',
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: Colors.grey.shade500,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '${doc.serviceFee.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]}.')} VND',
                                      style: TextStyle(
                                        fontSize: 16,
                                        color: theme.colorScheme.tertiary,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ],
                                ),
                                FilledButton.icon(
                                  onPressed: () => _showHireSheet(context, doc),
                                  icon: const Icon(Icons.handshake_outlined, size: 16),
                                  label: const Text(
                                    'Hire',
                                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                  ),
                                  style: FilledButton.styleFrom(
                                    backgroundColor: theme.colorScheme.primary,
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              );
            }),
          ],
        );
      },
    );
      },
    );
  }
}

/// Bottom sheet for confirming the hire and initiating PayOS payment.
class _HireConfirmationSheet extends StatefulWidget {
  final NutritionistModel doctor;

  const _HireConfirmationSheet({required this.doctor});

  @override
  State<_HireConfirmationSheet> createState() => _HireConfirmationSheetState();
}

class _HireConfirmationSheetState extends State<_HireConfirmationSheet> {
  bool _isProcessing = false;
  String? _error;
  String _selectedPackage = '1_month';

  String _formatCurrency(int value) {
    return '${value.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')} VND';
  }

  Future<void> _handleHire() async {
    setState(() {
      _isProcessing = true;
      _error = null;
    });

    final provider = context.read<ConsultationProvider>();
    final navigator = Navigator.of(context);
    final scaffoldMessenger = ScaffoldMessenger.of(context);

    await provider.hireNutritionist(widget.doctor.id, packageType: _selectedPackage);

    if (!mounted) return;

    if (provider.checkoutState == CheckoutState.error) {
      setState(() {
        _isProcessing = false;
        _error = provider.checkoutError;
      });
      return;
    }

    if (provider.checkoutState == CheckoutState.success &&
        provider.checkoutResult != null) {
      final result = provider.checkoutResult!;
      
      // Load PayOS URLs so WebView knows what to intercept
      await provider.loadPayOSUrls();

      if (!mounted) return;
      
      navigator.pop(); // Close bottom sheet

      // Navigate to payment checkout screen
      final paymentCompleted = await navigator.push<bool>(
        MaterialPageRoute(
          builder: (_) => PaymentCheckoutScreen(
            checkoutUrl: result.checkoutUrl,
          ),
        ),
      );

      if (!mounted) return;

      if (paymentCompleted == true) {
        scaffoldMessenger.showSnackBar(
          const SnackBar(
            content: Text('Verifying payment... Please wait.'),
            backgroundColor: Colors.blue,
          ),
        );
        provider.resetCheckout();
        // Crucial step: Poll to load the active contract and swap the UI instantly!
        await provider.verifyAndLoadActiveContract();
      } else {
        scaffoldMessenger.showSnackBar(
          const SnackBar(
            content: Text('Payment cancelled.'),
            backgroundColor: Colors.orange,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final doc = widget.doctor;

    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle bar
          Center(
            child: Container(
              width: 36,
              height: 5,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2.5),
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Title
          Text(
            'Hire Nutritionist',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
              color: theme.colorScheme.tertiary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Confirm hiring ${doc.fullName}',
            style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
          ),
          const SizedBox(height: 24),

          // Doctor summary
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor:
                      theme.colorScheme.primary.withValues(alpha: 0.15),
                  child: Text(
                    doc.initials,
                    style: TextStyle(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        doc.fullName,
                        style: theme.textTheme.titleSmall
                            ?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      Text(
                        doc.specialization,
                        style: TextStyle(
                          color: theme.colorScheme.primary,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'CONSULTATION FEE',
                      style: TextStyle(
                        fontSize: 9,
                        color: Colors.grey.shade500,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      _formatCurrency(doc.serviceFee),
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: theme.colorScheme.tertiary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          
          // Package Selection
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'Select Package Duration',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: theme.colorScheme.tertiary,
              ),
            ),
          ),
          const SizedBox(height: 12),
          _buildPackageOption(
            context,
            id: '1_month',
            title: '1 Month',
            subtitle: 'Standard plan',
            price: doc.calculatePriceForPackage('1_month'),
          ),
          const SizedBox(height: 8),
          _buildPackageOption(
            context,
            id: '3_months',
            title: '3 Months',
            subtitle: 'Save 11%',
            price: doc.calculatePriceForPackage('3_months'),
            badge: 'POPULAR',
          ),
          const SizedBox(height: 8),
          _buildPackageOption(
            context,
            id: '6_months',
            title: '6 Months',
            subtitle: 'Save 16%',
            price: doc.calculatePriceForPackage('6_months'),
            badge: 'BEST VALUE',
          ),
          const SizedBox(height: 16),

          // Error message
          if (_error != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.error_outline,
                      color: Colors.red.shade600, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _error!,
                      style:
                          TextStyle(color: Colors.red.shade700, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),

          // Confirm button
          FilledButton(
            onPressed: _isProcessing ? null : _handleHire,
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(54),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18)),
              backgroundColor: theme.colorScheme.primary,
            ),
            child: _isProcessing
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Text(
                    'Confirm & Pay ${_formatCurrency(doc.calculatePriceForPackage(_selectedPackage))}',
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 15),
                  ),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }

  Widget _buildPackageOption(BuildContext context, {
    required String id,
    required String title,
    required String subtitle,
    required int price,
    String? badge,
  }) {
    final theme = Theme.of(context);
    final isSelected = _selectedPackage == id;
    
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedPackage = id;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? theme.colorScheme.primary.withValues(alpha: 0.1) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? theme.colorScheme.primary : Colors.grey.shade300,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.radio_button_checked : Icons.radio_button_unchecked,
              color: isSelected ? theme.colorScheme.primary : Colors.grey.shade400,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: isSelected ? theme.colorScheme.primary : theme.colorScheme.tertiary,
                        ),
                      ),
                      if (badge != null) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: badge == 'POPULAR' ? Colors.orange.shade100 : Colors.green.shade100,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            badge,
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                              color: badge == 'POPULAR' ? Colors.orange.shade800 : Colors.green.shade800,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  Text(
                    subtitle,
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ],
              ),
            ),
            Text(
              _formatCurrency(price),
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
                color: theme.colorScheme.tertiary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
