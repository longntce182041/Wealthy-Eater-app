import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/meal_generation_provider.dart';

class GenerateMealPlanScreen extends StatelessWidget {
  final String targetClientId;
  final String activeAuthToken;

  const GenerateMealPlanScreen({
    super.key,
    required this.targetClientId,
    required this.activeAuthToken,
  });

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<MealGenerationProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'AI Optimization Core Control Board',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFF1A5276),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              elevation: 4,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Padding(
                padding: EdgeInsets.all(20.0),
                child: Column(
                  children: [
                    Text(
                      'Active Context Parameters Monitor',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        Chip(
                          label: Text('Role: Certified Specialist'),
                          backgroundColor: Color(0xFFEBF5FB),
                        ),
                        Chip(
                          label: Text('Constraints: Validated Matrix'),
                          backgroundColor: Color(0xFFE8F8F5),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 40),
            Builder(
              builder: (context) {
                if (provider.state == MealGenerationState.loading) {
                  return const Center(
                    child: Column(
                      children: [
                        CircularProgressIndicator(color: Color(0xFF1A5276)),
                        SizedBox(height: 16),
                        Text(
                          'Compiling Linear Matrix constraints variables... Please wait.',
                          style: TextStyle(fontStyle: FontStyle.italic),
                        ),
                      ],
                    ),
                  );
                } else if (provider.state == MealGenerationState.error) {
                  return Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFADBD8),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'Pipeline Execution Failure Context Notice: ${provider.errorMessage}',
                      style: const TextStyle(
                        color: Color(0xFF943126),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  );
                } else if (provider.state == MealGenerationState.success && provider.generationResult != null) {
                  final metrics = provider.generationResult!;
                  return Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: const Color(0xFFD4EFDF),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: const Color(0xFF27AE60),
                        width: 1.5,
                      ),
                    ),
                    child: Column(
                      children: [
                        const Icon(
                          Icons.check_circle,
                          color: Color(0xFF27AE60),
                          size: 48,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          metrics.message,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const Divider(height: 24),
                        Text(
                          'Instantiated Target Plan ID Reference Key: ${metrics.mealPlanId}',
                          style: const TextStyle(fontFamily: 'monospace'),
                        ),
                        Text(
                          'Energy Target Distribution Envelope: ${metrics.totalCalories} Kcal',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        Text(
                          'Total Portion Item Models Generated: ${metrics.itemsCount}',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  );
                } else {
                  return ElevatedButton.icon(
                    icon: const Icon(Icons.psychology, size: 24),
                    label: const Padding(
                      padding: EdgeInsets.symmetric(vertical: 16.0),
                      child: Text(
                        'Run Optimization Framework Pipelines',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      foregroundColor: Colors.white,
                      backgroundColor: const Color(0xFF27AE60),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    onPressed: () {
                      context
                          .read<MealGenerationProvider>()
                          .executePipeline(targetClientId, activeAuthToken);
                    },
                  );
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}
