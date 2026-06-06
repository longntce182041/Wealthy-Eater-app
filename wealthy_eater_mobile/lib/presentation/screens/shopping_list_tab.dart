import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../domain/entities/shopping_list.dart';
import '../providers/shopping_list_provider.dart';

/// Smart Grocery / Shopping List tab.
///
/// UI structure:
///  ┌──────────────────────────────────────────────┐
///  │  Progress Header  (X/Y · progress bar)       │
///  ├──────────────────────────────────────────────┤
///  │  [Category Section]                          │
///  │    ▸ Checklist items (Dismissible)           │
///  │  [Category Section]                          │
///  │    ▸ ...                                     │
///  ├──────────────────────────────────────────────┤
///  │  Purchased section (collapsible)             │
///  └──────────────────────────────────────────────┘
///  FAB: Clear purchased
class ShoppingListTab extends StatefulWidget {
  const ShoppingListTab({super.key});

  @override
  State<ShoppingListTab> createState() => _ShoppingListTabState();
}

class _ShoppingListTabState extends State<ShoppingListTab>
    with AutomaticKeepAliveClientMixin {
  bool _showPurchased = false;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = context.read<ShoppingListProvider>();
      if (provider.viewState == ShoppingListViewState.initial) {
        provider.loadList();
      }
    });
  }

  Future<void> _confirmClearPurchased() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Clear purchased items?'),
        content: const Text(
            'All items you have ticked off will be permanently removed from your list.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          FilledButton(
              style: FilledButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.error),
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Clear')),
        ],
      ),
    );
    if (ok == true && mounted) {
      await context.read<ShoppingListProvider>().clearPurchased();
    }
  }

  Future<void> _confirmClearAll() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Clear entire list?'),
        content: const Text('This will remove ALL items, including un-purchased ones.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          FilledButton(
              style: FilledButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.error),
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Clear All')),
        ],
      ),
    );
    if (ok == true && mounted) {
      await context.read<ShoppingListProvider>().clearAll();
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return Consumer<ShoppingListProvider>(
      builder: (context, provider, _) {
        final colorScheme = Theme.of(context).colorScheme;

        // ── Loading ──────────────────────────────────────────────────────────
        if (provider.viewState == ShoppingListViewState.loading) {
          return const Center(child: CircularProgressIndicator());
        }

        // ── Error ────────────────────────────────────────────────────────────
        if (provider.viewState == ShoppingListViewState.error) {
          return _ErrorView(
            message: provider.errorMessage ?? 'Failed to load shopping list',
            onRetry: provider.loadList,
          );
        }

        // ── Empty State ───────────────────────────────────────────────────────
        if (provider.items.isEmpty) {
          return _EmptyState(onRefresh: provider.refresh);
        }

        final stats        = provider.stats;
        final pending      = provider.pendingItems;
        final purchased    = provider.purchasedItems;
        final groupedPending = <String, List<ShoppingListItemEntity>>{};
        for (final item in pending) {
          groupedPending.putIfAbsent(item.category, () => []).add(item);
        }

        return Scaffold(
          backgroundColor: colorScheme.surface,
          body: RefreshIndicator(
            onRefresh: provider.refresh,
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                // ── Error banner (non-fatal) ─────────────────────────────────
                if (provider.errorMessage != null)
                  SliverToBoxAdapter(
                    child: _ErrorBanner(
                      message: provider.errorMessage!,
                      onDismiss: provider.clearError,
                    ),
                  ),

                // ── Progress Header ──────────────────────────────────────────
                SliverToBoxAdapter(
                  child: _ProgressHeader(stats: stats),
                ),

                // ── Pending Items (grouped by category) ───────────────────────
                if (pending.isEmpty)
                  SliverToBoxAdapter(
                    child: _AllDoneBanner(
                      onClear: purchased.isNotEmpty ? _confirmClearPurchased : null,
                    ),
                  )
                else
                  for (final category in groupedPending.keys) ...[
                    SliverToBoxAdapter(
                      child: _CategoryHeader(category: category),
                    ),
                    SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (ctx, i) {
                          final item = groupedPending[category]![i];
                          return _GroceryItemTile(
                            key: ValueKey(item.id),
                            item: item,
                            onToggle: () =>
                                provider.togglePurchased(item.id),
                            onDelete: () => provider.removeItem(item.id),
                          );
                        },
                        childCount: groupedPending[category]!.length,
                      ),
                    ),
                  ],

                // ── Purchased Section (collapsible) ──────────────────────────
                if (purchased.isNotEmpty) ...[
                  SliverToBoxAdapter(
                    child: _PurchasedHeader(
                      count: purchased.length,
                      expanded: _showPurchased,
                      onToggle: () =>
                          setState(() => _showPurchased = !_showPurchased),
                      onClear: _confirmClearPurchased,
                    ),
                  ),
                  if (_showPurchased)
                    SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (ctx, i) {
                          final item = purchased[i];
                          return _GroceryItemTile(
                            key: ValueKey('${item.id}_purchased'),
                            item: item,
                            onToggle: () =>
                                provider.togglePurchased(item.id),
                            onDelete: () => provider.removeItem(item.id),
                          );
                        },
                        childCount: purchased.length,
                      ),
                    ),
                ],

                // Spacer for FAB
                const SliverToBoxAdapter(child: SizedBox(height: 96)),
              ],
            ),
          ),
          floatingActionButton: _ListActions(
            hasPurchased: purchased.isNotEmpty,
            hasItems: provider.items.isNotEmpty,
            onClearPurchased: _confirmClearPurchased,
            onClearAll: _confirmClearAll,
          ),
        );
      },
    );
  }
}

// ─── Progress Header ──────────────────────────────────────────────────────────

class _ProgressHeader extends StatelessWidget {
  final ShoppingListStatsEntity stats;
  const _ProgressHeader({required this.stats});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final pct   = stats.completionFraction;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            theme.colorScheme.primaryContainer,
            theme.colorScheme.secondaryContainer,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: theme.colorScheme.primary.withValues(alpha: 0.15),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.shopping_cart_outlined, size: 20),
              const SizedBox(width: 8),
              Text(
                'Grocery List',
                style: theme.textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: theme.colorScheme.onPrimaryContainer.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  stats.isComplete
                      ? '🎉 All done!'
                      : '${stats.purchased} / ${stats.total}',
                  style: theme.textTheme.labelMedium
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: pct),
              duration: const Duration(milliseconds: 600),
              curve: Curves.easeOutCubic,
              builder: (_, value, __) => LinearProgressIndicator(
                value: value,
                minHeight: 10,
                backgroundColor:
                    theme.colorScheme.onPrimaryContainer.withValues(alpha: 0.15),
                valueColor: AlwaysStoppedAnimation<Color>(
                  stats.isComplete
                      ? Colors.green.shade500
                      : theme.colorScheme.primary,
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _StatPill(
                icon: Icons.radio_button_unchecked,
                label: '${stats.pending} to buy',
                color: theme.colorScheme.primary,
              ),
              const SizedBox(width: 8),
              _StatPill(
                icon: Icons.check_circle_outline,
                label: '${stats.purchased} purchased',
                color: Colors.green.shade600,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatPill extends StatelessWidget {
  final IconData icon;
  final String   label;
  final Color    color;
  const _StatPill({required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 4),
        Text(label,
            style: Theme.of(context)
                .textTheme
                .labelSmall
                ?.copyWith(color: color, fontWeight: FontWeight.w600)),
      ],
    );
  }
}

// ─── Category Header ──────────────────────────────────────────────────────────

class _CategoryHeader extends StatelessWidget {
  final String category;
  const _CategoryHeader({required this.category});

  static const _icons = <String, IconData>{
    'Protein':   Icons.egg_outlined,
    'Vegetable': Icons.eco_outlined,
    'Fruit':     Icons.apple,
    'Dairy':     Icons.water_drop_outlined,
    'Grain':     Icons.grain,
    'Pantry':    Icons.kitchen_outlined,
    'Other':     Icons.shopping_bag_outlined,
  };

  static const _colors = <String, Color>{
    'Protein':   Color(0xFFE57373),
    'Vegetable': Color(0xFF66BB6A),
    'Fruit':     Color(0xFFFF7043),
    'Dairy':     Color(0xFF42A5F5),
    'Grain':     Color(0xFFFFCA28),
    'Pantry':    Color(0xFFAB47BC),
    'Other':     Color(0xFF78909C),
  };

  @override
  Widget build(BuildContext context) {
    final color = _colors[category] ?? const Color(0xFF78909C);
    final icon  = _icons[category]  ?? Icons.shopping_bag_outlined;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
      child: Row(
        children: [
          Container(
            width: 32, height: 32,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 16),
          ),
          const SizedBox(width: 10),
          Text(
            category,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: color,
                ),
          ),
        ],
      ),
    );
  }
}

// ─── Grocery Item Tile ────────────────────────────────────────────────────────

class _GroceryItemTile extends StatelessWidget {
  final ShoppingListItemEntity item;
  final VoidCallback onToggle;
  final VoidCallback onDelete;

  const _GroceryItemTile({
    super.key,
    required this.item,
    required this.onToggle,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final theme      = Theme.of(context);
    final isPurchased = item.isPurchased;

    return Dismissible(
      key: ValueKey('dismiss_${item.id}'),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 24),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        decoration: BoxDecoration(
          color: theme.colorScheme.error.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Icon(Icons.delete_outline,
            color: theme.colorScheme.error, size: 24),
      ),
      confirmDismiss: (_) async {
        onDelete();
        return false; // We handle removal ourselves via the provider
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          boxShadow: isPurchased
              ? null
              : [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
        ),
        child: AnimatedTheme(
          data: theme.copyWith(
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
          child: Material(
            color: isPurchased
                ? theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.4)
                : theme.colorScheme.surfaceContainerLowest,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(
                color: isPurchased
                    ? Colors.green.shade200.withValues(alpha: 0.5)
                    : theme.colorScheme.outlineVariant.withValues(alpha: 0.4),
                width: 1,
              ),
            ),
            clipBehavior: Clip.hardEdge,
            child: ListTile(
            contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          leading: GestureDetector(
            onTap: onToggle,
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: isPurchased
                  ? Icon(Icons.check_circle,
                      key: const ValueKey('checked'),
                      color: Colors.green.shade500,
                      size: 28)
                  : Icon(Icons.radio_button_unchecked,
                      key: const ValueKey('unchecked'),
                      color: theme.colorScheme.outline,
                      size: 28),
            ),
          ),
          title: AnimatedDefaultTextStyle(
            duration: const Duration(milliseconds: 200),
            style: (theme.textTheme.bodyMedium ?? const TextStyle()).copyWith(
              fontWeight: FontWeight.w600,
              decoration: isPurchased ? TextDecoration.lineThrough : null,
              color: isPurchased
                  ? theme.colorScheme.onSurface.withValues(alpha: 0.45)
                  : theme.colorScheme.onSurface,
            ),
            child: Text(item.ingredientName),
          ),
          subtitle: Text(
            item.displayQuantity,
            style: theme.textTheme.bodySmall?.copyWith(
              color: isPurchased
                  ? theme.colorScheme.onSurface.withValues(alpha: 0.3)
                  : theme.colorScheme.onSurfaceVariant,
            ),
          ),
          trailing: IconButton(
            icon: const Icon(Icons.close, size: 18),
            color: theme.colorScheme.outline,
            tooltip: 'Remove item',
            onPressed: onDelete,
          ),
          onTap: onToggle,
        ),
          ),
        ),
      ),
    );
  }
}

// ─── Purchased Header ─────────────────────────────────────────────────────────

class _PurchasedHeader extends StatelessWidget {
  final int           count;
  final bool          expanded;
  final VoidCallback  onToggle;
  final VoidCallback? onClear;

  const _PurchasedHeader({
    required this.count,
    required this.expanded,
    required this.onToggle,
    this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
      child: Row(
        children: [
          Icon(Icons.check_circle_outline,
              size: 18, color: Colors.green.shade500),
          const SizedBox(width: 8),
          Text(
            'Purchased ($count)',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: Colors.green.shade600,
                  fontWeight: FontWeight.w700,
                ),
          ),
          const Spacer(),
          if (onClear != null)
            TextButton.icon(
              onPressed: onClear,
              icon: const Icon(Icons.delete_sweep_outlined, size: 16),
              label: const Text('Clear'),
              style: TextButton.styleFrom(
                foregroundColor: Colors.green.shade600,
                visualDensity: VisualDensity.compact,
              ),
            ),
          IconButton(
            icon: AnimatedRotation(
              duration: const Duration(milliseconds: 200),
              turns: expanded ? 0.5 : 0,
              child: const Icon(Icons.expand_more),
            ),
            onPressed: onToggle,
            tooltip: expanded ? 'Collapse' : 'Expand',
          ),
        ],
      ),
    );
  }
}

// ─── All Done Banner ──────────────────────────────────────────────────────────

class _AllDoneBanner extends StatelessWidget {
  final VoidCallback? onClear;
  const _AllDoneBanner({this.onClear});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(24),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.green.shade50, Colors.teal.shade50],
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.green.shade200),
      ),
      child: Column(
        children: [
          const Text('🎉', style: TextStyle(fontSize: 48)),
          const SizedBox(height: 12),
          Text(
            'All items purchased!',
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(fontWeight: FontWeight.w700, color: Colors.green.shade700),
          ),
          const SizedBox(height: 6),
          const Text(
            'Great job! You got everything on your list.',
            textAlign: TextAlign.center,
          ),
          if (onClear != null) ...[
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: onClear,
              icon: const Icon(Icons.delete_sweep_outlined),
              label: const Text('Clear purchased'),
              style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.green.shade700),
            ),
          ],
        ],
      ),
    );
  }
}

// ─── Empty State ──────────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  final VoidCallback onRefresh;
  const _EmptyState({required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 96, height: 96,
              decoration: BoxDecoration(
                color: Theme.of(context)
                    .colorScheme
                    .primary
                    .withValues(alpha: 0.08),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.shopping_cart_outlined,
                size: 48,
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Your list is empty',
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 10),
            Text(
              'Open a recipe and tap "Add to Shopping List"\nto start building your grocery list.',
              textAlign: TextAlign.center,
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 28),
            OutlinedButton.icon(
              onPressed: onRefresh,
              icon: const Icon(Icons.refresh),
              label: const Text('Refresh'),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Error View ───────────────────────────────────────────────────────────────

class _ErrorView extends StatelessWidget {
  final String       message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.cloud_off_outlined,
                size: 64,
                color: Theme.of(context).colorScheme.error.withValues(alpha: 0.7)),
            const SizedBox(height: 20),
            Text(message,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Try again'),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Error Banner (non-fatal, inline) ────────────────────────────────────────

class _ErrorBanner extends StatelessWidget {
  final String       message;
  final VoidCallback onDismiss;
  const _ErrorBanner({required this.message, required this.onDismiss});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(Icons.warning_amber_rounded,
              color: Theme.of(context).colorScheme.onErrorContainer, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onErrorContainer,
                  ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, size: 16),
            color: Theme.of(context).colorScheme.onErrorContainer,
            onPressed: onDismiss,
            visualDensity: VisualDensity.compact,
          ),
        ],
      ),
    );
  }
}

// ─── FAB: List Actions ────────────────────────────────────────────────────────

class _ListActions extends StatelessWidget {
  final bool          hasPurchased;
  final bool          hasItems;
  final VoidCallback  onClearPurchased;
  final VoidCallback  onClearAll;

  const _ListActions({
    required this.hasPurchased,
    required this.hasItems,
    required this.onClearPurchased,
    required this.onClearAll,
  });

  @override
  Widget build(BuildContext context) {
    if (!hasItems) return const SizedBox.shrink();

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        if (hasPurchased)
          FloatingActionButton.extended(
            heroTag: 'fab_clear_purchased',
            onPressed: onClearPurchased,
            icon: const Icon(Icons.delete_sweep_outlined),
            label: const Text('Clear purchased'),
            backgroundColor: Colors.green.shade600,
            foregroundColor: Colors.white,
          ),
        if (hasPurchased) const SizedBox(height: 12),
        FloatingActionButton(
          heroTag: 'fab_clear_all',
          mini: true,
          onPressed: onClearAll,
          backgroundColor:
              Theme.of(context).colorScheme.error.withValues(alpha: 0.9),
          foregroundColor: Colors.white,
          tooltip: 'Clear all items',
          child: const Icon(Icons.delete_forever_outlined),
        ),
      ],
    );
  }
}
