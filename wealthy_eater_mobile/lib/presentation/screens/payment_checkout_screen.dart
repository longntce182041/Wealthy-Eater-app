import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../providers/consultation_provider.dart';

/// Screen that opens the PayOS checkout URL in an embedded WebView.
///
/// It intercepts the navigation requests to detect when PayOS redirects
/// back to our Return URL or Cancel URL, and automatically closes the screen.
class PaymentCheckoutScreen extends StatefulWidget {
  final String checkoutUrl;

  const PaymentCheckoutScreen({
    super.key,
    required this.checkoutUrl,
  });

  @override
  State<PaymentCheckoutScreen> createState() => _PaymentCheckoutScreenState();
}

class _PaymentCheckoutScreenState extends State<PaymentCheckoutScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _initWebView();
  }

  void _initWebView() {
    // Get the intercept URLs that were loaded into the provider
    final urls = context.read<ConsultationProvider>().payOSUrls;
    final returnUrl = urls?.returnUrl ?? '';
    final cancelUrl = urls?.cancelUrl ?? '';

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (String url) {
            setState(() {
              _isLoading = true;
            });
          },
          onPageFinished: (String url) {
            setState(() {
              _isLoading = false;
            });
          },
          onNavigationRequest: (NavigationRequest request) {
            final url = request.url;
            debugPrint('WebView Navigation to: $url');

            // Intercept Return URL
            if (returnUrl.isNotEmpty && url.startsWith(returnUrl)) {
              debugPrint('Intercepted Return URL. Payment Success!');
              context.read<ConsultationProvider>().resetCheckout();
              Navigator.pop(context, true); // true = success
              return NavigationDecision.prevent;
            }

            // Intercept Cancel URL
            if (cancelUrl.isNotEmpty && url.startsWith(cancelUrl)) {
              debugPrint('Intercepted Cancel URL. Payment Cancelled.');
              context.read<ConsultationProvider>().resetCheckout();
              Navigator.pop(context, false); // false = cancelled
              return NavigationDecision.prevent;
            }

            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.checkoutUrl));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('PayOS Checkout'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () {
            context.read<ConsultationProvider>().resetCheckout();
            Navigator.pop(context, false);
          },
        ),
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_isLoading)
            const Center(
              child: CircularProgressIndicator(),
            ),
        ],
      ),
    );
  }
}
