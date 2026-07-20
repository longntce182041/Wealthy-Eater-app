import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../domain/entities/user.dart';
import '../providers/auth_provider.dart';
import '../providers/chat_provider.dart';
import '../providers/notification_provider.dart';
import '../providers/nutritionist_provider.dart';
import 'chat_screen.dart';
import 'notification_history_screen.dart';
import 'client_audit_screen.dart'; // Đã bổ sung import màn hình đối chiếu của ní
import 'client_biometrics_screen.dart'; // UC-50: Biometrics history
import 'generate_meal_plan_screen.dart';
import 'nutritionist_profile_tab.dart';
import 'nutritionist_meal_plans_tab.dart';

class NutritionistDashboardScreen extends StatefulWidget {
  final UserEntity? user;

  const NutritionistDashboardScreen({super.key, this.user});

  @override
  State<NutritionistDashboardScreen> createState() => _NutritionistDashboardScreenState();
}

class _NutritionistDashboardScreenState extends State<NutritionistDashboardScreen> {
  int _selectedIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotificationProvider>().fetchSettings();
      context.read<NotificationProvider>().fetchHistory();
    });
  }

  void _selectTab(int index) => setState(() => _selectedIndex = index);

  Future<void> _logout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
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

  String _navTitle(int index) {
    switch (index) {
      case 0:
        return 'Requests';
      case 1:
        return 'Clients';
      case 2:
        return 'Plans';
      case 3:
        return 'My Profile';
      default:
        return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_navTitle(_selectedIndex)),
        actions: [
          Consumer<NotificationProvider>(
            builder: (context, notif, _) {
              return Stack(
                children: [
                  IconButton(
                    icon: const Icon(Icons.notifications_none),
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const NotificationHistoryScreen(),
                        ),
                      );
                    },
                  ),
                  if (notif.unreadCount > 0)
                    Positioned(
                      right: 12,
                      top: 12,
                      child: Container(
                        padding: const EdgeInsets.all(2),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.error,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        constraints: const BoxConstraints(
                          minWidth: 16,
                          minHeight: 16,
                        ),
                        child: Text(
                          '${notif.unreadCount}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Logout',
            onPressed: _logout,
          ),
        ],
      ),
      body: IndexedStack(
        index: _selectedIndex,
        children: [
          const _NutritionistRequestsTab(),
          const _NutritionistClientsTab(),
          const NutritionistMealPlansTab(),
          const NutritionistProfileTab(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: _selectTab,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment),
            label: 'Requests',
          ),
          NavigationDestination(
            icon: Icon(Icons.people_alt_outlined),
            selectedIcon: Icon(Icons.people),
            label: 'Clients',
          ),
          NavigationDestination(
            icon: Icon(Icons.restaurant_menu_outlined),
            selectedIcon: Icon(Icons.restaurant_menu),
            label: 'Plans',
          ),
          NavigationDestination(
            icon: Icon(Icons.manage_accounts_outlined),
            selectedIcon: Icon(Icons.manage_accounts),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

// ── Nutritionist Clients Tab ──────────────────────────────────────────────────

class _NutritionistClientsTab extends StatefulWidget {
  const _NutritionistClientsTab();

  @override
  State<_NutritionistClientsTab> createState() =>
      _NutritionistClientsTabState();
}

class _NutritionistClientsTabState extends State<_NutritionistClientsTab> {
  bool _loading = false;
  List<Map<String, dynamic>> _contracts = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final contracts =
          await context.read<ChatProvider>().fetchActiveContracts();
      if (mounted) setState(() => _contracts = contracts);
    } catch (e) {
      if (mounted) {
        setState(
            () => _error = e.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(
          child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 12),
              Text(_error!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 14)),
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: _load,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }
    if (_contracts.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.people_outline, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text('No active clients yet.',
                style: TextStyle(fontSize: 16, color: Colors.grey)),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _contracts.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final contract = _contracts[index];
          final contractId = contract['_id']?.toString() ?? '';
          final userMap = contract['user_id'] is Map
              ? contract['user_id'] as Map<String, dynamic>
              : null;
          final email = userMap?['email']?.toString() ?? 'Client';
          final initial = email.isNotEmpty ? email[0].toUpperCase() : '?';
          final unread =
              (contract['unread_count'] as num?)?.toInt() ?? 0;

          return InkWell(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => ChatScreen(
                    contractId: contractId,
                    peerName: email,
                    peerInitials: initial,
                  ),
                ),
              );
            },
            borderRadius: BorderRadius.circular(14),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.grey.shade200),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Stack(
                    children: [
                      CircleAvatar(
                        radius: 24,
                        backgroundColor:
                            Theme.of(context).colorScheme.primaryContainer,
                        child: Text(
                          initial,
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context)
                                .colorScheme
                                .onPrimaryContainer,
                          ),
                        ),
                      ),
                      if (unread > 0)
                        Positioned(
                          right: 0,
                          top: 0,
                          child: Container(
                            padding: const EdgeInsets.all(2),
                            decoration: const BoxDecoration(
                              color: Colors.red,
                              shape: BoxShape.circle,
                            ),
                            constraints: const BoxConstraints(
                                minWidth: 16, minHeight: 16),
                            child: Text(
                              unread > 9 ? '9+' : '$unread',
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(email,
                            style: const TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 15),
                            overflow: TextOverflow.ellipsis),
                        if (unread > 0)
                          Text(
                            '$unread unread message${unread > 1 ? 's' : ''}',
                            style: const TextStyle(
                                 fontSize: 12, color: Colors.red),
                          ),
                      ],
                    ),
                  ),
                  
                  // 📊 ĐÂY LÀ PHẦN TÍNH NĂNG CỦA NÍ (UC-54)
                  IconButton(
                    icon: Icon(Icons.analytics_outlined, color: Theme.of(context).colorScheme.primary, size: 24),
                    tooltip: 'Đối chiếu dinh dưỡng',
                    onPressed: () {
                      // Lấy ra chính xác ID của khách hàng để truyền cho API Backend đối chiếu
                      final actualClientId = userMap?['_id']?.toString() ?? '';
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ClientAuditScreen(clientId: actualClientId),
                        ),
                      );
                    },
                  ),
                  IconButton(
                    icon: Icon(Icons.monitor_weight_outlined, color: Colors.blueGrey.shade600, size: 24),
                    tooltip: 'Review Body Metrics',
                    onPressed: () {
                      final actualClientId = userMap?['_id']?.toString() ?? '';
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ClientBiometricsScreen(
                            clientId: actualClientId,
                            clientName: email,
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(width: 4),
                  const Icon(Icons.chat_bubble_outline,
                      color: Colors.grey, size: 20),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

// ── Nutritionist Requests Tab ──────────────────────────────────────────────────

class _NutritionistRequestsTab extends StatefulWidget {
  const _NutritionistRequestsTab();

  @override
  State<_NutritionistRequestsTab> createState() => _NutritionistRequestsTabState();
}

class _NutritionistRequestsTabState extends State<_NutritionistRequestsTab> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NutritionistProvider>().loadMealPlanRequests();
    });
  }

  String _formatDate(String? isoString) {
    if (isoString == null) return '';
    final date = DateTime.tryParse(isoString)?.toLocal();
    if (date == null) return isoString;
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Consumer<NutritionistProvider>(
      builder: (context, provider, child) {
        if (provider.isLoadingRequests) {
          return const Center(child: CircularProgressIndicator());
        }

        if (provider.requestsError != null) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 12),
                  Text(provider.requestsError!, textAlign: TextAlign.center),
                  const SizedBox(height: 20),
                  FilledButton.icon(
                    onPressed: () => provider.loadMealPlanRequests(),
                    icon: const Icon(Icons.refresh),
                    label: const Text('Retry'),
                  ),
                ],
              ),
            ),
          );
        }

        final requests = provider.mealPlanRequests;

        if (requests.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.restaurant_menu_outlined, size: 64, color: Colors.grey),
                SizedBox(height: 16),
                Text(
                  'No pending meal plan requests.',
                  style: TextStyle(fontSize: 16, color: Colors.grey),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () => provider.loadMealPlanRequests(),
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: requests.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final req = requests[index];
              final client = req['user_id'] as Map<String, dynamic>?;
              final email = client?['email']?.toString() ?? 'Client';
              final initial = email.isNotEmpty ? email[0].toUpperCase() : '?';
              final dateStr = _formatDate(req['created_at']?.toString());

              return Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade200),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.02),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 20,
                          backgroundColor: theme.colorScheme.primaryContainer,
                          child: Text(
                            initial,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: theme.colorScheme.onPrimaryContainer,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                email,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                              if (dateStr.isNotEmpty) ...[
                                const SizedBox(height: 2),
                                Text(
                                  'Requested: $dateStr',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: Colors.grey,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.orange.shade50,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.orange.shade200),
                          ),
                          child: Text(
                            req['status']?.toString() ?? 'PENDING',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: Colors.orange.shade800,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 24),
                    const Text(
                      'Request message:',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      '"I want the nutritionist to set up a new meal plan for my next week."',
                      style: TextStyle(
                        fontSize: 13,
                        fontStyle: FontStyle.italic,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Wrap(
                      alignment: WrapAlignment.end,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        OutlinedButton(
                          onPressed: () async {
                            final success = await provider.respondToRequest(
                              req['_id']?.toString() ?? '',
                              'REJECTED',
                            );
                            if (!context.mounted) return;
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(success
                                    ? 'Request rejected.'
                                    : 'Failed to reject request.'),
                                backgroundColor: success ? Colors.orange : Colors.red,
                              ),
                            );
                          },
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.red,
                            side: const BorderSide(color: Colors.red),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          child: const Text('Reject'),
                        ),
                        FilledButton(
                          onPressed: () async {
                            final success = await provider.respondToRequest(
                              req['_id']?.toString() ?? '',
                              'APPROVED',
                            );
                            if (!context.mounted) return;
                            if (success) {
                              // Navigate to GenerateMealPlanScreen after approval
                              final clientMap = req['user_id'] as Map<String, dynamic>?;
                              final clientId = clientMap?['_id']?.toString() ?? '';
                              final clientEmail = clientMap?['email']?.toString() ?? 'Client';
                              if (context.mounted && clientId.isNotEmpty) {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => GenerateMealPlanScreen(
                                      clientId: clientId,
                                      clientName: clientEmail,
                                    ),
                                  ),
                                );
                              }
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Failed to approve request.'),
                                  backgroundColor: Colors.red,
                                ),
                              );
                            }
                          },
                          style: FilledButton.styleFrom(
                            backgroundColor: theme.colorScheme.primary,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          child: const Text('Approve & Plan'),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }
}