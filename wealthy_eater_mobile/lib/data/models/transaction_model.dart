/// Data model for a Transaction/Invoice record from the backend API.
class TransactionModel {
  final String id;
  final String consultationContractId;
  final String userId;
  final String payosOrderCode;
  final String? payosTransactionId;
  final String? payosPaymentLink;
  final String? payosQrCode;
  final int amountGross;
  final int platformFee;
  final int expertPayout;
  final String status; // PENDING, PAID, FAILED, CANCELLED
  final String description;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  // Populated contract data
  final ContractInfo? contract;

  TransactionModel({
    required this.id,
    required this.consultationContractId,
    required this.userId,
    required this.payosOrderCode,
    this.payosTransactionId,
    this.payosPaymentLink,
    this.payosQrCode,
    required this.amountGross,
    required this.platformFee,
    required this.expertPayout,
    required this.status,
    required this.description,
    this.createdAt,
    this.updatedAt,
    this.contract,
  });

  factory TransactionModel.fromJson(Map<String, dynamic> json) {
    return TransactionModel(
      id: json['_id'] ?? '',
      consultationContractId: json['consultation_contracts_id_fk'] is String
          ? json['consultation_contracts_id_fk']
          : (json['consultation_contracts_id_fk']?['_id'] ?? ''),
      userId: json['user_id'] ?? '',
      payosOrderCode: json['payos_order_code'] ?? '',
      payosTransactionId: json['payos_transaction_id'],
      payosPaymentLink: json['payos_payment_link'],
      payosQrCode: json['payos_qr_code'],
      amountGross: (json['amount_gross'] ?? 0).toInt(),
      platformFee: (json['platform_fee'] ?? 0).toInt(),
      expertPayout: (json['expert_payout'] ?? 0).toInt(),
      status: json['status'] ?? 'PENDING',
      description: json['description'] ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'])
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'])
          : null,
      contract: json['consultation_contracts_id_fk'] is Map
          ? ContractInfo.fromJson(json['consultation_contracts_id_fk'])
          : null,
    );
  }

  /// Format amount as Vietnamese currency string.
  String get formattedAmount {
    return '${amountGross.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')} VND';
  }

  /// Human-readable status label.
  String get statusLabel {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'PAID':
        return 'Paid';
      case 'FAILED':
        return 'Failed';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  }

  bool get isPaid => status == 'PAID';
  bool get isPending => status == 'PENDING';
}

/// Populated contract info from the Transaction query.
class ContractInfo {
  final String id;
  final String status;
  final NutritionistInfo? nutritionist;

  ContractInfo({
    required this.id,
    required this.status,
    this.nutritionist,
  });

  factory ContractInfo.fromJson(Map<String, dynamic> json) {
    return ContractInfo(
      id: json['_id'] ?? '',
      status: json['status'] ?? '',
      nutritionist: json['nutritionist_id'] is Map
          ? NutritionistInfo.fromJson(json['nutritionist_id'])
          : null,
    );
  }
}

/// Minimal nutritionist info populated from contract reference.
class NutritionistInfo {
  final String id;
  final String fullName;
  final String specialization;
  final int serviceFee;
  final double averageRating;

  NutritionistInfo({
    required this.id,
    required this.fullName,
    required this.specialization,
    required this.serviceFee,
    required this.averageRating,
  });

  factory NutritionistInfo.fromJson(Map<String, dynamic> json) {
    return NutritionistInfo(
      id: json['_id'] ?? '',
      fullName: json['full_name'] ?? 'Unknown',
      specialization: json['specialization'] ?? '',
      serviceFee: (json['service_fee'] ?? 0).toInt(),
      averageRating: (json['average_rating'] ?? 0).toDouble(),
    );
  }
}

/// Response from the hire checkout endpoint.
class CheckoutResult {
  final String orderCode;
  final int amount;
  final String checkoutUrl;
  final String? qrCode;
  final String contractId;
  final String? transactionId;

  CheckoutResult({
    required this.orderCode,
    required this.amount,
    required this.checkoutUrl,
    this.qrCode,
    required this.contractId,
    this.transactionId,
  });

  factory CheckoutResult.fromJson(Map<String, dynamic> json) {
    return CheckoutResult(
      orderCode: json['order_code']?.toString() ?? '',
      amount: (json['amount'] ?? 0).toInt(),
      checkoutUrl: json['checkout_url'] ?? '',
      qrCode: json['qr_code'],
      contractId: json['contract_id'] ?? '',
      transactionId: json['transaction_id'],
    );
  }
}

/// Model containing the configured PayOS redirect URLs for WebView interception.
class PayOSUrlsModel {
  final String returnUrl;
  final String cancelUrl;

  const PayOSUrlsModel({
    required this.returnUrl,
    required this.cancelUrl,
  });

  factory PayOSUrlsModel.fromJson(Map<String, dynamic> json) {
    return PayOSUrlsModel(
      returnUrl: json['returnUrl'] ?? '',
      cancelUrl: json['cancelUrl'] ?? '',
    );
  }
}
