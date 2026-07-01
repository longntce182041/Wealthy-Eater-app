// ignore_for_file: unused_element, use_null_aware_elements, unnecessary_underscores
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';

import '../../domain/entities/user.dart';
import '../providers/auth_provider.dart';
import '../../core/theme/app_colors.dart';
import 'chatbot_screen.dart';
import 'profile_form_screen.dart';

class DashboardHomeTab extends StatefulWidget {
  final UserEntity? user;
  final VoidCallback onExploreRecipes;

  const DashboardHomeTab({super.key, this.user, required this.onExploreRecipes});

  @override
  State<DashboardHomeTab> createState() => _DashboardHomeTabState();
}

class _DashboardHomeTabState extends State<DashboardHomeTab> {
  final TextEditingController _weightLogCtrl = TextEditingController();
  bool _isSaving = false;
  bool _hasPrepopulated = false;

  @override
  void initState() {
    super.initState();
    // Fetch weight logs history reactively when widget is mounted
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AuthProvider>().fetchWeightHistory();
    });
  }

  @override
  void dispose() {
    _weightLogCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final profile = auth.userProfile;

    // Prepopulate user weight logs entry field with their current weight from profile
    if (!_hasPrepopulated && profile != null && profile['weight'] != null) {
      _weightLogCtrl.text = profile['weight'].toString();
      _hasPrepopulated = true;
    }

        // Extract health metric statistics from profile
        final double bmi = (profile?['bmi'] as num?)?.toDouble() ?? 0.0;
        final int bmr = (profile?['bmr'] as num?)?.toInt() ?? 0;
        final int tdee = (profile?['tdee'] as num?)?.toInt() ?? 0;
        final double height = (profile?['height'] as num?)?.toDouble() ?? 0.0;
        final double weight = (profile?['weight'] as num?)?.toDouble() ?? 0.0;
        final int age = (profile?['age'] as num?)?.toInt() ?? 0;
        final String goal = profile?['health_goal']?.toString() ?? '';
        final String activity = profile?['dietary_references']?['activity_level']?.toString() ?? '';

        // Dynamic BMI category colors, titles, and messages
        String bmiCategory = 'Unknown';
        Color bmiColor = Colors.grey;
        String bmiMessage = '';

        if (bmi > 0) {
          if (bmi < 18.5) {
            bmiCategory = 'Underweight';
            bmiColor = Colors.blue;
            bmiMessage = 'Your body weight is lower than standard. Consider increasing calorie intake and consulting a nutritionist.';
          } else if (bmi < 25.0) {
            bmiCategory = 'Normal';
            bmiColor = Colors.green;
            bmiMessage = 'Great job! Your weight is in the healthy range. Keep maintaining your active lifestyle and balanced eating habits.';
          } else if (bmi < 30.0) {
            bmiCategory = 'Overweight';
            bmiColor = Colors.orange;
            bmiMessage = 'Your weight is slightly above standard. Combining portion control with regular exercise will help you reach a healthy range.';
          } else {
            bmiCategory = 'Obese';
            bmiColor = Colors.red;
            bmiMessage = 'Your weight is significantly above standard. We recommend speaking with a certified nutritionist to build a structured health plan.';
          }
        }

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
      children: [
            // Health Status Cards / Banner
            if (profile == null) ...[
              const _SetupProfileCard(),
              const SizedBox(height: 20),
            ] else ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Your health status',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: Colors.black87,
                        ),
                  ),
                  TextButton.icon(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const ProfileFormScreen()),
                      );
                    },
                    icon: const Icon(Icons.edit_note, size: 20),
                    label: const Text('Update'),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              
              // BMI Card
              Card(
                elevation: 2,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Body Mass Index (BMI)',
                            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                  color: Colors.grey.shade600,
                                  fontWeight: FontWeight.w600,
                                ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: bmiColor.withAlpha(30),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: bmiColor.withAlpha(80)),
                            ),
                            child: Text(
                              bmiCategory,
                              style: TextStyle(
                                color: bmiColor,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.baseline,
                        textBaseline: TextBaseline.alphabetic,
                        children: [
                          Text(
                            bmi.toStringAsFixed(1),
                            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                  fontWeight: FontWeight.w900,
                                  color: Colors.black87,
                                ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'kg/m²',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Colors.grey.shade500,
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _BmiGauge(bmi: bmi),
                      const SizedBox(height: 12),
                      Text(
                        bmiMessage,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Colors.grey.shade700,
                              height: 1.3,
                            ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // BMR & TDEE side-by-side
              Row(
                children: [
                  Expanded(
                    child: Card(
                      elevation: 2,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: Colors.orange.shade50,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.local_fire_department,
                                    color: Colors.orange,
                                    size: 20,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'BMR',
                                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                          color: Colors.grey.shade600,
                                          fontWeight: FontWeight.bold,
                                        ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Text(
                              '$bmr',
                              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                    fontWeight: FontWeight.w900,
                                    color: Colors.black87,
                                  ),
                            ),
                            Text(
                              'kcal / day',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: Colors.grey.shade500,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Energy needed at complete rest.',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: Colors.grey.shade600,
                                    fontSize: 11,
                                    height: 1.2,
                                  ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Card(
                      elevation: 2,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: Colors.amber.shade50,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    Icons.bolt_rounded,
                                    color: Colors.amber.shade700,
                                    size: 20,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'TDEE',
                                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                          color: Colors.grey.shade600,
                                          fontWeight: FontWeight.bold,
                                        ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Text(
                              '$tdee',
                              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                    fontWeight: FontWeight.w900,
                                    color: Colors.black87,
                                  ),
                            ),
                            Text(
                              'kcal / day',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: Colors.grey.shade500,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              activity.isNotEmpty 
                                  ? 'Total daily burn with activity: ${activity.toUpperCase()}'
                                  : 'Total daily burn with activity.',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: Colors.grey.shade600,
                                    fontSize: 11,
                                    height: 1.2,
                                  ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              
              // Basic stats summary
              Card(
                color: Colors.grey.shade50,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: Colors.grey.shade200),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildStatSubItem('Height', '${height.toStringAsFixed(0)} cm'),
                      _buildDivider(),
                      _buildStatSubItem('Weight', '${weight.toStringAsFixed(1)} kg'),
                      _buildDivider(),
                      _buildStatSubItem('Age', '$age yrs'),
                      _buildDivider(),
                      _buildStatSubItem('Goal', goal.toUpperCase()),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Weight Log and Chart Section
              _buildNutriBotBanner(context),
              const SizedBox(height: 16),
              _buildWeightTrackingCard(context, auth),
              const SizedBox(height: 20),
            ],
      ],
    );
  }

  Widget _buildStatSubItem(String label, String value) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.w600)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.black87)),
      ],
    );
  }

  Widget _buildDivider() {
    return Container(
      width: 1,
      height: 24,
      color: Colors.grey.shade300,
    );
  }

  // ── NutriBot Banner ────────────────────────────────────────────────────────

  Widget _buildNutriBotBanner(BuildContext context) {
    return GestureDetector(
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const ChatbotScreen()),
      ),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [AppColors.primary, AppColors.primaryDark],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.25),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.15),
              ),
              child: const Icon(
                Icons.psychology_rounded,
                color: Colors.white,
                size: 28,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text(
                    'Ask NutriBot now',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  SizedBox(height: 3),
                  Text(
                    'Your personal AI nutrition assistant',
                    style: TextStyle(
                      color: AppColors.primaryLight,
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.arrow_forward_ios_rounded,
              color: Colors.white54,
              size: 16,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWeightTrackingCard(BuildContext context, AuthProvider auth) {
    bool isRateLimited = false;
    int daysRemaining = 0;
    String lastLogDateStr = '';

    if (auth.weightHistory.isNotEmpty) {
      final lastLog = auth.weightHistory.last;
      final lastDateStr = lastLog['date']?.toString();
      if (lastDateStr != null) {
        final lastDate = DateTime.tryParse(lastDateStr)?.toLocal();
        if (lastDate != null) {
          final now = DateTime.now();
          final todayDateOnly = DateTime(now.year, now.month, now.day);
          final lastLogDateOnly = DateTime(lastDate.year, lastDate.month, lastDate.day);
          final differenceInDays = todayDateOnly.difference(lastLogDateOnly).inDays;
          if (differenceInDays < 7) {
            isRateLimited = true;
            daysRemaining = 7 - differenceInDays;
            lastLogDateStr = lastDateStr;
          }
        }
      }
    }

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Weight Log & Tracking',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: Colors.black87,
                      ),
                ),
                Icon(Icons.show_chart, color: Theme.of(context).colorScheme.primary),
              ],
            ),
            const SizedBox(height: 16),

            if (isRateLimited) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.amber.shade200),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, color: Colors.amber.shade800, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'You logged weight on $lastLogDateStr. Next update in $daysRemaining day(s).',
                        style: TextStyle(
                          color: Colors.amber.shade800,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],
            
            // Log weight input form
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 54,
                    child: TextField(
                      controller: _weightLogCtrl,
                      enabled: !isRateLimited,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: isRateLimited ? Colors.grey : Colors.black87,
                      ),
                      decoration: InputDecoration(
                        labelText: isRateLimited ? 'Weight log (Locked)' : 'Log weight',
                        suffixText: 'kg',
                        filled: true,
                        fillColor: isRateLimited ? Colors.grey.shade100 : Colors.grey.shade50,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide(color: Colors.grey.shade200),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide(color: Colors.grey.shade200),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide(color: Theme.of(context).colorScheme.primary),
                        ),
                        disabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide(color: Colors.grey.shade200),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                SizedBox(
                  height: 54,
                  child: _isSaving
                      ? const Center(
                          child: Padding(
                            padding: EdgeInsets.symmetric(horizontal: 24),
                            child: CircularProgressIndicator(strokeWidth: 2.5),
                          ),
                        )
                      : ElevatedButton.icon(
                          onPressed: isRateLimited
                              ? null
                              : () async {
                                  final scaffoldMessenger = ScaffoldMessenger.of(context);
                                  final double? w = double.tryParse(_weightLogCtrl.text);
                                  if (w == null || w <= 0 || w > 300) {
                                    scaffoldMessenger.showSnackBar(
                                      const SnackBar(
                                        content: Text('Please enter a valid weight (e.g. 70.5)'),
                                        backgroundColor: Colors.redAccent,
                                      ),
                                    );
                                    return;
                                  }
                                  setState(() => _isSaving = true);
                                  final success = await auth.logWeight(w);
                                  if (mounted) {
                                    setState(() => _isSaving = false);
                                  }
                                  if (success && mounted) {
                                    scaffoldMessenger.showSnackBar(
                                      const SnackBar(
                                        content: Text('Weight logged successfully!'),
                                        backgroundColor: Colors.green,
                                      ),
                                    );
                                  } else if (!success && mounted) {
                                    scaffoldMessenger.showSnackBar(
                                      SnackBar(
                                        content: Text(auth.errorMessage ?? 'Failed to log weight.'),
                                        backgroundColor: Colors.redAccent,
                                      ),
                                    );
                                  }
                                },
                          icon: const Icon(Icons.check_circle_outline, size: 20),
                          label: const Text('Save'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isRateLimited
                                ? Colors.grey.shade300
                                : Theme.of(context).colorScheme.primary,
                            foregroundColor: isRateLimited
                                ? Colors.grey.shade500
                                : Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                        ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Weight history line chart mapping
            if (auth.weightHistory.isEmpty)
              Container(
                height: 160,
                alignment: Alignment.center,
                child: Text(
                  'No weight logs recorded yet. Start tracking your weight above!',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey.shade500, fontSize: 13),
                ),
              )
            else ...[
              Text(
                'Weight History (kg)',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade600,
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 180,
                child: Padding(
                  padding: const EdgeInsets.only(right: 16, left: 4, top: 8),
                  child: _WeightHistoryChart(history: auth.weightHistory),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}



class _SetupProfileCard extends StatelessWidget {
  const _SetupProfileCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Theme.of(context).colorScheme.primary,
            Theme.of(context).colorScheme.secondary,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).colorScheme.primary.withAlpha(50),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withAlpha(50),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.favorite_rounded,
                  color: Colors.white,
                  size: 32,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Text(
                  'Unlock Health Insights',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            'Complete your health profile to calculate your Body Mass Index (BMI), Basal Metabolic Rate (BMR), and Daily Calorie needs (TDEE). Customize your recipes instantly!',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.white.withAlpha(230),
                  height: 1.4,
                ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ProfileFormScreen()),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: Theme.of(context).colorScheme.primary,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                elevation: 0,
              ),
              child: const Text(
                'Set Up Health Profile',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BmiGauge extends StatelessWidget {
  final double bmi;

  const _BmiGauge({required this.bmi});

  @override
  Widget build(BuildContext context) {
    const double minBmi = 15.0;
    const double maxBmi = 35.0;
    final double position = ((bmi - minBmi) / (maxBmi - minBmi)).clamp(0.0, 1.0);

    return Column(
      children: [
        LayoutBuilder(
          builder: (context, constraints) {
            final width = constraints.maxWidth;
            final leftOffset = position * width - 4; // pointer size is 8
            
            return Stack(
              alignment: Alignment.centerLeft,
              clipBehavior: Clip.none,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: SizedBox(
                    height: 12,
                    width: double.infinity,
                    child: Row(
                      children: [
                        Expanded(
                          flex: 175, // 15 to 18.5 is 3.5 (17.5%)
                          child: Container(color: Colors.blue.shade400),
                        ),
                        Expanded(
                          flex: 325, // 18.5 to 25 is 6.5 (32.5%)
                          child: Container(color: Colors.green.shade400),
                        ),
                        Expanded(
                          flex: 250, // 25 to 30 is 5.0 (25%)
                          child: Container(color: Colors.orange.shade400),
                        ),
                        Expanded(
                          flex: 250, // 30 to 35 is 5.0 (25%)
                          child: Container(color: Colors.red.shade400),
                        ),
                      ],
                    ),
                  ),
                ),
                Positioned(
                  left: leftOffset.clamp(0.0, width - 8),
                  child: Container(
                    width: 8,
                    height: 22,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: Colors.black87, width: 2),
                      boxShadow: const [
                        BoxShadow(
                          color: Colors.black38,
                          blurRadius: 4,
                          offset: Offset(0, 2),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            );
          },
        ),
        const SizedBox(height: 6),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('15', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade500, fontSize: 10)),
            Text('18.5', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade500, fontSize: 10)),
            Text('25', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade500, fontSize: 10)),
            Text('30', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade500, fontSize: 10)),
            Text('35', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade500, fontSize: 10)),
          ],
        ),
      ],
    );
  }
}


class _WeightHistoryChart extends StatelessWidget {
  final List<Map<String, dynamic>> history;

  const _WeightHistoryChart({required this.history});

  @override
  Widget build(BuildContext context) {
    if (history.isEmpty) return const SizedBox.shrink();

    // Map logs to FlSpots
    final List<FlSpot> spots = [];
    double minWeight = (history[0]['weight'] as num).toDouble();
    double maxWeight = minWeight;

    for (int i = 0; i < history.length; i++) {
      final double w = (history[i]['weight'] as num).toDouble();
      spots.add(FlSpot(i.toDouble(), w));
      if (w < minWeight) minWeight = w;
      if (w > maxWeight) maxWeight = w;
    }

    // Add Y-axis padding
    minWeight = (minWeight - 2).clamp(0.0, double.infinity);
    maxWeight = maxWeight + 2;

    // If max and min are equal, give it some room
    if (minWeight == maxWeight) {
      minWeight -= 5;
      maxWeight += 5;
    }

    final primaryColor = Theme.of(context).colorScheme.primary;
    final secondaryColor = Theme.of(context).colorScheme.secondary;

    return LineChart(
      LineChartData(
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          getDrawingHorizontalLine: (value) {
            return FlLine(
              color: Colors.grey.shade100,
              strokeWidth: 1.5,
              dashArray: [5, 5],
            );
          },
        ),
        titlesData: FlTitlesData(
          show: true,
          rightTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          topTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 40,
              getTitlesWidget: (value, meta) {
                return SideTitleWidget(
                  meta: meta,
                  child: Text(
                    value.toStringAsFixed(1),
                    style: const TextStyle(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.bold),
                  ),
                );
              },
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 28,
              interval: 1,
              getTitlesWidget: (value, meta) {
                final int idx = value.toInt();
                if (idx >= 0 && idx < history.length) {
                  final String dateStr = history[idx]['date']?.toString() ?? '';
                  if (dateStr.length >= 10) {
                    return SideTitleWidget(
                      meta: meta,
                      child: Text(
                        dateStr.substring(5), // "MM-DD"
                        style: const TextStyle(fontSize: 9, color: Colors.grey, fontWeight: FontWeight.bold),
                      ),
                    );
                  }
                }
                return const SizedBox.shrink();
              },
            ),
          ),
        ),
        borderData: FlBorderData(
          show: false,
        ),
        minX: 0,
        maxX: (history.length - 1).toDouble(),
        minY: minWeight,
        maxY: maxWeight,
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: true,
            gradient: LinearGradient(
              colors: [primaryColor, secondaryColor],
            ),
            barWidth: 4,
            isStrokeCapRound: true,
            dotData: FlDotData(
              show: true,
              getDotPainter: (spot, percent, barData, index) {
                return FlDotCirclePainter(
                  radius: 5,
                  color: Colors.white,
                  strokeColor: primaryColor,
                  strokeWidth: 3,
                );
              },
            ),
            belowBarData: BarAreaData(
              show: true,
              gradient: LinearGradient(
                colors: [
                  primaryColor.withAlpha(40),
                  secondaryColor.withAlpha(10),
                ],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),
        ],
        lineTouchData: LineTouchData(
          touchTooltipData: LineTouchTooltipData(
            getTooltipItems: (List<LineBarSpot> touchedSpots) {
              return touchedSpots.map((barSpot) {
                final flSpot = barSpot;
                return LineTooltipItem(
                  '${flSpot.y.toStringAsFixed(1)} kg',
                  const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                );
              }).toList();
            },
          ),
        ),
      ),
    );
  }
}