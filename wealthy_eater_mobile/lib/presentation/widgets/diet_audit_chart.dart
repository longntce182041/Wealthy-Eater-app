import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

class DietAuditChart extends StatelessWidget {
  // Nhận dữ liệu truyền vào từ API Backend
  final Map<String, dynamic> targetData;
  final Map<String, dynamic> actualData;

  const DietAuditChart({
    Key? key,
    required this.targetData,
    required this.actualData,
  }) : super(key: key);

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
              "Đối chiếu Dinh dưỡng Song song",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            // Chú thích màu sắc cột
            Row(
              children: [
                _buildIndicator(Colors.blue, "Mục tiêu"),
                const SizedBox(width: 16),
                _buildIndicator(Colors.orange, "Thực tế thực ăn"),
              ],
            ),
            const SizedBox(height: 24),
            // Khung chứa Biểu đồ fl_chart
            SizedBox(
              height: 300,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: _getMaxY(), // Tự động tính chiều cao đỉnh biểu đồ
                  barTouchData: BarTouchData(enabled: true),
                  titlesData: FlTitlesData(
                    show: true,
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          const titles = ["Calo (x10)", "Protein", "Fat", "Carbs"];
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
                    // Cột 0: Calories (Chia 10 để scale tỉ lệ vừa vặn với các chất Gram)
                    _makeBarGroup(0, (targetData['calories'] ?? 0) / 10, (actualData['calories'] ?? 0) / 10),
                    // Cột 1: Protein (g)
                    _makeBarGroup(1, (targetData['protein'] ?? 0).toDouble(), (actualData['protein'] ?? 0).toDouble()),
                    // Cột 2: Fat (g)
                    _makeBarGroup(2, (targetData['fat'] ?? 0).toDouble(), (actualData['fat'] ?? 0).toDouble()),
                    // Cột 3: Carbs (g)
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

  // Hàm helper tạo nhóm 2 cột đứng song song nhau
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
    // Tìm giá trị lớn nhất để làm trần biểu đồ không bị tràn viền
    double maxTarget = [(targetData['calories'] ?? 0) / 10, targetData['protein'] ?? 0, targetData['fat'] ?? 0, targetData['carbs'] ?? 0].reduce((a, b) => a > b ? a : b).toDouble();
    double maxActual = [(actualData['calories'] ?? 0) / 10, actualData['protein'] ?? 0, actualData['fat'] ?? 0, actualData['carbs'] ?? 0].reduce((a, b) => a > b ? a : b).toDouble();
    return (maxTarget > maxActual ? maxTarget : maxActual) + 30;
  }
}