import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';

class ProfileFormScreen extends StatefulWidget {
  const ProfileFormScreen({super.key});

  @override
  State<ProfileFormScreen> createState() => _ProfileFormScreenState();
}

class _ProfileFormScreenState extends State<ProfileFormScreen> {
  final PageController _pageController = PageController();
  int _currentStep = 0;
  final int _totalSteps = 8; // Steps 0 to 7

  // Setup state variables
  String _gender = 'male';
  int _age = 26;
  int _height = 170;
  final TextEditingController _weightCtrl = TextEditingController(text: '70.0');
  String _healthGoal = 'maintain';
  String _activity = 'sedentary';
  final Set<String> _selectedDiets = {};
  final Set<String> _selectedAllergies = {};

  late FixedExtentScrollController _ageScrollCtrl;
  late FixedExtentScrollController _heightScrollCtrl;

  final List<String> _dietOptions = [
    'Keto',
    'Vegan',
    'Vegetarian',
    'Paleo',
    'Mediterranean',
    'Low-carb',
    'Gluten-free',
    'Dairy-free',
  ];

  final List<String> _allergyOptions = [
    'Peanuts',
    'Seafood',
    'Dairy',
    'Eggs',
    'Gluten',
    'Soy',
    'Shellfish',
    'Tree Nuts',
  ];

  @override
  void initState() {
    super.initState();
    _ageScrollCtrl = FixedExtentScrollController(initialItem: _age - 18);
    _heightScrollCtrl = FixedExtentScrollController(initialItem: _height - 120);
  }

  @override
  void dispose() {
    _pageController.dispose();
    _weightCtrl.dispose();
    _ageScrollCtrl.dispose();
    _heightScrollCtrl.dispose();
    super.dispose();
  }

  void _nextPage() {
    if (_currentStep == 4) {
      // Validate weight page
      final weight = double.tryParse(_weightCtrl.text.trim());
      if (weight == null || weight < 30 || weight > 300) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please enter a valid weight (30-300 kg)'),
            backgroundColor: Colors.redAccent,
          ),
        );
        return;
      }
    }

    if (_currentStep < _totalSteps - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  void _prevPage() {
    if (_currentStep > 0) {
      _pageController.previousPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  double get _bmi {
    final weight = double.tryParse(_weightCtrl.text.trim()) ?? 70.0;
    final heightM = _height / 100.0;
    return weight / (heightM * heightM);
  }

  int get _bmr {
    final weight = double.tryParse(_weightCtrl.text.trim()) ?? 70.0;
    // Mifflin-St Jeor
    final s = _gender == 'male' ? 5 : (_gender == 'female' ? -161 : -78);
    return (10 * weight + 6.25 * _height - 5 * _age + s).round();
  }

  int get _tdee {
    double factor = 1.2;
    switch (_activity) {
      case 'sedentary':
        factor = 1.2;
        break;
      case 'light':
        factor = 1.375;
        break;
      case 'moderate':
        factor = 1.55;
        break;
      case 'active':
        factor = 1.725;
        break;
      case 'very_active':
        factor = 1.9;
        break;
    }
    return (_bmr * factor).round();
  }

  Future<void> _saveProfile() async {
    final auth = context.read<AuthProvider>();
    final weightVal = double.tryParse(_weightCtrl.text.trim()) ?? 70.0;

    final data = {
      'age': _age,
      'gender': _gender,
      'height_cm': _height.toDouble(),
      'weight_kg': weightVal,
      'activity_level': _activity,
      'health_goal': _healthGoal,
      'diet_preferences': _selectedDiets.toList(),
      'allergies': _selectedAllergies.toList(),
    };

    try {
      await auth.saveUserProfile(data);
      if (!mounted) return;
      if (auth.state == AuthState.error) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(auth.errorMessage ?? 'Save failed'),
            backgroundColor: Colors.redAccent,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile setup completed successfully!'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Save failed: $e'),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final primaryColor = Theme.of(context).colorScheme.primary;
    final scaffoldBg = Theme.of(context).scaffoldBackgroundColor;

    return Scaffold(
      backgroundColor: scaffoldBg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: _currentStep > 0
            ? IconButton(
                icon: const Icon(Icons.arrow_back_ios_new, color: Color(0xFF2D2D2D)),
                onPressed: _prevPage,
              )
            : null,
        title: _currentStep > 0
            ? ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: SizedBox(
                  height: 6,
                  child: LinearProgressIndicator(
                    value: _currentStep / (_totalSteps - 1),
                    backgroundColor: Colors.black12,
                    valueColor: AlwaysStoppedAnimation<Color>(primaryColor),
                  ),
                ),
              )
            : null,
      ),
      body: SafeArea(
        child: Consumer<AuthProvider>(
          builder: (context, auth, _) {
            final isLoading = auth.state == AuthState.loading;
            return Stack(
              children: [
                PageView(
                  controller: _pageController,
                  physics: const NeverScrollableScrollPhysics(),
                  onPageChanged: (page) {
                    setState(() {
                      _currentStep = page;
                    });
                  },
                  children: [
                    _buildStepIntro(primaryColor),
                    _buildStepGender(primaryColor),
                    _buildStepAge(primaryColor),
                    _buildStepHeight(primaryColor),
                    _buildStepWeight(primaryColor),
                    _buildStepActivity(primaryColor),
                    _buildStepDietAllergies(primaryColor),
                    _buildStepSummary(primaryColor),
                  ],
                ),
                if (isLoading)
                  Container(
                    color: Colors.black26,
                    child: Center(
                      child: CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(primaryColor),
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Step Views
  // ---------------------------------------------------------------------------

  Widget _buildStepIntro(Color primaryColor) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Icon(
              Icons.restaurant_menu,
              size: 80,
              color: primaryColor,
            ),
          ),
          const SizedBox(height: 32),
          const Text(
            'Personalize Your Experience',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: Color(0xFF2D2D2D),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Let\'s calculate your nutrition, dynamic BMR, and filter customized recipes by completing your personal health profile.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey[700],
              height: 1.5,
            ),
          ),
          const SizedBox(height: 48),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _nextPage,
              style: ElevatedButton.styleFrom(
                backgroundColor: primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 2,
              ),
              child: const Text(
                'Get Started',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepGender(Color primaryColor) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'What is your gender?',
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF2D2D2D)),
          ),
          const SizedBox(height: 8),
          Text(
            'BMR calculation relies partly on physiological factors.',
            style: TextStyle(fontSize: 15, color: Colors.grey[700]),
          ),
          const SizedBox(height: 36),
          Expanded(
            child: ListView(
              children: [
                _buildGenderCard('male', 'Male', Icons.male, primaryColor),
                const SizedBox(height: 16),
                _buildGenderCard('female', 'Female', Icons.female, primaryColor),
                const SizedBox(height: 16),
                _buildGenderCard('other', 'Other', Icons.transgender, primaryColor),
              ],
            ),
          ),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _nextPage,
              style: ElevatedButton.styleFrom(
                backgroundColor: primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: const Text('Continue', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepAge(Color primaryColor) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'How old are you?',
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF2D2D2D)),
          ),
          const SizedBox(height: 8),
          Text(
            'Your age is required to determine metabolic calculations.',
            style: TextStyle(fontSize: 15, color: Colors.grey[700]),
          ),
          Expanded(
            child: Center(
              child: SizedBox(
                height: 250,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Container(
                      height: 55,
                      width: 140,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(28),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.08),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                    ),
                    ListWheelScrollView.useDelegate(
                      controller: _ageScrollCtrl,
                      itemExtent: 55,
                      diameterRatio: 1.4,
                      physics: const FixedExtentScrollPhysics(),
                      onSelectedItemChanged: (index) {
                        setState(() {
                          _age = index + 18;
                        });
                      },
                      childDelegate: ListWheelChildBuilderDelegate(
                        childCount: 73, // 18 to 90
                        builder: (context, index) {
                          final currentAge = index + 18;
                          final isSelected = currentAge == _age;
                          return Center(
                            child: Text(
                              '$currentAge years',
                              style: TextStyle(
                                fontSize: isSelected ? 24 : 20,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                color: isSelected ? primaryColor : const Color(0xFF5D5D5D),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _nextPage,
              style: ElevatedButton.styleFrom(
                backgroundColor: primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: const Text('Continue', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepHeight(Color primaryColor) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'How tall are you?',
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF2D2D2D)),
          ),
          const SizedBox(height: 8),
          Text(
            'Please select your height in centimeters.',
            style: TextStyle(fontSize: 15, color: Colors.grey[700]),
          ),
          Expanded(
            child: Center(
              child: SizedBox(
                height: 250,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Container(
                      height: 55,
                      width: 150,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(28),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.08),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                    ),
                    ListWheelScrollView.useDelegate(
                      controller: _heightScrollCtrl,
                      itemExtent: 55,
                      diameterRatio: 1.4,
                      physics: const FixedExtentScrollPhysics(),
                      onSelectedItemChanged: (index) {
                        setState(() {
                          _height = index + 120;
                        });
                      },
                      childDelegate: ListWheelChildBuilderDelegate(
                        childCount: 131, // 120 to 250
                        builder: (context, index) {
                          final currentHeight = index + 120;
                          final isSelected = currentHeight == _height;
                          return Center(
                            child: Text(
                              '$currentHeight cm',
                              style: TextStyle(
                                fontSize: isSelected ? 24 : 20,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                color: isSelected ? primaryColor : const Color(0xFF5D5D5D),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _nextPage,
              style: ElevatedButton.styleFrom(
                backgroundColor: primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: const Text('Continue', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepWeight(Color primaryColor) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Weight & Goal',
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF2D2D2D)),
          ),
          const SizedBox(height: 8),
          Text(
            'Tell us about your current weight and targets.',
            style: TextStyle(fontSize: 15, color: Colors.grey[700]),
          ),
          const SizedBox(height: 24),
          const Text(
            'Current Weight (kg)',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF2D2D2D)),
          ),
          const SizedBox(height: 10),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: TextField(
              controller: _weightCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d*')),
              ],
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87),
              decoration: const InputDecoration(
                filled: true,
                fillColor: Colors.transparent,
                hintText: 'Enter your weight',
                suffixText: 'kg',
                suffixStyle: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey),
                border: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              ),
            ),
          ),
          const SizedBox(height: 28),
          const Text(
            'What is your target health goal?',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF2D2D2D)),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: ListView(
              children: [
                _buildGoalCard('lose', 'Lose Weight', Icons.trending_down, primaryColor),
                const SizedBox(height: 12),
                _buildGoalCard('maintain', 'Maintain Weight', Icons.horizontal_rule, primaryColor),
                const SizedBox(height: 12),
                _buildGoalCard('gain', 'Gain Weight', Icons.trending_up, primaryColor),
              ],
            ),
          ),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _nextPage,
              style: ElevatedButton.styleFrom(
                backgroundColor: primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: const Text('Continue', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepActivity(Color primaryColor) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Daily Activity Level',
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF2D2D2D)),
          ),
          const SizedBox(height: 8),
          Text(
            'This multiplier calculates TDEE (Total Daily Energy Expenditure).',
            style: TextStyle(fontSize: 15, color: Colors.grey[700]),
          ),
          const SizedBox(height: 24),
          Expanded(
            child: ListView(
              children: [
                _buildActivityCard(
                  'sedentary',
                  'Sedentary',
                  'Little to no activity, desk job',
                  Icons.chair,
                  primaryColor,
                ),
                const SizedBox(height: 12),
                _buildActivityCard(
                  'light',
                  'Lightly Active',
                  'Light exercise / sports 1-3 days/week',
                  Icons.directions_walk,
                  primaryColor,
                ),
                const SizedBox(height: 12),
                _buildActivityCard(
                  'moderate',
                  'Moderately Active',
                  'Moderate exercise / sports 3-5 days/week',
                  Icons.fitness_center,
                  primaryColor,
                ),
                const SizedBox(height: 12),
                _buildActivityCard(
                  'active',
                  'Very Active',
                  'Heavy exercise / sports 6-7 days/week',
                  Icons.run_circle,
                  primaryColor,
                ),
                const SizedBox(height: 12),
                _buildActivityCard(
                  'very_active',
                  'Extremely Active',
                  'Physical work or double workouts daily',
                  Icons.bolt,
                  primaryColor,
                ),
              ],
            ),
          ),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _nextPage,
              style: ElevatedButton.styleFrom(
                backgroundColor: primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: const Text('Continue', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepDietAllergies(Color primaryColor) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Diet & Allergies',
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF2D2D2D)),
          ),
          const SizedBox(height: 8),
          Text(
            'Choose your diet preference and specify any food allergies.',
            style: TextStyle(fontSize: 15, color: Colors.grey[700]),
          ),
          const SizedBox(height: 20),
          Expanded(
            child: ListView(
              children: [
                const Text(
                  'Diet Preferences',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF2D2D2D)),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: _dietOptions.map((diet) {
                    final isSelected = _selectedDiets.contains(diet);
                    return FilterChip(
                      selected: isSelected,
                      label: Text(diet),
                      selectedColor: primaryColor.withValues(alpha: 0.12),
                      checkmarkColor: primaryColor,
                      labelStyle: TextStyle(
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        color: isSelected ? primaryColor : Colors.black87,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(
                          color: isSelected ? primaryColor : Colors.black12,
                        ),
                      ),
                      onSelected: (val) {
                        setState(() {
                          if (val) {
                            _selectedDiets.add(diet);
                          } else {
                            _selectedDiets.remove(diet);
                          }
                        });
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Food Allergies',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF2D2D2D)),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: _allergyOptions.map((allergy) {
                    final isSelected = _selectedAllergies.contains(allergy);
                    return FilterChip(
                      selected: isSelected,
                      label: Text(allergy),
                      selectedColor: Colors.redAccent.withValues(alpha: 0.12),
                      checkmarkColor: Colors.redAccent,
                      labelStyle: TextStyle(
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        color: isSelected ? Colors.redAccent : Colors.black87,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(
                          color: isSelected ? Colors.redAccent : Colors.black12,
                        ),
                      ),
                      onSelected: (val) {
                        setState(() {
                          if (val) {
                            _selectedAllergies.add(allergy);
                          } else {
                            _selectedAllergies.remove(allergy);
                          }
                        });
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 40),
              ],
            ),
          ),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _nextPage,
              style: ElevatedButton.styleFrom(
                backgroundColor: primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: const Text('Continue', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepSummary(Color primaryColor) {
    final weightVal = double.tryParse(_weightCtrl.text.trim()) ?? 70.0;
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Review Your Profile',
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF2D2D2D)),
          ),
          const SizedBox(height: 8),
          Text(
            'Here is a summary of your computed metrics.',
            style: TextStyle(fontSize: 15, color: Colors.grey[700]),
          ),
          const SizedBox(height: 24),
          Expanded(
            child: ListView(
              children: [
                _buildSummaryStatCard(
                  'Body Mass Index (BMI)',
                  '${_bmi.toStringAsFixed(1)} kg/m²',
                  Icons.monitor_weight,
                  _getBmiCategory(_bmi),
                  primaryColor,
                ),
                const SizedBox(height: 12),
                _buildSummaryStatCard(
                  'Basal Metabolic Rate (BMR)',
                  '$_bmr kcal / day',
                  Icons.local_fire_department,
                  'Energy burn at rest',
                  primaryColor,
                ),
                const SizedBox(height: 12),
                _buildSummaryStatCard(
                  'Calculated TDEE Target',
                  '$_tdee kcal / day',
                  Icons.bolt,
                  'Daily maintenance calories',
                  primaryColor,
                ),
                const Divider(height: 32),
                _buildSummaryInfoRow('Gender', _gender.toUpperCase()),
                _buildSummaryInfoRow('Age', '$_age years'),
                _buildSummaryInfoRow('Height', '$_height cm'),
                _buildSummaryInfoRow('Weight', '$weightVal kg'),
                _buildSummaryInfoRow('Goal', _healthGoal.toUpperCase()),
                _buildSummaryInfoRow('Activity', _activity.toUpperCase()),
                _buildSummaryInfoRow(
                  'Diets',
                  _selectedDiets.isEmpty ? 'None' : _selectedDiets.join(', '),
                ),
                _buildSummaryInfoRow(
                  'Allergies',
                  _selectedAllergies.isEmpty ? 'None' : _selectedAllergies.join(', '),
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _saveProfile,
              style: ElevatedButton.styleFrom(
                backgroundColor: primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: const Text('Complete Profile', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Helper Widgets
  // ---------------------------------------------------------------------------

  Widget _buildGenderCard(String value, String label, IconData icon, Color primaryColor) {
    final isSelected = _gender == value;
    return GestureDetector(
      onTap: () {
        setState(() {
          _gender = value;
        });
      },
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: isSelected ? primaryColor.withValues(alpha: 0.12) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? primaryColor : Colors.transparent,
            width: 2,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isSelected ? primaryColor.withValues(alpha: 0.15) : Colors.grey[100],
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                icon,
                color: isSelected ? primaryColor : Colors.grey[600],
                size: 28,
              ),
            ),
            const SizedBox(width: 18),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  color: const Color(0xFF2D2D2D),
                ),
              ),
            ),
            if (isSelected)
              Icon(
                Icons.check_circle,
                color: primaryColor,
                size: 24,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildGoalCard(String value, String label, IconData icon, Color primaryColor) {
    final isSelected = _healthGoal == value;
    return GestureDetector(
      onTap: () {
        setState(() {
          _healthGoal = value;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: isSelected ? primaryColor.withValues(alpha: 0.12) : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? primaryColor : Colors.transparent,
            width: 2,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Row(
          children: [
            Icon(
              icon,
              color: isSelected ? primaryColor : Colors.grey[600],
              size: 24,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  color: const Color(0xFF2D2D2D),
                ),
              ),
            ),
            if (isSelected)
              Icon(
                Icons.check_circle,
                color: primaryColor,
                size: 20,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildActivityCard(String value, String label, String description, IconData icon, Color primaryColor) {
    final isSelected = _activity == value;
    return GestureDetector(
      onTap: () {
        setState(() {
          _activity = value;
        });
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? primaryColor.withValues(alpha: 0.12) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? primaryColor : Colors.transparent,
            width: 2,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isSelected ? primaryColor.withValues(alpha: 0.15) : Colors.grey[100],
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                icon,
                color: isSelected ? primaryColor : Colors.grey[600],
                size: 26,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                      color: const Color(0xFF2D2D2D),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
            if (isSelected)
              Icon(
                Icons.check_circle,
                color: primaryColor,
                size: 22,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryStatCard(String title, String value, IconData icon, String subtitle, Color primaryColor) {
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
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: primaryColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: primaryColor, size: 26),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF2D2D2D),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(fontSize: 15, color: Colors.grey[600], fontWeight: FontWeight.w500),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF2D2D2D)),
            ),
          ),
        ],
      ),
    );
  }

  String _getBmiCategory(double bmi) {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25.0) return 'Normal weight';
    if (bmi < 30.0) return 'Overweight';
    return 'Obese';
  }
}
