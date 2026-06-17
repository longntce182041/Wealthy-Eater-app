import '../../domain/entities/consultation.dart';

/// Data model for a Transaction/Invoice record from the backend API.
class TransactionModel extends ConsultationTransactionEntity {
  TransactionModel({
    required super.id,
    required super.consultationContractId,
    required super.userId,
    required super.payosOrderCode,
    super.payosTransactionId,
    super.payosPaymentLink,
    super.payosQrCode,
    required super.amountGross,
    required super.platformFee,
    required super.expertPayout,
    required super.status,
    required super.description,
    super.createdAt,
    super.updatedAt,
    ContractInfo? super.contract,
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
}

/// Populated contract info from the Transaction query.
class ContractInfo extends ContractInfoEntity {
  ContractInfo({
    required super.id,
    required super.status,
    NutritionistInfo? super.nutritionist,
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
class NutritionistInfo extends NutritionistInfoEntity {
  NutritionistInfo({
    required super.id,
    required super.fullName,
    required super.specialization,
    required super.serviceFee,
    required super.averageRating,
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
class CheckoutResult extends CheckoutResultEntity {
  CheckoutResult({
    required super.orderCode,
    required super.amount,
    required super.checkoutUrl,
    super.qrCode,
    required super.contractId,
    super.transactionId,
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
class PayOSUrlsModel extends PayOSUrlsEntity {
  const PayOSUrlsModel({
    required super.returnUrl,
    required super.cancelUrl,
  });

  factory PayOSUrlsModel.fromJson(Map<String, dynamic> json) {
    return PayOSUrlsModel(
      returnUrl: json['returnUrl'] ?? '',
      cancelUrl: json['cancelUrl'] ?? '',
    );
  }
}

