import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../domain/entities/user.dart';
import '../providers/auth_provider.dart';
import '../widgets/coming_soon_tab.dart';
import 'dashboard_home_tab.dart';
import 'recipe_list_view.dart';

class HomeScreen extends StatefulWidget {
  final UserEntity? user;

  const HomeScreen({super.key, this.user});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;

  void _selectTab(int index) => setState(() => _selectedIndex = index);

  Future<void> _logout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Sign out')),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      await context.read<AuthProvider>().logout();
      // Navigation is handled by _AppRoot Consumer in main.dart
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          _selectedIndex == 0 ? 'Home' : _selectedIndex == 1 ? 'Recipes' : _selectedIndex == 2 ? 'Plans' : 'Profile',
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_outlined),
            tooltip: 'Sign out',
            onPressed: _logout,
          ),
        ],
      ),
      body: SafeArea(
        child: IndexedStack(
          index: _selectedIndex,
          children: [
            DashboardHomeTab(
              user: widget.user,
              onExploreRecipes: () => _selectTab(1),
            ),
            const RecipeListView(showHeader: true),
            const ComingSoonTab(
              icon: Icons.event_note_outlined,
              title: 'Meal Plans',
              description: 'AI-powered meal planning and nutrition workflows are coming soon.',
            ),
            const ComingSoonTab(
              icon: Icons.person_outline,
              title: 'Profile',
              description: 'Manage your profile, preferences, and favorite recipes.',
            ),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: _selectTab,
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.menu_book_outlined), selectedIcon: Icon(Icons.menu_book), label: 'Recipes'),
          NavigationDestination(icon: Icon(Icons.event_note_outlined), selectedIcon: Icon(Icons.event_note), label: 'Plans'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}
