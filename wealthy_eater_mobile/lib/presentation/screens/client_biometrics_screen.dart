import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../data/models/weight_log_model.dart';
import '../providers/biometric_audit_provider.dart';

class ClientBiometricsScreen extends StatefulWidget {
  final String clientId;
  final String clientName;

  const ClientBiometricsScreen({
    super.key,
    required this.clientId,
    required this.clientName,
  });

  @override
  State<ClientBiometricsScreen> createState() => _ClientBiometricsScreenState();
}

class _ClientBiometricsScreenState extends State<ClientBiometricsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context
          .read<BiometricAuditProvider>()
          .fetchClientBiometrics(widget.clientId);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA), // Soft Grey
      appBar: AppBar(
        title: Consumer<BiometricAuditProvider>(
          builder: (context, provider, _) {
            final fullName = provider.userProfile?['full_name']?.toString();
            final name = (fullName != null && fullName.isNotEmpty) ? fullName : widget.clientName;
            return Text(
              'Biometrics: $name',
              style: GoogleFonts.inter(fontWeight: FontWeight.w600),
            );
          },
        ),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0.5,
      ),
      body: Consumer<BiometricAuditProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading) {
            return _buildLoadingState();
          }

          if (provider.error != null) {
            return _buildErrorState(provider.error!);
          }

          if (provider.isEmpty) {
            return _buildEmptyState();
          }

          return _buildDataDashboard(provider);
        },
      ),
    );
  }

  // ── STATE 1: Shimmer Loading Overlay ───────────────────────────────────────
  Widget _buildLoadingState() {
    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        _buildShimmerContainer(height: 80), // Header
        const SizedBox(height: 24),
        _buildShimmerContainer(height: 40), // Filter chips
        const SizedBox(height: 24),
        _buildShimmerContainer(height: 300), // Chart
        const SizedBox(height: 24),
        Row(
          children: [
            Expanded(child: _buildShimmerContainer(height: 100)),
            const SizedBox(width: 16),
            Expanded(child: _buildShimmerContainer(height: 100)),
            const SizedBox(width: 16),
            Expanded(child: _buildShimmerContainer(height: 100)),
          ],
        ),
      ],
    );
  }

  Widget _buildShimmerContainer({required double height}) {
    // A simple opacity-animated skeleton box mimicking a shimmer
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0.3, end: 0.7),
      duration: const Duration(milliseconds: 800),
      curve: Curves.easeInOut,
      builder: (context, opacity, child) {
        return Opacity(
          opacity: opacity,
          child: Container(
            height: height,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        );
      },
      onEnd: () {
        // Since we can't easily loop a TweenAnimationBuilder forever without
        // complex state, we just let it be a static skeleton or use an
        // implicit animation that fades in. For true shimmer, a package is
        // better, but this avoids frame drops and looks clean.
      },
    );
  }

  // ── STATE 2: Empty Data Placeholder ────────────────────────────────────────
  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.monitor_weight_outlined,
              size: 80,
              color: Colors.grey.shade400,
            ),
            const SizedBox(height: 24),
            Text(
              'No Biometrics Recorded',
              style: GoogleFonts.inter(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'This client has not logged any body metrics yet.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 16,
                color: Colors.grey.shade600,
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: () => Navigator.of(context).pop(),
              icon: const Icon(Icons.arrow_back),
              label: const Text('Go Back'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF00BFA5), // Mint Green
                foregroundColor: Colors.white,
                minimumSize: const Size(200, 48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(24),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Error State ────────────────────────────────────────────────────────────
  Widget _buildErrorState(String error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.redAccent),
            const SizedBox(height: 16),
            Text(
              'Error Loading Biometrics',
              style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(error, textAlign: TextAlign.center),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                context
                    .read<BiometricAuditProvider>()
                    .fetchClientBiometrics(widget.clientId);
              },
              child: const Text('Retry'),
            )
          ],
        ),
      ),
    );
  }

  // ── STATE 3: Core Dashboard Layout ─────────────────────────────────────────
  Widget _buildDataDashboard(BiometricAuditProvider provider) {
    return RefreshIndicator(
      onRefresh: () =>
          provider.fetchClientBiometrics(widget.clientId),
      color: const Color(0xFF00BFA5),
      child: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          _buildProfileHeader(provider),
          const SizedBox(height: 24),
          _buildTimeFilters(provider),
          const SizedBox(height: 16),
          _buildChartContainer(provider),
          const SizedBox(height: 24),
          _buildTelemetryGrid(provider),
        ],
      ),
    );
  }

  String _formatHealthGoal(String? goal) {
    if (goal == null || goal.isEmpty) return 'Goal: Not Set';
    final formatted = goal
        .replaceAll('_', ' ')
        .toLowerCase()
        .split(' ')
        .map((word) => word.isNotEmpty ? '${word[0].toUpperCase()}${word.substring(1)}' : '')
        .join(' ');
    return 'Goal: $formatted';
  }

  Widget _buildHeaderBadge({required IconData icon, required String label}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: Colors.grey.shade700),
          const SizedBox(width: 4),
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: Colors.grey.shade800,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileHeader(BiometricAuditProvider provider) {
    final profile = provider.userProfile;
    final dietary = provider.userDietary;

    final fullName = profile?['full_name']?.toString();
    final displayName = (fullName != null && fullName.isNotEmpty) ? fullName : widget.clientName;
    final avatarUrl = profile?['avatar_url']?.toString();
    final initial = displayName.isNotEmpty ? displayName[0].toUpperCase() : '?';

    final goalText = _formatHealthGoal(profile?['health_goal']?.toString());

    final bmi = profile?['bmi'];
    final bmiStr = bmi != null ? (bmi as num).toStringAsFixed(1) : 'N/A';

    final age = profile?['age'];
    final gender = profile?['gender']?.toString();
    final height = profile?['height'];
    final weight = profile?['weight'];
    final tdee = profile?['tdee'];
    final bmr = profile?['bmr'];

    final activity = dietary?['activity_level']?.toString();
    final cookingSkill = dietary?['cooking_skill_level']?.toString();
    final cookingTime = dietary?['available_cooking_time'];
    final preferences = (dietary?['diet_preferences'] as List?)?.map((e) => e.toString()).toList() ?? [];

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
              CircleAvatar(
                radius: 32,
                backgroundColor: const Color(0xFFE0F2F1), // Light Mint
                backgroundImage: (avatarUrl != null && avatarUrl.isNotEmpty)
                    ? NetworkImage(avatarUrl)
                    : null,
                child: (avatarUrl == null || avatarUrl.isEmpty)
                    ? Text(
                        initial,
                        style: GoogleFonts.inter(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF00796B), // Dark Teal
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      displayName,
                      style: GoogleFonts.inter(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (fullName != null && fullName.isNotEmpty && widget.clientName != fullName) ...[
                      const SizedBox(height: 2),
                      Text(
                        widget.clientName,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF3E0), // Orange tint
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        goalText,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Colors.deepOrange,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              // BMI Chip
              Column(
                children: [
                  Text(
                    'BMI',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: Colors.grey.shade500,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE8F5E9),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      bmiStr,
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.green.shade700,
                      ),
                    ),
                  )
                ],
              )
            ],
          ),
          if (profile != null || dietary != null) ...[
            const Divider(height: 24),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (age != null || gender != null)
                  _buildHeaderBadge(
                    icon: Icons.person_outline,
                    label: '${age ?? '?'} yrs • ${gender ?? 'N/A'}',
                  ),
                if (height != null || weight != null)
                  _buildHeaderBadge(
                    icon: Icons.straighten,
                    label: '${height ?? '?'} cm • ${weight ?? '?'} kg',
                  ),
                if (tdee != null)
                  _buildHeaderBadge(
                    icon: Icons.local_fire_department_outlined,
                    label: 'TDEE: $tdee kcal',
                  ),
                if (bmr != null)
                  _buildHeaderBadge(
                    icon: Icons.bolt_outlined,
                    label: 'BMR: $bmr kcal',
                  ),
                if (activity != null)
                  _buildHeaderBadge(
                    icon: Icons.fitness_center_outlined,
                    label: 'Activity: $activity',
                  ),
                if (cookingSkill != null)
                  _buildHeaderBadge(
                    icon: Icons.restaurant_outlined,
                    label: 'Skill: $cookingSkill',
                  ),
                if (cookingTime != null)
                  _buildHeaderBadge(
                    icon: Icons.timer_outlined,
                    label: '${cookingTime}m cook',
                  ),
              ],
            ),
            if (preferences.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: preferences.map((pref) {
                  return Chip(
                    label: Text(
                      pref,
                      style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500),
                    ),
                    backgroundColor: Colors.teal.shade50,
                    side: BorderSide.none,
                    padding: EdgeInsets.zero,
                    visualDensity: VisualDensity.compact,
                  );
                }).toList(),
              ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildTimeFilters(BiometricAuditProvider provider) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: BiometricTimeFilter.values.map((filter) {
          final isSelected = provider.selectedFilter == filter;
          String label = '';
          switch (filter) {
            case BiometricTimeFilter.oneWeek: label = '1 Week'; break;
            case BiometricTimeFilter.oneMonth: label = '1 Month'; break;
            case BiometricTimeFilter.threeMonths: label = '3 Months'; break;
            case BiometricTimeFilter.allTime: label = 'All Time'; break;
          }

          return Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: ChoiceChip(
              label: Text(label),
              labelStyle: GoogleFonts.inter(
                color: isSelected ? Colors.white : Colors.black87,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
              selectedColor: const Color(0xFF00BFA5),
              backgroundColor: Colors.white,
              selected: isSelected,
              onSelected: (_) => provider.setFilter(filter),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: BorderSide(
                  color: isSelected ? const Color(0xFF00BFA5) : Colors.grey.shade300,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildChartContainer(BiometricAuditProvider provider) {
    final logs = provider.filteredLogs;
    if (logs.isEmpty) {
      return Container(
        height: 300,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
        alignment: Alignment.center,
        child: const Text('Not enough data for this period.'),
      );
    }

    return Container(
      height: 350,
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
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Body Mass Trajectory (kg)',
            style: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 24),
          Expanded(
            child: LineChart(
              _createChartData(logs),
              duration: const Duration(milliseconds: 400),
            ),
          ),
        ],
      ),
    );
  }

  LineChartData _createChartData(List<WeightLogModel> logs) {
    if (logs.isEmpty) return LineChartData();

    // Map logs to FlSpot (x: timestamp in days, y: weight)
    final startTime = logs.first.date.millisecondsSinceEpoch;
    
    // Find min and max for scaling
    double minWeight = double.infinity;
    double maxWeight = double.negativeInfinity;
    
    final spots = logs.map((log) {
      if (log.weight < minWeight) minWeight = log.weight;
      if (log.weight > maxWeight) maxWeight = log.weight;
      
      // X-axis: days since first log
      final diffDays = (log.date.millisecondsSinceEpoch - startTime) / (1000 * 60 * 60 * 24);
      return FlSpot(diffDays, log.weight);
    }).toList();

    // Add some padding to Y axis
    final yInterval = (maxWeight - minWeight) == 0 ? 5.0 : ((maxWeight - minWeight) / 4);
    final minY = (minWeight - yInterval).floorToDouble();
    final maxY = (maxWeight + yInterval).ceilToDouble();

    return LineChartData(
      gridData: FlGridData(
        show: true,
        drawVerticalLine: false,
        horizontalInterval: yInterval == 0 ? 1 : yInterval,
        getDrawingHorizontalLine: (value) {
          return FlLine(
            color: Colors.grey.shade200,
            strokeWidth: 1,
            dashArray: [5, 5],
          );
        },
      ),
      titlesData: FlTitlesData(
        show: true,
        rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
        topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
        bottomTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            reservedSize: 30,
            interval: _calculateXInterval(spots.length),
            getTitlesWidget: (value, meta) {
              // Convert value (days) back to date
              if (value < 0 || spots.isEmpty) return const SizedBox();
              
              final date = DateTime.fromMillisecondsSinceEpoch(
                  startTime + (value * 24 * 60 * 60 * 1000).toInt());
              
              return Padding(
                padding: const EdgeInsets.only(top: 8.0),
                child: Text(
                  '${date.day}/${date.month}',
                  style: GoogleFonts.inter(
                    color: Colors.grey.shade600,
                    fontSize: 12,
                  ),
                ),
              );
            },
          ),
        ),
        leftTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            reservedSize: 40,
            getTitlesWidget: (value, meta) {
              return Text(
                value.toStringAsFixed(1),
                style: GoogleFonts.inter(
                  color: Colors.grey.shade600,
                  fontSize: 12,
                ),
              );
            },
          ),
        ),
      ),
      borderData: FlBorderData(show: false),
      minX: spots.first.x,
      maxX: spots.last.x,
      minY: minY,
      maxY: maxY,
      lineBarsData: [
        LineChartBarData(
          spots: spots,
          isCurved: true,
          color: const Color(0xFF00BFA5), // Mint Green
          barWidth: 3,
          isStrokeCapRound: true,
          dotData: FlDotData(
            show: true,
            getDotPainter: (spot, percent, barData, index) {
              return FlDotCirclePainter(
                radius: 4,
                color: Colors.white,
                strokeWidth: 2,
                strokeColor: const Color(0xFF00BFA5),
              );
            },
          ),
          belowBarData: BarAreaData(
            show: true,
            gradient: LinearGradient(
              colors: [
                const Color(0xFF00BFA5).withValues(alpha: 0.3),
                const Color(0xFF00BFA5).withValues(alpha: 0.0),
              ],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
          ),
        ),
      ],
      lineTouchData: LineTouchData(
        touchTooltipData: LineTouchTooltipData(
          getTooltipColor: (touchedSpot) => const Color(0xFF1F2937), // Dark grey tooltip
          getTooltipItems: (touchedSpots) {
            return touchedSpots.map((LineBarSpot touchedSpot) {
              final date = DateTime.fromMillisecondsSinceEpoch(
                  startTime + (touchedSpot.x * 24 * 60 * 60 * 1000).toInt());
              final dateStr = '${date.day}/${date.month}/${date.year}';
              
              return LineTooltipItem(
                '${touchedSpot.y.toStringAsFixed(1)} kg\n',
                GoogleFonts.inter(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
                children: [
                  TextSpan(
                    text: dateStr,
                    style: GoogleFonts.inter(
                      color: Colors.grey.shade400,
                      fontWeight: FontWeight.normal,
                      fontSize: 12,
                    ),
                  ),
                ],
              );
            }).toList();
          },
        ),
        handleBuiltInTouches: true,
      ),
    );
  }

  double _calculateXInterval(int spotCount) {
    if (spotCount <= 5) return 1.0;
    if (spotCount <= 14) return 2.0;
    if (spotCount <= 30) return 5.0;
    return 10.0;
  }

  Widget _buildTelemetryGrid(BiometricAuditProvider provider) {
    final baseline = provider.baselineWeight;
    final current = provider.currentWeight;
    final delta = provider.varianceDelta;
    
    // For delta color logic: typically losing weight is good for "Lose Weight" goal.
    // If delta < 0 (lost weight), it's green. If > 0, red.
    final deltaColor = delta <= 0 ? Colors.green.shade600 : Colors.red.shade600;
    final deltaIcon = delta <= 0 ? Icons.trending_down : Icons.trending_up;
    final deltaPrefix = delta > 0 ? '+' : '';

    return GridView.count(
      crossAxisCount: 3,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 0.85, // Adjust for taller cards
      children: [
        _buildMetricCard(
          title: 'Baseline Weight',
          value: '${baseline.toStringAsFixed(1)} kg',
          icon: Icons.flag_outlined,
          color: Colors.blueGrey,
        ),
        _buildMetricCard(
          title: 'Current Active',
          value: '${current.toStringAsFixed(1)} kg',
          icon: Icons.monitor_weight_outlined,
          color: const Color(0xFF00796B), // Dark Teal
        ),
        _buildMetricCard(
          title: 'Net Variance',
          value: '$deltaPrefix${delta.toStringAsFixed(1)} kg',
          icon: deltaIcon,
          color: deltaColor,
          valueColor: deltaColor,
        ),
      ],
    );
  }

  Widget _buildMetricCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    Color? valueColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const Spacer(),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: valueColor ?? Colors.black87,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: GoogleFonts.inter(
              fontSize: 11,
              color: Colors.grey.shade600,
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
