import '../../domain/entities/consultation.dart';
import '../../domain/repositories/consultation_repository.dart';
import '../services/consultation_service.dart';

class ConsultationRepositoryImpl implements ConsultationRepository {
  final ConsultationService service;

  ConsultationRepositoryImpl({required this.service});

  @override
  Future<CheckoutResultEntity> hireNutritionist(
    String nutritionistId, {
    String packageType = '1_month',
  }) {
    return service.hireNutritionist(nutritionistId, packageType: packageType);
  }

  @override
  Future<ConsultationTransactionEntity> fetchTransactionDetail(
    String transactionId,
  ) {
    return service.fetchTransactionDetail(transactionId);
  }

  @override
  Future<bool> verifyPayment(String orderCode) {
    return service.verifyPayment(orderCode);
  }

  @override
  Future<PayOSUrlsEntity> fetchPayOSUrls() {
    return service.fetchPayOSUrls();
  }

  @override
  Future<ConsultationContractEntity?> fetchActiveContract() {
    return service.fetchActiveContract();
  }

  @override
  Future<bool> requestMealPlan() {
    return service.requestMealPlan();
  }

  @override
  Future<String?> fetchMealPlanRequestStatus() {
    return service.fetchMealPlanRequestStatus();
  }
}
