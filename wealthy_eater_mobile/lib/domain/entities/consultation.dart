class NutritionistEntity {
  final String id;
  final String fullName;
  final String specialization;
  final int serviceFee;
  final double averageRating;
  final String? certificationUrl;

  const NutritionistEntity({
    required this.id,
    required this.fullName,
    required this.specialization,
    required this.serviceFee,
    required this.averageRating,
    this.certificationUrl,
  });

  // Helper method to get initials for default avatar
  String get initials {
    if (fullName.isEmpty) return '??';
    final parts = fullName.split(' ').where((part) => part.isNotEmpty).toList();
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[parts.length - 1][0]}'.toUpperCase();
    }
    return fullName.substring(0, 1).toUpperCase();
  }

  // Pure logic for calculating package prices
  int calculatePriceForPackage(String packageType) {
    if (packageType == '3_months') {
      return (serviceFee * 3 * 0.89).round();
    } else if (packageType == '6_months') {
      return (serviceFee * 6 * 0.84).round();
    }
    return serviceFee;
  }
}

class CheckoutResultEntity {
  final String orderCode;
  final int amount;
  final String checkoutUrl;
  final String? qrCode;
  final String contractId;
  final String? transactionId;

  const CheckoutResultEntity({
    required this.orderCode,
    required this.amount,
    required this.checkoutUrl,
    this.qrCode,
    required this.contractId,
    this.transactionId,
  });
}

class PayOSUrlsEntity {
  final String returnUrl;
  final String cancelUrl;

  const PayOSUrlsEntity({
    required this.returnUrl,
    required this.cancelUrl,
  });
}

class NutritionistInfoEntity {
  final String id;
  final String fullName;
  final String specialization;
  final int serviceFee;
  final double averageRating;

  const NutritionistInfoEntity({
    required this.id,
    required this.fullName,
    required this.specialization,
    required this.serviceFee,
    required this.averageRating,
  });
}

class ContractInfoEntity {
  final String id;
  final String status;
  final NutritionistInfoEntity? nutritionist;

  const ContractInfoEntity({
    required this.id,
    required this.status,
    this.nutritionist,
  });
}

class ConsultationTransactionEntity {
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
  final ContractInfoEntity? contract;

  const ConsultationTransactionEntity({
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

class ConsultationContractEntity {
  final String id;
  final String status;
  final NutritionistEntity nutritionist;
  final String packageType;
  final DateTime? expireAt;
  final DateTime? createdAt;

  const ConsultationContractEntity({
    required this.id,
    required this.status,
    required this.nutritionist,
    this.packageType = '1_month',
    this.expireAt,
    this.createdAt,
  });
}
