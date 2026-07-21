import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../providers/nutritionist_provider.dart';
import 'meal_plan_editor_screen.dart';

/// UC-39 — Nutritionist triggers AI meal plan generation for a specific client.
///
/// Uses the project-standard [NutritionistProvider] (ChangeNotifier + Provider)
/// instead of Riverpod, consistent with the rest of the app architecture.
class GenerateMealPlanScreen extends StatefulWidget {
  /// The MongoDB _id of the client to generate a meal plan for.
  final String clientId;

  /// Display name (email) of the client — shown in the profile card.
  final String clientName;

  const GenerateMealPlanScreen({
    super.key,
    required this.clientId,
    required this.clientName,
  });

  @override
  State<GenerateMealPlanScreen> createState() => _GenerateMealPlanScreenState();
}

class _GenerateMealPlanScreenState extends State<GenerateMealPlanScreen> {
  @override
  void initState() {
    super.initState();
    // Reset generation state when the screen opens so each visit starts fresh.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NutritionistProvider>().resetGeneration();
    });
  }

  Future<void> _runGeneration() async {
    // Default: use recipe-based generation (existing recipes from DB)
    await context.read<NutritionistProvider>().generateRecipePlan(widget.clientId);
  }

  Future<void> _refresh() async {
    context.read<NutritionistProvider>().resetGeneration();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Generate Weekly Meal Plan'),
        backgroundColor: theme.colorScheme.primary,
        foregroundColor: theme.colorScheme.onPrimary,
      ),
      body: Consumer<NutritionistProvider>(
        builder: (context, provider, _) {
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                // ── Client Profile Card ────────────────────────────────────
                _ClientProfileCard(
                  clientId: widget.clientId,
                  clientName: widget.clientName,
                ),
                const SizedBox(height: 24),

                // ── Generate Button or Loading ─────────────────────────────
                if (provider.isGenerating)
                  _LoadingWidget()
                else if (provider.generationResult != null)
                  _ResultCard(
                    result: provider.generationResult!,
                    onGenerateAgain: () => context
                        .read<NutritionistProvider>()
                        .resetGeneration(),
                  )
                else ...[
                  if (provider.generationError != null) ...[
                    _ErrorBanner(message: provider.generationError!),
                    const SizedBox(height: 16),
                  ],
                  _GenerateButton(onPressed: _runGeneration),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

// ── Client Profile Card ──────────────────────────────────────────────────────

class _ClientProfileCard extends StatelessWidget {
  final String clientId;
  final String clientName;

  const _ClientProfileCard({
    required this.clientId,
    required this.clientName,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final initial = clientName.isNotEmpty ? clientName[0].toUpperCase() : '?';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.colorScheme.primaryContainer,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Client Profile',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: theme.colorScheme.onPrimaryContainer,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: theme.colorScheme.primary,
                child: Text(
                  initial,
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: theme.colorScheme.onPrimary,
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      clientName,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: theme.colorScheme.onPrimaryContainer,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'ID: $clientId',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onPrimaryContainer
                            .withValues(alpha: 0.7),
                        fontFamily: 'monospace',
                        fontSize: 11,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _InfoChip(
                icon: Icons.restaurant_menu_outlined,
                label: 'Recipe-Based',
                color: theme.colorScheme.primary,
              ),
              _InfoChip(
                icon: Icons.science_outlined,
                label: 'LP Optimizer',
                color: Colors.teal,
              ),
              _InfoChip(
                icon: Icons.calendar_month_outlined,
                label: '7-Day Plan',
                color: Colors.deepPurple,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _InfoChip({
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Generate Button ──────────────────────────────────────────────────────────

class _GenerateButton extends StatelessWidget {
  final VoidCallback onPressed;

  const _GenerateButton({required this.onPressed});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Column(
            children: [
              Icon(
                Icons.psychology_outlined,
                size: 48,
                color: theme.colorScheme.primary.withValues(alpha: 0.7),
              ),
              const SizedBox(height: 12),
              Text(
                'Weekly Recipe Meal Plan',
                style: theme.textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                'The system will select the best recipes from the database '
                'and assign them to 7 days × 3 meals (Breakfast, Lunch, Dinner), '
                'optimizing portion sizes to meet daily nutrition targets.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall
                    ?.copyWith(color: Colors.grey.shade600),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        FilledButton.icon(
          icon: const Icon(Icons.auto_awesome),
          label: const Padding(
            padding: EdgeInsets.symmetric(vertical: 14),
            child: Text(
              'Generate Meal Plan',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ),
          onPressed: onPressed,
          style: FilledButton.styleFrom(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      ],
    );
  }
}

// ── Loading Widget ───────────────────────────────────────────────────────────

class _LoadingWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: theme.colorScheme.primary.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        children: [
          CircularProgressIndicator(color: theme.colorScheme.primary),
          const SizedBox(height: 20),
          Text(
            'Generating Weekly Meal Plan…',
            style: theme.textTheme.titleSmall
                ?.copyWith(fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'Selecting optimal recipes from the database and\nassigning them across 7 days × 3 meals.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodySmall
                ?.copyWith(color: Colors.grey.shade600),
          ),
          const SizedBox(height: 12),
          Text(
            'This may take 10–30 seconds.',
            style: TextStyle(
              fontSize: 11,
              color: Colors.grey.shade500,
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Error Banner ─────────────────────────────────────────────────────────────

class _ErrorBanner extends StatelessWidget {
  final String message;

  const _ErrorBanner({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.error_outline, color: Colors.red.shade700, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Generation Failed',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.red.shade700,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  message,
                  style: TextStyle(color: Colors.red.shade700, fontSize: 13),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Result Card ──────────────────────────────────────────────────────────────

class _ResultCard extends StatelessWidget {
  final Map<String, dynamic> result;
  final VoidCallback onGenerateAgain;

  const _ResultCard({
    required this.result,
    required this.onGenerateAgain,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    // Parse from backend response shape:
    // { status, message, meta: { mealPlanId, totalEnergyEnvelopeKcal,
    //    allocatedComponentsCount, mealName, difficulty, cookingTimeMinutes } }
    final meta = result['meta'] as Map<String, dynamic>? ?? {};
    final status = result['status']?.toString() ?? 'SUCCESS';
    final message = result['message']?.toString() ?? 'Meal plan created!';
    final mealPlanId = meta['mealPlanId']?.toString() ?? '—';
    final mealName = meta['mealName']?.toString() ?? 'AI-Generated Meal';
    final calories =
        (meta['totalEnergyEnvelopeKcal'] as num?)?.toStringAsFixed(0) ?? '—';
    final itemsCount = meta['allocatedComponentsCount']?.toString() ?? '—';
    final difficulty = meta['difficulty']?.toString() ?? '—';
    final cookingTime = meta['cookingTimeMinutes']?.toString() ?? '—';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ── Success Header ───────────────────────────────────────────────
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.primaryLight,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(16),
              topRight: Radius.circular(16),
            ),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Icon(Icons.check_circle, color: AppColors.primary, size: 32),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      message,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                        color: AppColors.primaryDark,
                      ),
                    ),
                    Text(
                      'Status: $status',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.primaryDark,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        // ── Meal Name ────────────────────────────────────────────────────
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.white,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                mealName,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: theme.colorScheme.primary,
                ),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  _StatBadge(icon: Icons.local_fire_department_outlined,
                      value: '$calories kcal', color: Colors.orange),
                  const SizedBox(width: 8),
                  _StatBadge(icon: Icons.timer_outlined,
                      value: '$cookingTime min', color: Colors.blue),
                  const SizedBox(width: 8),
                  _StatBadge(icon: Icons.bar_chart_outlined,
                      value: difficulty, color: Colors.purple),
                ],
              ),
            ],
          ),
        ),

        // ── Metrics ──────────────────────────────────────────────────────
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            border: Border(
              top: BorderSide(color: Colors.grey.shade200),
              left: BorderSide(color: AppColors.border),
              right: BorderSide(color: AppColors.border),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _MetaRow(label: 'Meal Plan ID', value: mealPlanId),
              const Divider(height: 16),
              _MetaRow(
                  label: 'Ingredient Components',
                  value: '$itemsCount items allocated'),
            ],
          ),
        ),

        // ── Status Chip ──────────────────────────────────────────────────
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: const BorderRadius.only(
              bottomLeft: Radius.circular(16),
              bottomRight: Radius.circular(16),
            ),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Chip(
                avatar: Icon(Icons.pending_actions_outlined, size: 16, color: Colors.orange.shade800),
                label: const Text('DRAFT — Pending Publish'),
                backgroundColor: Colors.orange.shade50,
                side: BorderSide(color: Colors.orange.shade200),
                labelStyle: TextStyle(
                  fontSize: 12,
                  color: Colors.orange.shade800,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),

        // ── Edit Draft ───────────────────────────────────────────────────
        ElevatedButton.icon(
          icon: const Icon(Icons.edit_document),
          label: const Text('Edit Draft Plan'),
          onPressed: () {
            if (mealPlanId != '—') {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => MealPlanEditorScreen(planId: mealPlanId),
                ),
              );
            }
          },
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            backgroundColor: theme.colorScheme.primary,
            foregroundColor: theme.colorScheme.onPrimary,
          ),
        ),
        const SizedBox(height: 12),

        // ── Generate Again ───────────────────────────────────────────────
        OutlinedButton.icon(
          icon: const Icon(Icons.refresh),
          label: const Text('Generate Again'),
          onPressed: onGenerateAgain,
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      ],
    );
  }
}

class _StatBadge extends StatelessWidget {
  final IconData icon;
  final String value;
  final Color color;

  const _StatBadge(
      {required this.icon, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class _MetaRow extends StatelessWidget {
  final String label;
  final String value;

  const _MetaRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '$label: ',
          style: const TextStyle(
            fontSize: 12,
            color: Colors.grey,
            fontWeight: FontWeight.w600,
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              fontFamily: 'monospace',
            ),
          ),
        ),
      ],
    );
  }
}
