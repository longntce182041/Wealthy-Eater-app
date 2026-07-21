import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../core/theme/app_colors.dart';
import '../providers/meal_plan_provider.dart';

class DailyMacroReportWidget extends StatefulWidget {
  const DailyMacroReportWidget({super.key});

  @override
  State<DailyMacroReportWidget> createState() => _DailyMacroReportWidgetState();
}

class _DailyMacroReportWidgetState extends State<DailyMacroReportWidget> {
  DateTime _selectedDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadReport();
    });
  }

  String _formatDate(DateTime dt) {
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
  }

  bool _isToday(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year && date.month == now.month && date.day == now.day;
  }

  String _formatDateString(DateTime dt) {
    final base = _formatDate(dt);
    if (_isToday(dt)) {
      return '$base (Today)';
    }
    return base;
  }

  Future<void> _loadReport() async {
    await context.read<MealPlanProvider>().loadDailyMacroReport(date: _formatDate(_selectedDate));
  }

  Widget _buildReportContent(MealPlanProvider provider, ThemeData theme) {
    final report = provider.dailyMacroReport;
    final double calories = (report?['calories'] as num?)?.toDouble() ?? 0.0;
    final double protein = (report?['protein'] as num?)?.toDouble() ?? 0.0;
    final double carbs = (report?['carbs'] as num?)?.toDouble() ?? 0.0;
    final double fat = (report?['fat'] as num?)?.toDouble() ?? 0.0;

    final double totalMacros = protein + carbs + fat;

    final double proteinPercent = totalMacros > 0 ? (protein / totalMacros) * 100 : 0.0;
    final double carbsPercent = totalMacros > 0 ? (carbs / totalMacros) * 100 : 0.0;
    final double fatPercent = totalMacros > 0 ? (fat / totalMacros) * 100 : 0.0;

    // Modern harmonious colors
    const proteinColor = Color(0xFFEF4444); // Crimson red
    const carbsColor = Color(0xFF10B981);   // Emerald green
    const fatColor = Color(0xFFF59E0B);     // Amber yellow

    return RefreshIndicator(
      onRefresh: _loadReport,
      color: AppColors.primary,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        children: [
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: const BorderSide(color: AppColors.border),
            ),
            color: AppColors.surface,
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  Text(
                    'Daily Energy Intake',
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: AppColors.textSecondary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${calories.round()} kcal',
                    style: theme.textTheme.headlineLarge?.copyWith(
                      color: AppColors.primaryDark,
                      fontWeight: FontWeight.w900,
                      fontSize: 36,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          if (totalMacros == 0)
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: const BorderSide(color: AppColors.border),
              ),
              color: AppColors.surface,
              child: Container(
                height: 300,
                alignment: Alignment.center,
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.pie_chart_outline, size: 48, color: Colors.grey),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      _isToday(_selectedDate) ? 'No meals logged today' : 'No meals logged on this day',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Log meals from your Weekly Menu tab to see your macro breakdown here.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.4),
                    ),
                  ],
                ),
              ),
            )
          else
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: const BorderSide(color: AppColors.border),
              ),
              color: AppColors.surface,
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    const Text(
                      'Macronutrient Distribution',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 32),
                    SizedBox(
                      height: 180,
                      child: PieChart(
                        PieChartData(
                          sectionsSpace: 4,
                          centerSpaceRadius: 50,
                          startDegreeOffset: -90,
                          sections: [
                            PieChartSectionData(
                              color: proteinColor,
                              value: protein,
                              title: '${proteinPercent.round()}%',
                              radius: 30,
                              titleStyle: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            PieChartSectionData(
                              color: carbsColor,
                              value: carbs,
                              title: '${carbsPercent.round()}%',
                              radius: 30,
                              titleStyle: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            PieChartSectionData(
                              color: fatColor,
                              value: fat,
                              title: '${fatPercent.round()}%',
                              radius: 30,
                              titleStyle: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 32),
                    const Divider(color: AppColors.divider),
                    const SizedBox(height: 16),
                    _buildLegendItem('Protein', protein, proteinPercent, proteinColor),
                    const SizedBox(height: 12),
                    _buildLegendItem('Carbs', carbs, carbsPercent, carbsColor),
                    const SizedBox(height: 12),
                    _buildLegendItem('Fat', fat, fatPercent, fatColor),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<MealPlanProvider>();
    final theme = Theme.of(context);

    return Column(
      children: [
        // Always visible Date selector header
        Padding(
          padding: const EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 8),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left, color: AppColors.primary),
                  onPressed: () {
                    setState(() {
                      _selectedDate = _selectedDate.subtract(const Duration(days: 1));
                    });
                    _loadReport();
                  },
                ),
                InkWell(
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _selectedDate,
                      firstDate: DateTime(2020),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (picked != null) {
                      setState(() {
                        _selectedDate = picked;
                      });
                      _loadReport();
                    }
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.calendar_month, color: AppColors.primary, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          _formatDateString(_selectedDate),
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary),
                        ),
                      ],
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right, color: AppColors.primary),
                  onPressed: () {
                    setState(() {
                      _selectedDate = _selectedDate.add(const Duration(days: 1));
                    });
                    _loadReport();
                  },
                ),
              ],
            ),
          ),
        ),
        
        Expanded(
          child: provider.isLoadingReport
              ? const Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                )
              : provider.reportError != null
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.error_outline, color: AppColors.error, size: 48),
                            const SizedBox(height: 16),
                            Text(
                              provider.reportError!,
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: AppColors.textSecondary),
                            ),
                            const SizedBox(height: 16),
                            FilledButton(
                              onPressed: _loadReport,
                              style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      ),
                    )
                  : _buildReportContent(provider, theme),
        ),
      ],
    );
  }

  Widget _buildLegendItem(String label, double amount, double percentage, Color color) {
    return Row(
      children: [
        Container(
          width: 14,
          height: 14,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(width: 12),
        Text(
          label,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary),
        ),
        const Spacer(),
        Text(
          '${amount.toStringAsFixed(1)}g',
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppColors.textPrimary),
        ),
        const SizedBox(width: 8),
        Text(
          '(${percentage.toStringAsFixed(1)}%)',
          style: const TextStyle(fontSize: 12, color: AppColors.textTertiary),
        ),
      ],
    );
  }
}
