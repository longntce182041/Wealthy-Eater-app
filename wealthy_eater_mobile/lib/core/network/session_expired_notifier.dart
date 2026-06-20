import 'dart:async';

/// A singleton event bus that broadcasts a session-expired signal
/// when the refresh token is invalid or missing.
///
/// Usage (broadcast):
///   SessionExpiredNotifier.instance.notifyExpired();
///
/// Usage (listen in _AppRoot):
///   SessionExpiredNotifier.instance.stream.listen((_) { ... });
class SessionExpiredNotifier {
  SessionExpiredNotifier._();
  static final SessionExpiredNotifier instance = SessionExpiredNotifier._();

  final StreamController<void> _controller =
      StreamController<void>.broadcast();

  /// Stream that emits once whenever a hard session expiry is detected.
  Stream<void> get stream => _controller.stream;

  /// Called by [_AuthInterceptor] when the refresh token has expired
  /// or is missing, making the user session unrecoverable.
  void notifyExpired() {
    if (!_controller.isClosed) {
      _controller.add(null);
    }
  }

  void dispose() {
    _controller.close();
  }
}
