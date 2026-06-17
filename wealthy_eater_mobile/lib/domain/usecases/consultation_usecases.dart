import '../entities/consultation.dart';
import '../repositories/consultation_repository.dart';

class HireNutritionistUseCase {
  final ConsultationRepository repository;

  HireNutritionistUseCase(this.repository);

  Future<CheckoutResultEntity> call(
    String nutritionistId, {
    String packageType = '1_month',
  }) {
    return repository.hireNutritionist(
      nutritionistId,
      packageType: packageType,
    );
  }
}

class GetTransactionDetailUseCase {
  final ConsultationRepository repository;

  GetTransactionDetailUseCase(this.repository);

  Future<ConsultationTransactionEntity> call(String transactionId) {
    return repository.fetchTransactionDetail(transactionId);
  }
}

class VerifyPaymentUseCase {
  final ConsultationRepository repository;

  VerifyPaymentUseCase(this.repository);

  Future<bool> call(String orderCode) {
    return repository.verifyPayment(orderCode);
  }
}

class GetPayOSUrlsUseCase {
  final ConsultationRepository repository;

  GetPayOSUrlsUseCase(this.repository);

  Future<PayOSUrlsEntity> call() {
    return repository.fetchPayOSUrls();
  }
}

class GetActiveContractUseCase {
  final ConsultationRepository repository;

  GetActiveContractUseCase(this.repository);

  Future<ConsultationContractEntity?> call() {
    return repository.fetchActiveContract();
  }
}

class RequestMealPlanUseCase {
  final ConsultationRepository repository;

  RequestMealPlanUseCase(this.repository);

  Future<bool> call() {
    return repository.requestMealPlan();
  }
}

class GetMealPlanRequestStatusUseCase {
  final ConsultationRepository repository;

  GetMealPlanRequestStatusUseCase(this.repository);

  Future<String?> call() {
    return repository.fetchMealPlanRequestStatus();
  }
}
