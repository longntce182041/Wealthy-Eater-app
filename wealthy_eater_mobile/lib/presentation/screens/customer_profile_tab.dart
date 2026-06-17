import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import 'profile_form_screen.dart';
import 'edit_profile_screen.dart';

class CustomerProfileTab extends StatelessWidget {
  const CustomerProfileTab({super.key});

  String _formatKey(String key) {
    if (key.isEmpty) return 'None';
    return key.split('_').map((word) {
      if (word.isEmpty) return '';
      return word[0].toUpperCase() + word.substring(1);
    }).join(' ');
  }

  String _getBmiCategory(double bmi) {
    if (bmi <= 0) return 'Unknown';
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25.0) return 'Normal weight';
    if (bmi < 30.0) return 'Overweight';
    return 'Obese';
  }

  Color _getBmiColor(double bmi, Color primaryColor) {
    if (bmi <= 0) return Colors.grey;
    if (bmi < 18.5) return Colors.blue;
    if (bmi < 25.0) return Colors.green;
    if (bmi < 30.0) return Colors.orange;
    return Colors.red;
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final profile = auth.userProfile;
    final user = auth.user;
    final primaryColor = Theme.of(context).colorScheme.primary;

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
                'Complete Your Profile',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.black87),
              ),
              const SizedBox(height: 12),
              Text(
                'Complete your nutrition profile to see your personalized health metrics, diet requirements, and custom plans.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 15, color: Colors.grey[600], height: 1.5),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const ProfileFormScreen()),
                    );
                  },
                  icon: const Icon(Icons.speed_outlined),
                  label: const Text('Setup Profile Now', style: TextStyle(fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    final double bmi = (profile['bmi'] as num?)?.toDouble() ?? 0.0;
    final int bmr = (profile['bmr'] as num?)?.toInt() ?? 0;
    final int tdee = (profile['tdee'] as num?)?.toInt() ?? 0;
    
    final fullName = profile['full_name']?.toString() ?? 'New User';
    final age = (profile['age'] as num?)?.toInt() ?? 0;
    final gender = profile['gender']?.toString() ?? 'other';
    final height = (profile['height'] as num?)?.toDouble() ?? 0.0;
    final weight = (profile['weight'] as num?)?.toDouble() ?? 0.0;
    final healthGoal = profile['health_goal']?.toString() ?? 'maintain';
    
    final dietary = profile['dietary_references'] as Map<String, dynamic>?;
    final activityLevel = dietary?['activity_level']?.toString() ?? 'sedentary';
    
    final List<dynamic> dietPrefs = dietary?['diet_preferences'] ?? [];
    final List<dynamic> allergies = dietary?['allergies'] ?? [];
    
    final medicalCondition = profile['medical_condition_id'] as Map<String, dynamic>?;
    final List<dynamic> dislikes = profile['dislike_ingredients'] ?? [];
    
    final cookingSkill = profile['cooking_skill_level']?.toString() ?? 'beginner';
    final cookingTime = (profile['available_cooking_time'] as num?)?.toInt() ?? 30;

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          await auth.fetchUserProfile();
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
                      fullName.isNotEmpty ? fullName[0].toUpperCase() : 'U',
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
                    user?.email ?? '',
                    style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                  ),
                  const SizedBox(height: 16),
                  OutlinedButton.icon(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => const EditProfileScreen(),
                        ),
                      );
                    },
                    icon: const Icon(Icons.edit_outlined, size: 18),
                    label: const Text('Edit Profile'),
                    style: OutlinedButton.styleFrom(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),

            // ── Biometric calculations grid ──
            const Text(
              'Biometrics & Health Indexes',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildMetricCard(
                    title: 'BMI Index',
                    value: bmi.toStringAsFixed(1),
                    unit: 'kg/m²',
                    subtitle: _getBmiCategory(bmi),
                    subtitleColor: _getBmiColor(bmi, primaryColor),
                    icon: Icons.monitor_weight_outlined,
                    primaryColor: primaryColor,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildMetricCard(
                    title: 'BMR (Rest)',
                    value: '$bmr',
                    unit: 'kcal',
                    subtitle: 'Basal calories',
                    icon: Icons.local_fire_department_outlined,
                    primaryColor: primaryColor,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildMetricCard(
                    title: 'TDEE Target',
                    value: '$tdee',
                    unit: 'kcal',
                    subtitle: 'Daily burn target',
                    icon: Icons.bolt_outlined,
                    primaryColor: primaryColor,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // ── Section 1: Physical Data ──
            _buildSectionCard(
              title: 'Physical Statistics',
              icon: Icons.accessibility_new_outlined,
              primaryColor: primaryColor,
              children: [
                _buildInfoRow('Age', '$age years'),
                _buildInfoRow('Gender', _formatKey(gender)),
                _buildInfoRow('Height', '${height.toStringAsFixed(0)} cm'),
                _buildInfoRow('Weight', '${weight.toStringAsFixed(1)} kg'),
              ],
            ),
            const SizedBox(height: 16),

            // ── Section 2: Health Goals ──
            _buildSectionCard(
              title: 'Goals & Activity Level',
              icon: Icons.track_changes_outlined,
              primaryColor: primaryColor,
              children: [
                _buildInfoRow('Target Goal', _formatKey(healthGoal)),
                _buildInfoRow('Activity Multiplier', _formatKey(activityLevel)),
              ],
            ),
            const SizedBox(height: 16),

            // ── Section 3: Dietary Preferences ──
            _buildSectionCard(
              title: 'Dietary Preferences',
              icon: Icons.restaurant_outlined,
              primaryColor: primaryColor,
              children: [
                const SizedBox(height: 4),
                const Text(
                  'Diet Preference Program',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.black54),
                ),
                const SizedBox(height: 8),
                dietPrefs.isEmpty
                    ? Text('No dietary program selected', style: TextStyle(color: Colors.grey[500], fontSize: 14))
                    : Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: dietPrefs.map((pref) {
                          return Chip(
                            label: Text(pref.toString()),
                            backgroundColor: primaryColor.withValues(alpha: 0.1),
                            side: BorderSide.none,
                            labelStyle: TextStyle(color: primaryColor, fontWeight: FontWeight.bold, fontSize: 13),
                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
                          );
                        }).toList(),
                      ),
              ],
            ),
            const SizedBox(height: 16),

            // ── Section 4: Clinical / Medical Condition ──
            _buildSectionCard(
              title: 'Clinical Profile',
              icon: Icons.medical_services_outlined,
              primaryColor: primaryColor,
              children: [
                _buildInfoRow(
                  'Medical Condition',
                  medicalCondition != null ? (medicalCondition['name'] ?? 'None') : 'None',
                  valueColor: medicalCondition != null ? Colors.orange[800] : Colors.black87,
                ),
                if (medicalCondition != null && medicalCondition['dietary_guideline'] != null) ...[
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.orange.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.orange.withValues(alpha: 0.2)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.lightbulb_outline, color: Colors.orange[800], size: 18),
                            const SizedBox(width: 8),
                            Text(
                              'Dietary Guideline',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: Colors.orange[800],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          medicalCondition['dietary_guideline'].toString(),
                          style: TextStyle(fontSize: 13, color: Colors.orange[900], height: 1.4),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 16),

            // ── Section 5: Allergies & Dislikes ──
            _buildSectionCard(
              title: 'Restrictions & Exclusions',
              icon: Icons.warning_amber_outlined,
              primaryColor: primaryColor,
              children: [
                const Text(
                  'Allergies (Causes absolute recipe filter)',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.black54),
                ),
                const SizedBox(height: 8),
                allergies.isEmpty
                    ? Text('No allergies specified', style: TextStyle(color: Colors.grey[500], fontSize: 13))
                    : Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: allergies.map((ing) {
                          final name = ing is Map ? (ing['name'] ?? '') : ing.toString();
                          return Chip(
                            label: Text(name),
                            backgroundColor: Colors.red[50],
                            side: BorderSide.none,
                            labelStyle: const TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold, fontSize: 12),
                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
                          );
                        }).toList(),
                      ),
                const SizedBox(height: 16),
                const Text(
                  'Disliked Ingredients (Avoided in recommended meals)',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.black54),
                ),
                const SizedBox(height: 8),
                dislikes.isEmpty
                    ? Text('No disliked ingredients specified', style: TextStyle(color: Colors.grey[500], fontSize: 13))
                    : Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: dislikes.map((ing) {
                          final name = ing is Map ? (ing['name'] ?? '') : ing.toString();
                          return Chip(
                            label: Text(name),
                            backgroundColor: Colors.blueGrey[50],
                            side: BorderSide.none,
                            labelStyle: TextStyle(color: Colors.blueGrey[800], fontWeight: FontWeight.bold, fontSize: 12),
                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
                          );
                        }).toList(),
                      ),
              ],
            ),
            const SizedBox(height: 16),

            // ── Section 6: Cooking ──
            _buildSectionCard(
              title: 'Cooking Preferences',
              icon: Icons.soup_kitchen_outlined,
              primaryColor: primaryColor,
              children: [
                _buildInfoRow('Skill Level', _formatKey(cookingSkill)),
                _buildInfoRow('Preparation Time Limit', '$cookingTime mins'),
              ],
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricCard({
    required String title,
    required String value,
    required String unit,
    required String subtitle,
    Color? subtitleColor,
    required IconData icon,
    required Color primaryColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
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
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, color: primaryColor, size: 20),
              Text(unit, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.black87),
          ),
          const SizedBox(height: 2),
          Text(
            title,
            style: const TextStyle(fontSize: 10, color: Colors.black54, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: subtitleColor ?? Colors.grey[600],
            ),
          ),
        ],
      ),
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
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(fontSize: 14, color: Colors.grey[600], fontWeight: FontWeight.w500),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: valueColor ?? Colors.black87,
            ),
          ),
        ],
      ),
    );
  }
}
