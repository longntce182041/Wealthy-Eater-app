import 'package:flutter/material.dart';

/// Widget displaying benefits of becoming an expert
class ExpertBenefitsCard extends StatelessWidget {
  const ExpertBenefitsCard({super.key});

  @override
  Widget build(BuildContext context) {
    const benefits = [
      'Receive consultation requests',
      'Manage assigned clients',
      'Create meal plans',
      'Track client progress',
      'Earn consultation income',
    ];

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Colors.blue.shade50, Colors.green.shade50],
        ),
        border: Border.all(color: Colors.blue.shade200, width: 1.5),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.stars, color: Colors.amber.shade600, size: 28),
              const SizedBox(width: 12),
              const Expanded(
                child: Text(
                  'Expert Benefits',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          ...benefits.map(
            (benefit) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.green.shade400,
                    ),
                    child: const Icon(
                      Icons.check,
                      color: Colors.white,
                      size: 14,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      benefit,
                      style: const TextStyle(
                        fontSize: 14,
                        color: Colors.black87,
                        height: 1.5,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
