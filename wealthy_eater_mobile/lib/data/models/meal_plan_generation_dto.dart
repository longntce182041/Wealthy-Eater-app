class MealPlanGenerationResponse {
  final String status;
  final String message;
  final String mealPlanId;
  final double totalCalories;
  final int itemsCount;

  MealPlanGenerationResponse({
    required this.status,
    required this.message,
    required this.mealPlanId,
    required this.totalCalories,
    required this.itemsCount,
  });

  factory MealPlanGenerationResponse.fromJson(Map<String, dynamic> json) {
    final meta = json['meta'] as Map<String, dynamic>;
    return MealPlanGenerationResponse(
      status: json['status'] ?? '',
      message: json['message'] ?? '',
      mealPlanId: meta['mealPlanId'] ?? '',
      totalCalories: (meta['totalEnergyEnvelopeKcal'] as num).toDouble(),
      itemsCount: meta['allocatedComponentsCount'] ?? 0,
    );
  }
}
