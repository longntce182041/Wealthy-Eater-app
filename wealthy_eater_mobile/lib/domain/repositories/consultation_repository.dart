import '../entities/consultation.dart';

abstract class ConsultationRepository {
  Future<CheckoutResultEntity> hireNutritionist(
    String nutritionistId, {
    String packageType = '1_month',
  });

  Future<ConsultationTransactionEntity> fetchTransactionDetail(
    String transactionId,
  );

  Future<bool> verifyPayment(String orderCode);

  Future<PayOSUrlsEntity> fetchPayOSUrls();

  Future<ConsultationContractEntity?> fetchActiveContract();

  Future<bool> requestMealPlan();

  Future<String?> fetchMealPlanRequestStatus();
}
