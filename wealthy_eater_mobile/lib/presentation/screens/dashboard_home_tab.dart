// ignore_for_file: unused_element, use_null_aware_elements, unnecessary_underscores
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../domain/entities/user.dart';
import '../providers/recipe_provider.dart';
import '../providers/auth_provider.dart';
import 'recipe_detail_screen.dart';
import 'notification_settings_sheet.dart';
import 'profile_form_screen.dart';

class DashboardHomeTab extends StatelessWidget {
  final UserEntity? user;
  final VoidCallback onExploreRecipes;

  const DashboardHomeTab({super.key, this.user, required this.onExploreRecipes});

  @override
  Widget build(BuildContext context) {
    final displayName = user?.fullName ?? 'User';
    final auth = context.watch<AuthProvider>();
    final profile = auth.userProfile;

    return Consumer<RecipeProvider>(
      builder: (context, recipeProvider, _) {
        final featuredRecipes = recipeProvider.recipes.take(3).toList();

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
            _HeroCard(name: displayName),
            const SizedBox(height: 20),

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
            ],

            // Quick Actions
            _SectionCard(
              title: 'Quick actions',
              child: Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  FilledButton.icon(
                    onPressed: onExploreRecipes,
                    icon: const Icon(Icons.restaurant_menu),
                    label: const Text('Browse recipes'),
                  ),
                  OutlinedButton.icon(
                    onPressed: () => NotificationSettingsSheet.show(context),
                    icon: const Icon(Icons.notifications_active_outlined),
                    label: const Text('Reminders'),
                  ),
                  OutlinedButton.icon(
                    onPressed: recipeProvider.refreshRecipes,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Refresh'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Featured Recipes
            _SectionCard(
              title: 'Featured recipes',
              trailing: TextButton(onPressed: onExploreRecipes, child: const Text('See all')),
              child: featuredRecipes.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Text(
                        'No recipes loaded yet.',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey.shade500),
                      ),
                    )
                  : Column(
                      children: featuredRecipes.map((recipe) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Material(
                            color: Colors.transparent,
                            borderRadius: BorderRadius.circular(16),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(16),
                              onTap: () => Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => RecipeDetailScreen(recipeId: recipe.id)),
                              ),
                              child: Row(
                                children: [
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(14),
                                    child: Container(
                                      width: 72,
                                      height: 72,
                                      color: Theme.of(context).colorScheme.primary.withAlpha(30),
                                      child: recipe.imageUrl.isNotEmpty
                                          ? Image.network(recipe.imageUrl, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Icon(Icons.fastfood))
                                          : const Icon(Icons.fastfood, size: 32),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          recipe.name,
                                          style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '${recipe.cookingTime} min · ${recipe.difficulty}',
                                          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade500),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const Icon(Icons.chevron_right, color: Colors.grey),
                                ],
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
            ),
          ],
        );
      },
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
}

class _HeroCard extends StatelessWidget {
  final String name;

  const _HeroCard({required this.name});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Theme.of(context).colorScheme.primary, Theme.of(context).colorScheme.secondary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(28),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Welcome back 👋',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white.withAlpha(220)),
          ),
          const SizedBox(height: 6),
          Text(
            name,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: Colors.white, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 10),
          Text(
            'Discover healthy recipes and build better eating habits.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white.withAlpha(220)),
          ),
        ],
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
        Stack(
          alignment: Alignment.centerLeft,
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
            LayoutBuilder(
              builder: (context, constraints) {
                final width = constraints.maxWidth;
                final leftOffset = position * width - 4; // pointer size is 8
                return Positioned(
                  left: leftOffset.clamp(0.0, width - 8),
                  child: Container(
                    width: 8,
                    height: 18,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: Colors.black87, width: 1.5),
                      boxShadow: const [
                        BoxShadow(color: Colors.black26, blurRadius: 2, offset: Offset(0, 1)),
                      ],
                    ),
                  ),
                );
              },
            ),
          ],
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

class _SectionCard extends StatelessWidget {
  final String title;
  final Widget child;
  final Widget? trailing;

  const _SectionCard({required this.title, required this.child, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                ),
                if (trailing != null) trailing!,
              ],
            ),
            const SizedBox(height: 14),
            child,
          ],
        ),
      ),
    );
  }
}