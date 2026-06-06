import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../domain/entities/user.dart';
import '../providers/auth_provider.dart';
import '../providers/shopping_list_provider.dart';
import '../widgets/coming_soon_tab.dart';
import 'dashboard_home_tab.dart';
import 'recipe_likes_tab.dart';
import 'recipe_list_view.dart';
import 'recipe_my_reviews_tab.dart';
import 'shopping_list_tab.dart';

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
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Sign out')),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      await context.read<AuthProvider>().logout();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_navTitle(_selectedIndex)),
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
            // ── 0: Home dashboard ──────────────────────────────────────
            DashboardHomeTab(
              user: widget.user,
              onExploreRecipes: () => _selectTab(1),
            ),

            // ── 1: Recipes (with sub-tabs: Browse | Liked | Reviews) ──
            const _RecipeNavTab(),

            // ── 2: Meal Plans ──────────────────────────────────────────
            const ComingSoonTab(
              icon: Icons.event_note_outlined,
              title: 'Meal Plans',
              description:
                  'AI-powered meal planning and nutrition workflows are coming soon.',
            ),

            // ── 3: Profile ─────────────────────────────────────────────
            const ComingSoonTab(
              icon: Icons.person_outline,
              title: 'Profile',
              description:
                  'Manage your profile, preferences, and favorite recipes.',
            ),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: _selectTab,
        destinations: const [
          NavigationDestination(
              icon: Icon(Icons.dashboard_outlined),
              selectedIcon: Icon(Icons.dashboard),
              label: 'Home'),
          NavigationDestination(
              icon: Icon(Icons.menu_book_outlined),
              selectedIcon: Icon(Icons.menu_book),
              label: 'Recipes'),
          NavigationDestination(
              icon: Icon(Icons.event_note_outlined),
              selectedIcon: Icon(Icons.event_note),
              label: 'Plans'),
          NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person),
              label: 'Profile'),
        ],
      ),
    );
  }

  String _navTitle(int index) {
    switch (index) {
      case 1:
        return 'Recipes';
      case 2:
        return 'Meal Plans';
      case 3:
        return 'Profile';
      default:
        return 'Home';
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// Recipe navtab — contains 3 sub-tabs: Browse | Liked | Reviews
// ════════════════════════════════════════════════════════════════════════════════

class _RecipeNavTab extends StatefulWidget {
  const _RecipeNavTab();

  @override
  State<_RecipeNavTab> createState() => _RecipeNavTabState();
}

class _RecipeNavTabState extends State<_RecipeNavTab>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    // Pre-load shopping list when the Recipe navtab is first opened
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final shoppingProvider =
          context.read<ShoppingListProvider>();
      if (shoppingProvider.viewState == ShoppingListViewState.initial) {
        shoppingProvider.loadList();
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Sub-tab bar
        TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.menu_book_outlined),       text: 'Browse'),
            Tab(icon: Icon(Icons.favorite_outline),          text: 'Liked'),
            Tab(icon: Icon(Icons.rate_review),               text: 'Reviews'),
            Tab(icon: Icon(Icons.shopping_cart_outlined),    text: 'Shopping'),
          ],
        ),
        // Sub-tab content
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: const [
              RecipeListView(showHeader: false),
              RecipeLikesTab(),
              RecipeMyReviewsTab(),
              ShoppingListTab(),
            ],
          ),
        ),
      ],
    );
  }
}
