import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../providers/auth_provider.dart';

class ProfileFormScreen extends StatefulWidget {
  const ProfileFormScreen({super.key});

  @override
  State<ProfileFormScreen> createState() => _ProfileFormScreenState();
}

class _ProfileFormScreenState extends State<ProfileFormScreen> {
  final PageController _pageController = PageController();
  int _currentStep = 0;
  final int _totalSteps = 11; // Steps 0 to 10

  // Setup state variables
  final TextEditingController _fullNameCtrl = TextEditingController();
  String _gender = 'male';
  int _age = 26;
  int _height = 170;
  final TextEditingController _weightCtrl = TextEditingController(text: '70.0');
  String _healthGoal = 'maintain';
  String _activity = 'sedentary';
  final Set<String> _selectedDiets = {};
  String _cookingSkill = 'beginner';
  int _cookingTime = 30;
  
  // Dynamic metadata lists
  List<dynamic> _dbIngredients = [];
  List<dynamic> _dbMedicalConditions = [];
  bool _isLoadingMetadata = true;

  String? _selectedMedicalConditionId;
  final Set<String> _selectedAllergyIds = {};
  final Set<String> _selectedDislikeIds = {};

  // Search controllers
  final TextEditingController _allergySearchCtrl = TextEditingController();
  final TextEditingController _dislikeSearchCtrl = TextEditingController();
  String _allergyQuery = '';
  String _dislikeQuery = '';
  int _allergiesTab = 0; // 0: Allergies, 1: Dislikes

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


  @override
  void initState() {
    super.initState();
    _ageScrollCtrl = FixedExtentScrollController(initialItem: _age - 18);
    _heightScrollCtrl = FixedExtentScrollController(initialItem: _height - 120);
    _allergySearchCtrl.addListener(() {
      setState(() {
        _allergyQuery = _allergySearchCtrl.text.trim().toLowerCase();
      });
    });
    _dislikeSearchCtrl.addListener(() {
      setState(() {
        _dislikeQuery = _dislikeSearchCtrl.text.trim().toLowerCase();
      });
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadMetadata();
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    _weightCtrl.dispose();
    _fullNameCtrl.dispose();
    _allergySearchCtrl.dispose();
    _dislikeSearchCtrl.dispose();
    _ageScrollCtrl.dispose();
    _heightScrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadMetadata() async {
    try {
      final auth = context.read<AuthProvider>();
      final metadata = await auth.fetchSetupMetadata();
      if (!mounted) return;
      if (metadata != null) {
        setState(() {
          _dbIngredients = metadata['ingredients'] ?? [];
          _dbMedicalConditions = metadata['medicalConditions'] ?? [];
        });
      }
    } catch (e) {
      debugPrint('Error loading metadata: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingMetadata = false;
        });
      }
    }
  }

  void _nextPage() {
    if (_currentStep == 1) {
      // Validate full name page
      final name = _fullNameCtrl.text.trim();
      if (name.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please enter your full name'),
            backgroundColor: AppColors.error,
          ),
        );
        return;
      }
    }
    if (_currentStep == 5) {
      // Validate weight page
      final weight = double.tryParse(_weightCtrl.text.trim());
      if (weight == null || weight < 30 || weight > 300) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please enter a valid weight (30-300 kg)'),
            backgroundColor: AppColors.error,
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
      'full_name': _fullNameCtrl.text.trim(),
      'age': _age,
      'gender': _gender,
      'height_cm': _height.toDouble(),
      'weight_kg': weightVal,
      'activity_level': _activity,
      'health_goal': _healthGoal,
      'diet_preferences': _selectedDiets.toList(),
      'allergies': _selectedAllergyIds.toList(),
      'dislike_ingredients': _selectedDislikeIds.toList(),
      'medical_condition_id': _selectedMedicalConditionId,
      'cooking_skill_level': _cookingSkill,
      'available_cooking_time': _cookingTime,
    };

    try {
      final success = await auth.saveUserProfile(data);
      if (!mounted) return;
      if (!success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(auth.errorMessage ?? 'Save failed'),
            backgroundColor: AppColors.error,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Profile setup completed successfully!'),
            backgroundColor: AppColors.primary,
          ),
        );
        if (Navigator.canPop(context)) {
          Navigator.pop(context);
        }
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Save failed: $e'),
          backgroundColor: AppColors.error,
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
            : (Navigator.canPop(context)
                ? IconButton(
                    icon: const Icon(Icons.close, color: Color(0xFF2D2D2D)),
                    onPressed: () => Navigator.pop(context),
                  )
                : null),
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
                    _buildStepFullName(primaryColor),
                    _buildStepGender(primaryColor),
                    _buildStepAge(primaryColor),
                    _buildStepHeight(primaryColor),
                    _buildStepWeight(primaryColor),
                    _buildStepActivity(primaryColor),
                    _buildStepDietMedical(primaryColor),
                    _buildStepAllergiesDislikes(primaryColor),
                    _buildStepCooking(primaryColor),
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

  Widget _buildStepFullName(Color primaryColor) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'What is your name?',
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF2D2D2D)),
          ),
          const SizedBox(height: 8),
          Text(
            'Please enter your full name to personalize your profile.',
            style: TextStyle(fontSize: 15, color: Colors.grey[700]),
          ),
          const SizedBox(height: 36),
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
              controller: _fullNameCtrl,
              textCapitalization: TextCapitalization.words,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87),
              decoration: const InputDecoration(
                filled: true,
                fillColor: Colors.transparent,
                hintText: 'Enter your full name',
                prefixIcon: Icon(Icons.person_outline, color: Colors.grey),
                border: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              ),
            ),
          ),
          const Spacer(),
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

  Widget _buildStepDietMedical(Color primaryColor) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Diet & Medical Conditions',
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF2D2D2D)),
          ),
          const SizedBox(height: 8),
          Text(
            'Specify your diet preferences and choose any medical conditions.',
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
                const SizedBox(height: 28),
                const Text(
                  'Medical Conditions',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF2D2D2D)),
                ),
                const SizedBox(height: 10),
                if (_isLoadingMetadata)
                  const Center(child: Padding(padding: EdgeInsets.all(16.0), child: CircularProgressIndicator()))
                else ...[
                  _buildMedicalCard(null, 'No Medical Conditions', 'I do not have any chronic medical conditions.', primaryColor),
                  const SizedBox(height: 10),
                  ..._dbMedicalConditions.map((cond) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 10.0),
                      child: _buildMedicalCard(
                        cond['_id'],
                        cond['name'] ?? '',
                        cond['description'] ?? '',
                        primaryColor,
                      ),
                    );
                  }),
                ],
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

  Widget _buildMedicalCard(String? id, String name, String desc, Color primaryColor) {
    final isSelected = _selectedMedicalConditionId == id;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedMedicalConditionId = id;
        });
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? primaryColor.withValues(alpha: 0.12) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? primaryColor : Colors.black12,
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
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                      color: const Color(0xFF2D2D2D),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    desc,
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            if (isSelected)
              Icon(Icons.check_circle, color: primaryColor, size: 24)
            else
              const Icon(Icons.circle_outlined, color: Colors.black12, size: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildStepAllergiesDislikes(Color primaryColor) {
    final searchCtrl = _allergiesTab == 0 ? _allergySearchCtrl : _dislikeSearchCtrl;
    final query = _allergiesTab == 0 ? _allergyQuery : _dislikeQuery;
    final selectedSet = _allergiesTab == 0 ? _selectedAllergyIds : _selectedDislikeIds;

    final filteredIngredients = _dbIngredients.where((ing) {
      final name = (ing['name'] ?? '').toString().toLowerCase();
      return name.contains(query);
    }).toList();

    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Allergies & Dislikes',
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF2D2D2D)),
          ),
          const SizedBox(height: 8),
          Text(
            'Select ingredients you are allergic to or dislike.',
            style: TextStyle(fontSize: 15, color: Colors.grey[700]),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _allergiesTab = 0),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: _allergiesTab == 0 ? Colors.white : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                        boxShadow: _allergiesTab == 0
                            ? [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.05),
                                  blurRadius: 4,
                                  offset: const Offset(0, 2),
                                )
                              ]
                            : null,
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        'Allergies (${_selectedAllergyIds.length})',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: _allergiesTab == 0 ? primaryColor : Colors.grey[600],
                        ),
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _allergiesTab = 1),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: _allergiesTab == 1 ? Colors.white : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                        boxShadow: _allergiesTab == 1
                            ? [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.05),
                                  blurRadius: 4,
                                  offset: const Offset(0, 2),
                                )
                              ]
                            : null,
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        'Disliked (${_selectedDislikeIds.length})',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: _allergiesTab == 1 ? primaryColor : Colors.grey[600],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Container(
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
            child: TextField(
              controller: searchCtrl,
              decoration: InputDecoration(
                hintText: _allergiesTab == 0 ? 'Search allergic ingredients...' : 'Search disliked ingredients...',
                prefixIcon: const Icon(Icons.search, color: Colors.grey),
                suffixIcon: query.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, color: Colors.grey),
                        onPressed: () {
                          searchCtrl.clear();
                        },
                      )
                    : null,
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (selectedSet.isNotEmpty) ...[
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: selectedSet.map((id) {
                final ing = _dbIngredients.firstWhere((i) => i['_id'] == id, orElse: () => null);
                final name = ing != null ? ing['name'] ?? '' : '';
                return Chip(
                  label: Text(name),
                  deleteIcon: const Icon(Icons.close, size: 16),
                  backgroundColor: _allergiesTab == 0 ? Colors.redAccent.withValues(alpha: 0.1) : primaryColor.withValues(alpha: 0.1),
                  labelStyle: TextStyle(
                    color: _allergiesTab == 0 ? Colors.redAccent : primaryColor,
                    fontWeight: FontWeight.bold,
                  ),
                  onDeleted: () {
                    setState(() {
                      selectedSet.remove(id);
                    });
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
          ],
          Expanded(
            child: _isLoadingMetadata
                ? const Center(child: CircularProgressIndicator())
                : (filteredIngredients.isEmpty
                    ? Center(
                        child: Text(
                          'No ingredients found',
                          style: TextStyle(color: Colors.grey[500]),
                        ),
                      )
                    : ListView.builder(
                        itemCount: filteredIngredients.length,
                        itemBuilder: (context, index) {
                          final ing = filteredIngredients[index];
                          final id = ing['_id'] ?? '';
                          final name = ing['name'] ?? '';
                          final imgUrl = ing['image_url'] ?? '';
                          final isAdded = selectedSet.contains(id);
                          final isOtherSelected = _allergiesTab == 0
                              ? _selectedDislikeIds.contains(id)
                              : _selectedAllergyIds.contains(id);

                          return ListTile(
                            contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                            leading: Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: Colors.grey[100],
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: imgUrl.isNotEmpty
                                  ? ClipRRect(
                                      borderRadius: BorderRadius.circular(8),
                                      child: Image.network(
                                        imgUrl,
                                        fit: BoxFit.cover,
                                        errorBuilder: (context, error, stackTrace) =>
                                            const Icon(Icons.restaurant_menu, color: Colors.grey),
                                      ),
                                    )
                                  : const Icon(Icons.restaurant_menu, color: Colors.grey),
                            ),
                            title: Text(
                              name,
                              style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF2D2D2D)),
                            ),
                            trailing: isAdded
                                ? Icon(Icons.check_circle, color: _allergiesTab == 0 ? Colors.redAccent : primaryColor)
                                : IconButton(
                                    icon: const Icon(Icons.add_circle_outline),
                                    onPressed: isOtherSelected
                                        ? () {
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              SnackBar(
                                                content: Text(
                                                  _allergiesTab == 0
                                                      ? 'Cannot add. Ingredient is already in dislikes.'
                                                      : 'Cannot add. Ingredient is already in allergies.',
                                                ),
                                                backgroundColor: Colors.orangeAccent,
                                              ),
                                            );
                                          }
                                        : () {
                                            setState(() {
                                              selectedSet.add(id);
                                            });
                                          },
                                  ),
                          );
                        },
                      )),
          ),
          const SizedBox(height: 16),
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

  Widget _buildStepCooking(Color primaryColor) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Cooking Preferences',
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF2D2D2D)),
          ),
          const SizedBox(height: 8),
          Text(
            'Tell us about your cooking skills and available preparation time.',
            style: TextStyle(fontSize: 15, color: Colors.grey[700]),
          ),
          const SizedBox(height: 24),
          Expanded(
            child: ListView(
              children: [
                const Text(
                  'Cooking Skill Level',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF2D2D2D)),
                ),
                const SizedBox(height: 12),
                _buildSkillCard('beginner', 'Beginner', 'Simple meals, basic preparation, minimal ingredients.', primaryColor),
                const SizedBox(height: 12),
                _buildSkillCard('intermediate', 'Intermediate', 'Standard home-cooked meals, moderate complexity.', primaryColor),
                const SizedBox(height: 12),
                _buildSkillCard('expert', 'Expert / Advanced', 'Complex recipes, custom techniques, advanced prep.', primaryColor),
                const SizedBox(height: 28),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Available Cooking Time',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF2D2D2D)),
                    ),
                    Text(
                      '$_cookingTime mins',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: primaryColor),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Maximum time you can dedicate to preparing a single meal.',
                  style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                ),
                const SizedBox(height: 12),
                SliderTheme(
                  data: SliderTheme.of(context).copyWith(
                    activeTrackColor: primaryColor,
                    inactiveTrackColor: Colors.black12,
                    trackHeight: 6.0,
                    thumbColor: primaryColor,
                    thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 12.0),
                    overlayColor: primaryColor.withValues(alpha: 0.12),
                    overlayShape: const RoundSliderOverlayShape(overlayRadius: 24.0),
                  ),
                  child: Slider(
                    value: _cookingTime.toDouble(),
                    min: 10,
                    max: 120,
                    divisions: 22,
                    onChanged: (val) {
                      setState(() {
                        _cookingTime = val.round();
                      });
                    },
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('10m', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      Text('45m', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      Text('90m', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      Text('120m', style: TextStyle(fontSize: 12, color: Colors.grey)),
                    ],
                  ),
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

  Widget _buildSkillCard(String value, String title, String desc, Color primaryColor) {
    final isSelected = _cookingSkill == value;
    return GestureDetector(
      onTap: () {
        setState(() {
          _cookingSkill = value;
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
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                      color: const Color(0xFF2D2D2D),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    desc,
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 16),
            if (isSelected)
              Icon(Icons.check_circle, color: primaryColor, size: 24)
            else
              const Icon(Icons.circle_outlined, color: Colors.black12, size: 24),
          ],
        ),
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
                _buildSummaryInfoRow('Full Name', _fullNameCtrl.text.trim()),
                _buildSummaryInfoRow('Gender', _gender.toUpperCase()),
                _buildSummaryInfoRow('Age', '$_age years'),
                _buildSummaryInfoRow('Height', '$_height cm'),
                _buildSummaryInfoRow('Weight', '$weightVal kg'),
                _buildSummaryInfoRow('Goal', _healthGoal.toUpperCase()),
                _buildSummaryInfoRow('Activity', _activity.toUpperCase()),
                _buildSummaryInfoRow('Cooking Skill', _cookingSkill.toUpperCase()),
                _buildSummaryInfoRow('Cooking Time Limit', '$_cookingTime mins'),
                _buildSummaryInfoRow(
                  'Diets',
                  _selectedDiets.isEmpty ? 'None' : _selectedDiets.join(', '),
                ),
                _buildSummaryInfoRow(
                  'Medical Condition',
                  _selectedMedicalConditionId == null
                      ? 'None'
                      : (_dbMedicalConditions.firstWhere(
                          (c) => c['_id'] == _selectedMedicalConditionId,
                          orElse: () => {'name': 'None'})['name'] ?? 'None'),
                ),
                _buildSummaryInfoRow(
                  'Allergies',
                  _selectedAllergyIds.isEmpty
                      ? 'None'
                      : _dbIngredients
                          .where((i) => _selectedAllergyIds.contains(i['_id']))
                          .map((i) => i['name'])
                          .join(', '),
                ),
                _buildSummaryInfoRow(
                  'Disliked Ingredients',
                  _selectedDislikeIds.isEmpty
                      ? 'None'
                      : _dbIngredients
                          .where((i) => _selectedDislikeIds.contains(i['_id']))
                          .map((i) => i['name'])
                          .join(', '),
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
