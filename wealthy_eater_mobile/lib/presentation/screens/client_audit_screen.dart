import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:wealthy_eater_mobile/core/network/api_client.dart';
import 'package:wealthy_eater_mobile/data/services/diet_audit_service.dart';
import 'package:wealthy_eater_mobile/features/nutritionist/data/repositories/diet_audit_repository_impl.dart'; 
import 'package:wealthy_eater_mobile/domain/usecases/get_client_diet_audit_usecase.dart';
import 'package:wealthy_eater_mobile/presentation/widgets/diet_audit_chart.dart'; 
import '../../features/nutritionist/presentation/providers/diet_audit_notifier.dart'; 

class ClientAuditScreen extends StatefulWidget {
  final String clientId;
  const ClientAuditScreen({super.key, required this.clientId});

  @override
  State<ClientAuditScreen> createState() => _ClientAuditScreenState();
}

class _ClientAuditScreenState extends State<ClientAuditScreen> {
  late DietAuditNotifier _notifier;
  DateTime _selectedDate = DateTime.now();
  String _filterType = "ALL"; // ALL, EATEN, PENDING

  @override
  void initState() {
    super.initState();
    _notifier = DietAuditNotifier(
      GetClientDietAuditUseCase(
        DietAuditRepositoryImpl(
          DietAuditService(context.read<ApiClient>()),
        ),
      ),
    );

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  void _loadData() {
    final dateStr = _formatDateYMD(_selectedDate);
    _notifier.loadAuditData(widget.clientId, dateStr);
  }

  void _onDateChanged(DateTime newDate) {
    setState(() {
      _selectedDate = newDate;
    });
    _loadData();
  }

  String _formatDateYMD(DateTime date) {
    return "${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}";
  }

  String _formatDisplayDate(DateTime date) {
    final now = DateTime.now();
    final isToday = date.year == now.year && date.month == now.month && date.day == now.day;
    final yesterday = now.subtract(const Duration(days: 1));
    final isYesterday = date.year == yesterday.year && date.month == yesterday.month && date.day == yesterday.day;
    final tomorrow = now.add(const Duration(days: 1));
    final isTomorrow = date.year == tomorrow.year && date.month == tomorrow.month && date.day == tomorrow.day;

    final dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    final monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    final dayStr = dayNames[date.weekday - 1];
    final monthStr = monthNames[date.month - 1];
    final dateFormatted = "$dayStr, $monthStr ${date.day}, ${date.year}";

    if (isToday) return "Today ($dateFormatted)";
    if (isYesterday) return "Yesterday ($dateFormatted)";
    if (isTomorrow) return "Tomorrow ($dateFormatted)";
    return dateFormatted;
  }

  String _formatTime(dynamic timestamp) {
    if (timestamp == null) return "";
    try {
      final dt = DateTime.parse(timestamp.toString()).toLocal();
      final hour = dt.hour.toString().padLeft(2, '0');
      final minute = dt.minute.toString().padLeft(2, '0');
      return "$hour:$minute";
    } catch (_) {
      return "";
    }
  }

  @override
  void dispose() {
    _notifier.dispose();
    super.dispose();
  }

  Future<void> _showDatePickerDialog() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      helpText: "Select Date to Audit",
    );
    if (picked != null && picked != _selectedDate) {
      _onDateChanged(picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final isToday = _selectedDate.year == now.year &&
        _selectedDate.month == now.month &&
        _selectedDate.day == now.day;

    return Scaffold(
      appBar: AppBar(
        title: const Text("Diet Log Comparison"),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: "Refresh Data",
            onPressed: _loadData,
          ),
        ],
      ),
      body: Column(
        children: [
          // ── Date Picker Navigation Header ─────────────────────────────
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(12),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left),
                  tooltip: "Previous Day",
                  onPressed: () => _onDateChanged(
                    _selectedDate.subtract(const Duration(days: 1)),
                  ),
                ),
                Expanded(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(8),
                    onTap: _showDatePickerDialog,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey.shade300),
                        borderRadius: BorderRadius.circular(8),
                        color: Theme.of(context).colorScheme.primaryContainer.withAlpha(40),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.calendar_today,
                            size: 16,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              _formatDisplayDate(_selectedDate),
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.arrow_drop_down, size: 18),
                        ],
                      ),
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right),
                  tooltip: "Next Day",
                  onPressed: () => _onDateChanged(
                    _selectedDate.add(const Duration(days: 1)),
                  ),
                ),
                if (!isToday)
                  TextButton(
                    onPressed: () => _onDateChanged(DateTime.now()),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      minimumSize: const Size(40, 36),
                    ),
                    child: const Text("Today", style: TextStyle(fontSize: 12)),
                  ),
              ],
            ),
          ),

          // ── Main Body with Audit Results ──────────────────────────────
          Expanded(
            child: ListenableBuilder(
              listenable: _notifier,
              builder: (context, child) {
                if (_notifier.isLoading) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (_notifier.errorMessage != null) {
                  String friendlyMessage =
                      "Unable to connect to the server. Please try again later.";
                  if (_notifier.errorMessage!.contains("No active published meal plan")) {
                    friendlyMessage =
                        "This client does not have an active Meal Plan configured yet.";
                  } else if (_notifier.errorMessage!.contains("Route GET")) {
                    friendlyMessage =
                        "System error: The audit API route is incorrect.";
                  }

                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.info_outline, size: 60, color: Colors.orange),
                          const SizedBox(height: 16),
                          Text(
                            friendlyMessage,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w500,
                              color: Colors.black87,
                            ),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton.icon(
                            onPressed: _loadData,
                            icon: const Icon(Icons.refresh),
                            label: const Text("Retry"),
                          ),
                        ],
                      ),
                    ),
                  );
                }

                if (_notifier.data == null) {
                  return const Center(
                    child: Text("No audit data available for this date."),
                  );
                }

                final data = _notifier.data!;
                final target = Map<String, dynamic>.from(data['target'] ?? {});
                final actual = Map<String, dynamic>.from(data['actual'] ?? {});
                final summary = Map<String, dynamic>.from(data['summary'] ?? {});
                final List<dynamic> rawMeals = data['meals'] ?? [];
                final List<Map<String, dynamic>> meals = rawMeals
                    .map((m) => Map<String, dynamic>.from(m as Map))
                    .toList();

                final totalPlanned = summary['totalPlannedMeals'] ?? 0;
                final totalEaten = summary['totalEatenMeals'] ?? 0;
                final totalPending = summary['totalPendingMeals'] ?? 0;
                final isDeviated = summary['isDeviated'] == true;
                final status = summary['status'] ?? 'UNKNOWN';

                // Filter meals according to active tab
                List<Map<String, dynamic>> filteredMeals = meals;
                if (_filterType == "EATEN") {
                  filteredMeals = meals.where((m) => m['isEaten'] == true).toList();
                } else if (_filterType == "PENDING") {
                  filteredMeals = meals.where((m) => m['isEaten'] == false).toList();
                }

                return SingleChildScrollView(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // ── 1. Daily Overview Banner ──────────────────────
                      _buildOverviewCard(
                        status: status,
                        isDeviated: isDeviated,
                        totalPlanned: totalPlanned,
                        totalEaten: totalEaten,
                        totalPending: totalPending,
                        adherenceRate: summary['adherenceRate'] ?? 0,
                      ),
                      const SizedBox(height: 16),

                      // ── 2. Meals Breakdown (Đã ăn / Chưa ăn) ──────────
                      _buildMealsSectionHeader(
                        totalEaten: totalEaten,
                        totalPending: totalPending,
                        totalAll: meals.length,
                      ),
                      const SizedBox(height: 12),

                      if (filteredMeals.isEmpty)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade50,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.grey.shade200),
                          ),
                          child: Center(
                            child: Text(
                              _filterType == "EATEN"
                                  ? "No meals eaten yet on this date."
                                  : (_filterType == "PENDING"
                                      ? "All planned meals have been logged!"
                                      : "No meals planned or logged for this day."),
                              style: TextStyle(color: Colors.grey.shade600),
                            ),
                          ),
                        )
                      else
                        ...filteredMeals.map((meal) => _buildMealCard(meal)),

                      const SizedBox(height: 24),

                      // ── 3. Nutrition Comparison Chart ─────────────────
                      DietAuditChart(targetData: target, actualData: actual),
                      const SizedBox(height: 20),

                      // ── 4. Macro Delta Breakdown Table ────────────────
                      _buildMacroSummaryTable(
                        target: target,
                        actual: actual,
                        delta: Map<String, dynamic>.from(data['delta'] ?? {}),
                      ),
                      const SizedBox(height: 20),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  // ── Overview & Adherence Card ─────────────────────────────────────────
  Widget _buildOverviewCard({
    required String status,
    required bool isDeviated,
    required int totalPlanned,
    required int totalEaten,
    required int totalPending,
    required dynamic adherenceRate,
  }) {
    Color statusColor = Colors.green;
    String statusText = "On Track";

    if (status == "OVER_BUDGET") {
      statusColor = Colors.red;
      statusText = "Over Budget (+300 kcal)";
    } else if (status == "UNDER_BUDGET") {
      statusColor = Colors.orange;
      statusText = "Under Budget (-300 kcal)";
    } else if (status == "NO_LOGS") {
      statusColor = Colors.blueGrey;
      statusText = "No Logs Recorded";
    }

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      isDeviated ? Icons.warning_amber_rounded : Icons.check_circle_outline,
                      color: statusColor,
                      size: 22,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      "Status: $statusText",
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: statusColor,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withAlpha(25),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: statusColor.withAlpha(100)),
                  ),
                  child: Text(
                    "$adherenceRate% Adherence",
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: statusColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(
                value: totalPlanned > 0 ? (totalEaten / totalPlanned).clamp(0.0, 1.0) : 0.0,
                minHeight: 8,
                backgroundColor: Colors.grey.shade200,
                valueColor: AlwaysStoppedAnimation<Color>(
                  totalEaten >= totalPlanned && totalPlanned > 0
                      ? Colors.green
                      : Colors.blue,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatItem("Planned", "$totalPlanned", Colors.blueGrey),
                _buildStatItem("Eaten", "$totalEaten", Colors.green),
                _buildStatItem("Pending", "$totalPending", Colors.orange),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
        ),
      ],
    );
  }

  // ── Meal Section Header & Filter Tabs ─────────────────────────────────
  Widget _buildMealsSectionHeader({
    required int totalEaten,
    required int totalPending,
    required int totalAll,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          "Daily Meals Breakdown",
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _buildFilterChip("ALL", "All ($totalAll)"),
              const SizedBox(width: 8),
              _buildFilterChip("EATEN", "Eaten ($totalEaten)", color: Colors.green),
              const SizedBox(width: 8),
              _buildFilterChip("PENDING", "Pending ($totalPending)", color: Colors.orange),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildFilterChip(String type, String label, {Color? color}) {
    final isSelected = _filterType == type;
    final activeColor = color ?? Theme.of(context).colorScheme.primary;

    return FilterChip(
      label: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          color: isSelected ? Colors.white : Colors.black87,
        ),
      ),
      selected: isSelected,
      onSelected: (_) {
        setState(() {
          _filterType = type;
        });
      },
      selectedColor: activeColor,
      backgroundColor: Colors.grey.shade100,
      showCheckmark: false,
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    );
  }

  // ── Single Meal Card (Eaten vs Pending) ────────────────────────────────
  Widget _buildMealCard(Map<String, dynamic> meal) {
    final bool isEaten = meal['isEaten'] == true;
    final bool isPlanned = meal['isPlanned'] == true;
    final String mealType = meal['mealType'] ?? 'Meal';
    final String name = meal['name'] ?? 'Custom Meal';
    final int targetCal = (meal['targetCalories'] ?? 0).toInt();
    final int actualCal = (meal['actualCalories'] ?? 0).toInt();
    final String loggedTime = _formatTime(meal['loggedAt']);
    final dynamic actualWeight = meal['actualWeightGram'];

    final targetMacros = Map<String, dynamic>.from(meal['targetMacros'] ?? {});
    final actualMacros = Map<String, dynamic>.from(meal['actualMacros'] ?? {});

    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(
          color: isEaten ? Colors.green.shade200 : Colors.orange.shade200,
          width: 1,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Row: MealType + Status Badge
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primaryContainer,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        mealType,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.onPrimaryContainer,
                        ),
                      ),
                    ),
                    if (!isPlanned) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.purple.shade50,
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: Colors.purple.shade200),
                        ),
                        child: Text(
                          "Extra Log",
                          style: TextStyle(fontSize: 10, color: Colors.purple.shade800),
                        ),
                      ),
                    ],
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isEaten ? Colors.green.shade50 : Colors.orange.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isEaten ? Colors.green.shade300 : Colors.orange.shade300,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        isEaten ? Icons.check_circle : Icons.schedule,
                        size: 14,
                        color: isEaten ? Colors.green.shade700 : Colors.orange.shade700,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        isEaten ? "Đã ăn" : "Chưa ăn",
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: isEaten ? Colors.green.shade700 : Colors.orange.shade700,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Meal Name
            Text(
              name,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 6),

            // Calories Comparison
            Row(
              children: [
                if (isEaten) ...[
                  Text(
                    "$actualCal kcal",
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Colors.green,
                    ),
                  ),
                  if (isPlanned && targetCal > 0) ...[
                    Text(
                      " / Target: $targetCal kcal",
                      style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                    ),
                    const SizedBox(width: 6),
                    _buildDeltaBadge(actualCal - targetCal),
                  ],
                ] else ...[
                  Text(
                    "Target: $targetCal kcal",
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Colors.orange.shade800,
                    ),
                  ),
                ],
                const Spacer(),
                if (isEaten && loggedTime.isNotEmpty)
                  Row(
                    children: [
                      Icon(Icons.access_time, size: 13, color: Colors.grey.shade600),
                      const SizedBox(width: 4),
                      Text(
                        loggedTime,
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                      ),
                    ],
                  ),
              ],
            ),

            if (actualWeight != null) ...[
              const SizedBox(height: 4),
              Text(
                "Portion: ${actualWeight}g",
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
              ),
            ],

            const Divider(height: 16),

            // Macros Chips Row
            _buildMacroChipsRow(
              isEaten: isEaten,
              targetMacros: targetMacros,
              actualMacros: actualMacros,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDeltaBadge(int delta) {
    if (delta.abs() < 10) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
        decoration: BoxDecoration(
          color: Colors.green.shade50,
          borderRadius: BorderRadius.circular(4),
        ),
        child: const Text("Exact", style: TextStyle(fontSize: 10, color: Colors.green)),
      );
    }
    final isPositive = delta > 0;
    final color = isPositive ? Colors.red.shade700 : Colors.blue.shade700;
    final bg = isPositive ? Colors.red.shade50 : Colors.blue.shade50;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        "${isPositive ? '+' : ''}$delta kcal",
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color),
      ),
    );
  }

  Widget _buildMacroChipsRow({
    required bool isEaten,
    required Map<String, dynamic> targetMacros,
    required Map<String, dynamic> actualMacros,
  }) {
    final p = isEaten ? (actualMacros['protein'] ?? 0) : (targetMacros['protein'] ?? 0);
    final f = isEaten ? (actualMacros['fat'] ?? 0) : (targetMacros['fat'] ?? 0);
    final c = isEaten ? (actualMacros['carbs'] ?? 0) : (targetMacros['carbs'] ?? 0);

    return Row(
      children: [
        _buildNutrientChip("P", "${p}g", Colors.purple),
        const SizedBox(width: 8),
        _buildNutrientChip("F", "${f}g", Colors.amber.shade900),
        const SizedBox(width: 8),
        _buildNutrientChip("C", "${c}g", Colors.blue),
      ],
    );
  }

  Widget _buildNutrientChip(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withAlpha(20),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withAlpha(80)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            "$label: ",
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: color),
          ),
          Text(
            value,
            style: TextStyle(fontSize: 11, color: color),
          ),
        ],
      ),
    );
  }

  // ── Macro Summary Table ───────────────────────────────────────────────
  Widget _buildMacroSummaryTable({
    required Map<String, dynamic> target,
    required Map<String, dynamic> actual,
    required Map<String, dynamic> delta,
  }) {
    return Card(
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Nutritional Summary",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Table(
              columnWidths: const {
                0: FlexColumnWidth(2.0),
                1: FlexColumnWidth(1.5),
                2: FlexColumnWidth(1.5),
                3: FlexColumnWidth(1.5),
              },
              children: [
                TableRow(
                  decoration: BoxDecoration(color: Colors.grey.shade100),
                  children: const [
                    Padding(
                      padding: EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                      child: Text("Metric", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                    Padding(
                      padding: EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                      child: Text("Target", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                    Padding(
                      padding: EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                      child: Text("Actual", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                    Padding(
                      padding: EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                      child: Text("Delta", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                  ],
                ),
                _buildTableRow("Calories", "${target['calories'] ?? 0} kcal", "${actual['calories'] ?? 0} kcal", "${delta['calories'] ?? 0} kcal", isCalories: true),
                _buildTableRow("Protein", "${target['protein'] ?? 0}g", "${actual['protein'] ?? 0}g", "${delta['protein'] ?? 0}g"),
                _buildTableRow("Fat", "${target['fat'] ?? 0}g", "${actual['fat'] ?? 0}g", "${delta['fat'] ?? 0}g"),
                _buildTableRow("Carbs", "${target['carbs'] ?? 0}g", "${actual['carbs'] ?? 0}g", "${delta['carbs'] ?? 0}g"),
              ],
            ),
          ],
        ),
      ),
    );
  }

  TableRow _buildTableRow(String label, String targetVal, String actualVal, String deltaVal, {bool isCalories = false}) {
    return TableRow(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
          child: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
          child: Text(targetVal, style: const TextStyle(fontSize: 12)),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
          child: Text(actualVal, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
          child: Text(
            deltaVal,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: isCalories ? (deltaVal.startsWith('-') ? Colors.blue : Colors.red) : Colors.black87,
            ),
          ),
        ),
      ],
    );
  }
}
