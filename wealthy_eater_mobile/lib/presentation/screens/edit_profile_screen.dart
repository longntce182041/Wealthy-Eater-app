import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isSaving = false;

  // Form controllers
  final TextEditingController _fullNameCtrl = TextEditingController();
  final TextEditingController _ageCtrl = TextEditingController();
  final TextEditingController _heightCtrl = TextEditingController();
  final TextEditingController _weightCtrl = TextEditingController();
  final TextEditingController _allergySearchCtrl = TextEditingController();
  final TextEditingController _dislikeSearchCtrl = TextEditingController();

  // Choices
  String _gender = 'other';
  String _healthGoal = 'maintain';
  String _activity = 'sedentary';
  final Set<String> _selectedDiets = {};
  String _cookingSkill = 'beginner';
  int _cookingTime = 30;

  String? _selectedMedicalConditionId;
  final Set<String> _selectedAllergyIds = {};
  final Set<String> _selectedDislikeIds = {};
  final Map<String, String> _ingredientNames = {};

  // Database metadata
  List<dynamic> _dbIngredients = [];
  List<dynamic> _dbMedicalConditions = [];
  bool _isLoadingMetadata = true;

  String _allergyQuery = '';
  String _dislikeQuery = '';

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
    _allergySearchCtrl.addListener(() {
      setState(() => _allergyQuery = _allergySearchCtrl.text.trim().toLowerCase());
    });
    _dislikeSearchCtrl.addListener(() {
      setState(() => _dislikeQuery = _dislikeSearchCtrl.text.trim().toLowerCase());
    });
    
    // Pre-populate fields from current profile
    final profile = context.read<AuthProvider>().userProfile ?? {};
    _fullNameCtrl.text = profile['full_name']?.toString() ?? '';
    _ageCtrl.text = profile['age']?.toString() ?? '';
    _heightCtrl.text = profile['height']?.toString() ?? '';
    _weightCtrl.text = profile['weight']?.toString() ?? '';
    
    _gender = profile['gender']?.toString() ?? 'other';
    _healthGoal = profile['health_goal']?.toString() ?? 'maintain';
    
    final dietary = profile['dietary_references'] as Map<String, dynamic>?;
    _activity = dietary?['activity_level']?.toString() ?? 'sedentary';
    
    final List<dynamic> dietPrefs = dietary?['diet_preferences'] ?? [];
    _selectedDiets.addAll(dietPrefs.map((d) => d.toString()));
    
    final List<dynamic> allergies = dietary?['allergies'] ?? [];
    for (var a in allergies) {
      if (a is Map) {
        final id = a['_id']?.toString() ?? '';
        final name = a['name']?.toString() ?? '';
        if (id.isNotEmpty) {
          _selectedAllergyIds.add(id);
          _ingredientNames[id] = name;
        }
      } else {
        _selectedAllergyIds.add(a.toString());
      }
    }
    
    final medicalCondition = profile['medical_condition_id'];
    if (medicalCondition != null) {
      _selectedMedicalConditionId = medicalCondition is Map ? medicalCondition['_id'].toString() : medicalCondition.toString();
    }
    
    final List<dynamic> dislikes = profile['dislike_ingredients'] ?? [];
    for (var d in dislikes) {
      if (d is Map) {
        final id = d['_id']?.toString() ?? '';
        final name = d['name']?.toString() ?? '';
        if (id.isNotEmpty) {
          _selectedDislikeIds.add(id);
          _ingredientNames[id] = name;
        }
      } else {
        _selectedDislikeIds.add(d.toString());
      }
    }
    
    _cookingSkill = profile['cooking_skill_level']?.toString() ?? 'beginner';
    _cookingTime = (profile['available_cooking_time'] as num?)?.toInt() ?? 30;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadMetadata();
    });
  }

  @override
  void dispose() {
    _fullNameCtrl.dispose();
    _ageCtrl.dispose();
    _heightCtrl.dispose();
    _weightCtrl.dispose();
    _allergySearchCtrl.dispose();
    _dislikeSearchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadMetadata() async {
    try {
      final auth = context.read<AuthProvider>();
      final metadata = await auth.fetchSetupMetadata();
      if (metadata != null) {
        setState(() {
          _dbIngredients = metadata['ingredients'] ?? [];
          _dbMedicalConditions = metadata['medicalConditions'] ?? [];
          for (var ing in _dbIngredients) {
            if (ing is Map) {
              final id = ing['_id']?.toString() ?? '';
              final name = ing['name']?.toString() ?? '';
              if (id.isNotEmpty) {
                _ingredientNames[id] = name;
              }
            }
          }
        });
      }
    } catch (e) {
      debugPrint('Error loading metadata: $e');
    } finally {
      setState(() {
        _isLoadingMetadata = false;
      });
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);
    final auth = context.read<AuthProvider>();

    final double ageVal = double.tryParse(_ageCtrl.text) ?? 18;
    final double heightVal = double.tryParse(_heightCtrl.text) ?? 170;
    final double weightVal = double.tryParse(_weightCtrl.text) ?? 70;

    final data = {
      'full_name': _fullNameCtrl.text.trim(),
      'age': ageVal.round(),
      'gender': _gender,
      'height_cm': heightVal,
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
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile updated successfully!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(auth.errorMessage ?? 'Update failed'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Update error: $e'),
          backgroundColor: Colors.redAccent,
        ),
      );
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final primaryColor = Theme.of(context).colorScheme.primary;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit Profile'),
        actions: [
          if (_isSaving)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.0),
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
              ),
            )
          else
            IconButton(
              icon: const Icon(Icons.check),
              onPressed: _save,
              tooltip: 'Save changes',
            )
        ],
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              // ── Section 1: Biographics ──
              _buildSectionTitle('Personal Details'),
              const SizedBox(height: 12),
              
              // Full name text field
              TextFormField(
                controller: _fullNameCtrl,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(
                  labelText: 'Full Name',
                  prefixIcon: Icon(Icons.person_outline),
                  border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return 'Full name is required';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Age, Height, Weight Row
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _ageCtrl,
                      keyboardType: TextInputType.number,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      decoration: const InputDecoration(
                        labelText: 'Age',
                        suffixText: 'yrs',
                        border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
                      ),
                      validator: (val) {
                        final age = int.tryParse(val ?? '');
                        if (age == null || age < 1 || age > 120) {
                          return 'Age 1-120';
                        }
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _heightCtrl,
                      keyboardType: TextInputType.number,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      decoration: const InputDecoration(
                        labelText: 'Height',
                        suffixText: 'cm',
                        border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
                      ),
                      validator: (val) {
                        final height = int.tryParse(val ?? '');
                        if (height == null || height < 50 || height > 250) {
                          return 'Height 50-250';
                        }
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _weightCtrl,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d*'))],
                      decoration: const InputDecoration(
                        labelText: 'Weight',
                        suffixText: 'kg',
                        border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
                      ),
                      validator: (val) {
                        final weight = double.tryParse(val ?? '');
                        if (weight == null || weight < 30 || weight > 300) {
                          return 'Weight 30-300';
                        }
                        return null;
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Gender Selector
              const Text(
                'Gender',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black54),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: ['male', 'female', 'other'].map((g) {
                  final isSel = _gender == g;
                  return ChoiceChip(
                    selected: isSel,
                    label: Text(g[0].toUpperCase() + g.substring(1)),
                    selectedColor: primaryColor.withValues(alpha: 0.15),
                    labelStyle: TextStyle(
                      color: isSel ? primaryColor : Colors.black87,
                      fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                    ),
                    side: BorderSide(color: isSel ? primaryColor : Colors.black12),
                    onSelected: (selected) {
                      if (selected) setState(() => _gender = g);
                    },
                  );
                }).toList(),
              ),
              
              const Divider(height: 36),

              // ── Section 2: Goals & Activity ──
              _buildSectionTitle('Goals & Activity Level'),
              const SizedBox(height: 12),

              // Health Goal Selector
              const Text(
                'Health Goal',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black54),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: [
                  {'id': 'lose', 'name': 'Lose Weight'},
                  {'id': 'maintain', 'name': 'Maintain Weight'},
                  {'id': 'gain', 'name': 'Gain Weight'},
                ].map((item) {
                  final isSel = _healthGoal == item['id'];
                  return ChoiceChip(
                    selected: isSel,
                    label: Text(item['name']!),
                    selectedColor: primaryColor.withValues(alpha: 0.15),
                    labelStyle: TextStyle(
                      color: isSel ? primaryColor : Colors.black87,
                      fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                    ),
                    side: BorderSide(color: isSel ? primaryColor : Colors.black12),
                    onSelected: (selected) {
                      if (selected) setState(() => _healthGoal = item['id']!);
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),

              // Daily Activity Level Selector
              const Text(
                'Activity Level',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black54),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                isExpanded: true,
                initialValue: _activity,
                decoration: const InputDecoration(
                  border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
                  contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
                items: [
                  {'id': 'sedentary', 'name': 'Sedentary (desk job, low activity)'},
                  {'id': 'light', 'name': 'Lightly Active (light workouts 1-3 days/wk)'},
                  {'id': 'moderate', 'name': 'Moderately Active (workouts 3-5 days/wk)'},
                  {'id': 'active', 'name': 'Very Active (heavy sports 6-7 days/wk)'},
                  {'id': 'very_active', 'name': 'Extremely Active (double workouts daily)'},
                ].map((item) {
                  return DropdownMenuItem<String>(
                    value: item['id'],
                    child: Text(item['name']!),
                  );
                }).toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _activity = val);
                },
              ),

              const Divider(height: 36),

              // ── Section 3: Diet Preferences ──
              _buildSectionTitle('Diet Preferences'),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _dietOptions.map((diet) {
                  final isSel = _selectedDiets.contains(diet);
                  return FilterChip(
                    selected: isSel,
                    label: Text(diet),
                    selectedColor: primaryColor.withValues(alpha: 0.15),
                    checkmarkColor: primaryColor,
                    labelStyle: TextStyle(
                      color: isSel ? primaryColor : Colors.black87,
                      fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                    ),
                    side: BorderSide(color: isSel ? primaryColor : Colors.black12),
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

              const Divider(height: 36),

              // ── Section 4: Clinical Settings ──
              _buildSectionTitle('Clinical Profile'),
              const SizedBox(height: 12),
              
              if (_isLoadingMetadata)
                const Center(child: CircularProgressIndicator())
              else ...[
                DropdownButtonFormField<String?>(
                  isExpanded: true,
                  initialValue: _selectedMedicalConditionId,
                  decoration: const InputDecoration(
                    labelText: 'Chronic Medical Condition',
                    border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
                    contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                  items: [
                    const DropdownMenuItem<String?>(
                      value: null,
                      child: Text('No Medical Conditions'),
                    ),
                    ..._dbMedicalConditions.map((cond) {
                      return DropdownMenuItem<String?>(
                        value: cond['_id'].toString(),
                        child: Text(cond['name']?.toString() ?? ''),
                      );
                    }),
                  ],
                  onChanged: (val) {
                    setState(() => _selectedMedicalConditionId = val);
                  },
                ),
              ],

              const Divider(height: 36),

              // ── Section 5: Restrictions ──
              _buildSectionTitle('Food Allergies & Exclusions'),
              const SizedBox(height: 12),

              // Allergies section
              const Text(
                'Allergic Ingredients',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black54),
              ),
              const SizedBox(height: 8),
              if (_selectedAllergyIds.isNotEmpty) ...[
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: _selectedAllergyIds.map((id) {
                    final name = _ingredientNames[id] ?? id;
                    return Chip(
                      label: Text(name),
                      deleteIcon: const Icon(Icons.close, size: 14),
                      backgroundColor: Colors.red[50],
                      labelStyle: const TextStyle(color: Colors.redAccent, fontSize: 12, fontWeight: FontWeight.bold),
                      side: BorderSide.none,
                      onDeleted: () {
                        setState(() => _selectedAllergyIds.remove(id));
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 8),
              ],
              TextFormField(
                controller: _allergySearchCtrl,
                decoration: const InputDecoration(
                  hintText: 'Search to add allergies...',
                  prefixIcon: Icon(Icons.search, size: 20),
                  border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                ),
              ),
              if (_allergyQuery.isNotEmpty) ...[
                const SizedBox(height: 6),
                Container(
                  constraints: const BoxConstraints(maxHeight: 180),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(color: Colors.black12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ListView(
                    shrinkWrap: true,
                    children: _dbIngredients
                        .where((ing) =>
                            (ing['name'] ?? '').toString().toLowerCase().contains(_allergyQuery) &&
                            !_selectedAllergyIds.contains(ing['_id']))
                        .take(5)
                        .map((ing) {
                      return ListTile(
                        title: Text(ing['name'] ?? ''),
                        trailing: const Icon(Icons.add, size: 18),
                        dense: true,
                        onTap: () {
                          setState(() {
                            _selectedAllergyIds.add(ing['_id'].toString());
                            _selectedDislikeIds.remove(ing['_id'].toString()); // cannot be both
                            _allergySearchCtrl.clear();
                          });
                        },
                      );
                    }).toList(),
                  ),
                ),
              ],
              
              const SizedBox(height: 20),

              // Dislikes section
              const Text(
                'Disliked / Excluded Ingredients',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black54),
              ),
              const SizedBox(height: 8),
              if (_selectedDislikeIds.isNotEmpty) ...[
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: _selectedDislikeIds.map((id) {
                    final name = _ingredientNames[id] ?? id;
                    return Chip(
                      label: Text(name),
                      deleteIcon: const Icon(Icons.close, size: 14),
                      backgroundColor: Colors.blueGrey[50],
                      labelStyle: TextStyle(color: Colors.blueGrey[800], fontSize: 12, fontWeight: FontWeight.bold),
                      side: BorderSide.none,
                      onDeleted: () {
                        setState(() => _selectedDislikeIds.remove(id));
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 8),
              ],
              TextFormField(
                controller: _dislikeSearchCtrl,
                decoration: const InputDecoration(
                  hintText: 'Search to exclude ingredients...',
                  prefixIcon: Icon(Icons.search, size: 20),
                  border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                ),
              ),
              if (_dislikeQuery.isNotEmpty) ...[
                const SizedBox(height: 6),
                Container(
                  constraints: const BoxConstraints(maxHeight: 180),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(color: Colors.black12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ListView(
                    shrinkWrap: true,
                    children: _dbIngredients
                        .where((ing) =>
                            (ing['name'] ?? '').toString().toLowerCase().contains(_dislikeQuery) &&
                            !_selectedDislikeIds.contains(ing['_id']))
                        .take(5)
                        .map((ing) {
                      return ListTile(
                        title: Text(ing['name'] ?? ''),
                        trailing: const Icon(Icons.add, size: 18),
                        dense: true,
                        onTap: () {
                          setState(() {
                            _selectedDislikeIds.add(ing['_id'].toString());
                            _selectedAllergyIds.remove(ing['_id'].toString()); // cannot be both
                            _dislikeSearchCtrl.clear();
                          });
                        },
                      );
                    }).toList(),
                  ),
                ),
              ],

              const Divider(height: 36),

              // ── Section 6: Cooking ──
              _buildSectionTitle('Cooking Settings'),
              const SizedBox(height: 12),

              // Cooking skill selector
              const Text(
                'Cooking Skill Level',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black54),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: ['beginner', 'intermediate', 'expert'].map((skill) {
                  final isSel = _cookingSkill == skill;
                  return ChoiceChip(
                    selected: isSel,
                    label: Text(skill[0].toUpperCase() + skill.substring(1)),
                    selectedColor: primaryColor.withValues(alpha: 0.15),
                    labelStyle: TextStyle(
                      color: isSel ? primaryColor : Colors.black87,
                      fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                    ),
                    side: BorderSide(color: isSel ? primaryColor : Colors.black12),
                    onSelected: (selected) {
                      if (selected) setState(() => _cookingSkill = skill);
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),

              // Cooking time limit slider
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Expanded(
                    child: Text(
                      'Available Preparation Time',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black54),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '$_cookingTime mins',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: primaryColor),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Slider(
                value: _cookingTime.toDouble(),
                min: 10,
                max: 120,
                divisions: 22,
                label: '$_cookingTime min',
                onChanged: (val) {
                  setState(() => _cookingTime = val.round());
                },
              ),

              const SizedBox(height: 32),

              // Save button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isSaving ? null : _save,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: _isSaving
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                        )
                      : const Text(
                          'Save Changes',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87),
    );
  }
}
