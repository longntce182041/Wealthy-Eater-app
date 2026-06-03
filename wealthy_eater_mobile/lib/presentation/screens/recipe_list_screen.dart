import 'package:flutter/material.dart';

import 'recipe_list_view.dart';

class RecipeListScreen extends StatefulWidget {
  const RecipeListScreen({super.key});

  @override
  State<RecipeListScreen> createState() => _RecipeListScreenState();
}

class _RecipeListScreenState extends State<RecipeListScreen> {
  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: RecipeListView(showHeader: true),
    );
  }
}