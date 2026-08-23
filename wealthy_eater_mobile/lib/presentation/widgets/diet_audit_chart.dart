import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

class DietAuditChart extends StatelessWidget {
  final Map<String, dynamic> targetData;
  final Map<String, dynamic> actualData;

  const DietAuditChart({
    super.key,
    required this.targetData,
    required this.actualData,
  });

  @override
  Widget build(BuildContext context) {
    final maxY = _getMaxY();
    final interval = _getInterval(maxY);

    return Card(
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  "Nutrition Comparison",
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                Row(
                  children: [
                    _buildIndicator(const Color(0xFF2563EB), "Target"),
                    const SizedBox(width: 12),
                    _buildIndicator(const Color(0xFFF97316), "Actual"),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 20),
            SizedBox(
              height: 260,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: maxY,
                  minY: 0,
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    horizontalInterval: interval,
                    getDrawingHorizontalLine: (value) => FlLine(
                      color: Colors.grey.shade200,
                      strokeWidth: 1,
                      dashArray: [5, 5],
                    ),
                  ),
                  barTouchData: BarTouchData(
                    enabled: true,
                    touchTooltipData: BarTouchTooltipData(
                      getTooltipColor: (_) => Colors.blueGrey.shade900,
                      getTooltipItem: (group, groupIndex, rod, rodIndex) {
                        final titles = ["Cal", "Protein", "Fat", "Carbs"];
                        final isTarget = rodIndex == 0;
                        final unit = groupIndex == 0 ? " kcal" : "g";
                        final val = groupIndex == 0 ? (rod.toY * 10).round() : rod.toY.round();
                        return BarTooltipItem(
                          "${titles[groupIndex]} (${isTarget ? 'Target' : 'Actual'}):\n",
                          const TextStyle(color: Colors.white70, fontSize: 11),
                          children: [
                            TextSpan(
                              text: "$val$unit",
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                  titlesData: FlTitlesData(
                    show: true,
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          const titles = ["Cal (÷10)", "Protein", "Fat", "Carbs"];
                          final idx = value.toInt();
                          if (idx < 0 || idx >= titles.length) return const SizedBox();
                          return Padding(
                            padding: const EdgeInsets.only(top: 8.0),
                            child: Text(
                              titles[idx],
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 12,
                                color: Colors.black87,
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 42,
                        interval: interval,
                        getTitlesWidget: (value, meta) {
                          if (value == 0) {
                            return const Text('0', style: TextStyle(fontSize: 10, color: Colors.grey));
                          }
                          return Text(
                            '${value.toInt()}',
                            style: const TextStyle(fontSize: 10, color: Colors.grey),
                          );
                        },
                      ),
                    ),
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  ),
                  borderData: FlBorderData(show: false),
                  barGroups: [
                    _makeBarGroup(0, (targetData['calories'] ?? 0) / 10, (actualData['calories'] ?? 0) / 10),
                    _makeBarGroup(1, (targetData['protein'] ?? 0).toDouble(), (actualData['protein'] ?? 0).toDouble()),
                    _makeBarGroup(2, (targetData['fat'] ?? 0).toDouble(), (actualData['fat'] ?? 0).toDouble()),
                    _makeBarGroup(3, (targetData['carbs'] ?? 0).toDouble(), (actualData['carbs'] ?? 0).toDouble()),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  BarChartGroupData _makeBarGroup(int x, double targetValue, double actualValue) {
    return BarChartGroupData(
      x: x,
      barsSpace: 6,
      barRods: [
        BarChartRodData(
          toY: targetValue < 0 ? 0 : targetValue,
          color: const Color(0xFF2563EB),
          width: 14,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
        ),
        BarChartRodData(
          toY: actualValue < 0 ? 0 : actualValue,
          color: const Color(0xFFF97316),
          width: 14,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
        ),
      ],
    );
  }

  Widget _buildIndicator(Color color, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(3),
          ),
        ),
        const SizedBox(width: 4),
        Text(text, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
      ],
    );
  }

  double _getMaxY() {
    double maxTarget = [
      (targetData['calories'] ?? 0) / 10,
      targetData['protein'] ?? 0,
      targetData['fat'] ?? 0,
      targetData['carbs'] ?? 0,
    ].fold(0.0, (max, v) => (v != null && v.toDouble() > max) ? v.toDouble() : max);

    double maxActual = [
      (actualData['calories'] ?? 0) / 10,
      actualData['protein'] ?? 0,
      actualData['fat'] ?? 0,
      actualData['carbs'] ?? 0,
    ].fold(0.0, (max, v) => (v != null && v.toDouble() > max) ? v.toDouble() : max);

    double highest = maxTarget > maxActual ? maxTarget : maxActual;
    if (highest <= 50) return 60.0;
    if (highest <= 100) return 120.0;
    if (highest <= 200) return 240.0;
    if (highest <= 500) return 600.0;
    return (highest * 1.25 / 100).ceil() * 100.0;
  }

  double _getInterval(double maxY) {
    if (maxY <= 60) return 20.0;
    if (maxY <= 120) return 30.0;
    if (maxY <= 240) return 60.0;
    if (maxY <= 600) return 150.0;
    return (maxY / 4).roundToDouble();
  }
}