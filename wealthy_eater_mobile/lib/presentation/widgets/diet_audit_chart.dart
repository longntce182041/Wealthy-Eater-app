import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

class DietAuditChart extends StatelessWidget {
  // Data received from Backend API
  final Map<String, dynamic> targetData;
  final Map<String, dynamic> actualData;

  const DietAuditChart({
    super.key,
    required this.targetData,
    required this.actualData,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Nutrition Comparison",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            // Legend
            Row(
              children: [
                _buildIndicator(Colors.blue, "Target"),
                const SizedBox(width: 16),
                _buildIndicator(Colors.orange, "Actual"),
              ],
            ),
            const SizedBox(height: 24),
            // Chart container
            SizedBox(
              height: 300,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: _getMaxY(),
                  barTouchData: BarTouchData(enabled: true),
                  titlesData: FlTitlesData(
                    show: true,
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          const titles = ["Cal (÷10)", "Protein", "Fat", "Carbs"];
                          return Padding(
                            padding: const EdgeInsets.only(top: 8.0),
                            child: Text(titles[value.toInt()],
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          );
                        },
                      ),
                    ),
                    leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 40)),
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  ),
                  borderData: FlBorderData(show: false),
                  barGroups: [
                    // Column 0: Calories (÷10 to scale alongside gram-based values)
                    _makeBarGroup(0, (targetData['calories'] ?? 0) / 10, (actualData['calories'] ?? 0) / 10),
                    // Column 1: Protein (g)
                    _makeBarGroup(1, (targetData['protein'] ?? 0).toDouble(), (actualData['protein'] ?? 0).toDouble()),
                    // Column 2: Fat (g)
                    _makeBarGroup(2, (targetData['fat'] ?? 0).toDouble(), (actualData['fat'] ?? 0).toDouble()),
                    // Column 3: Carbs (g)
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

  // Helper: creates a pair of side-by-side bars
  BarChartGroupData _makeBarGroup(int x, double targetValue, double actualValue) {
    return BarChartGroupData(
      x: x,
      barRods: [
        BarChartRodData(toY: targetValue, color: Colors.blue, width: 14, borderRadius: BorderRadius.circular(4)),
        BarChartRodData(toY: actualValue, color: Colors.orange, width: 14, borderRadius: BorderRadius.circular(4)),
      ],
    );
  }

  Widget _buildIndicator(Color color, String text) {
    return Row(
      children: [
        Container(width: 16, height: 16, decoration: BoxDecoration(color: color, shape: BoxShape.rectangle, borderRadius: BorderRadius.circular(4))),
        const SizedBox(width: 4),
        Text(text, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
      ],
    );
  }

  double _getMaxY() {
    // Find max value to set chart ceiling without clipping
    double maxTarget = [(targetData['calories'] ?? 0) / 10, targetData['protein'] ?? 0, targetData['fat'] ?? 0, targetData['carbs'] ?? 0].reduce((a, b) => a > b ? a : b).toDouble();
    double maxActual = [(actualData['calories'] ?? 0) / 10, actualData['protein'] ?? 0, actualData['fat'] ?? 0, actualData['carbs'] ?? 0].reduce((a, b) => a > b ? a : b).toDouble();
    return (maxTarget > maxActual ? maxTarget : maxActual) + 30;
  }
}