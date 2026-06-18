/// Validation utility for expert registration forms
class ExpertRegistrationValidator {
  /// Validate email format
  static String? validateEmail(String? value) {
    if (value == null || value.isEmpty) {
      return 'Email is required';
    }
    final emailRegex = RegExp(
      r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
    );
    if (!emailRegex.hasMatch(value)) {
      return 'Please enter a valid email';
    }
    return null;
  }

  /// Validate password strength
  /// Requirements: at least 8 chars, 1 uppercase, 1 number, 1 special char
  static String? validatePassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Password is required';
    }
    if (value.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!RegExp(r'[A-Z]').hasMatch(value)) {
      return 'Password must contain an uppercase letter';
    }
    if (!RegExp(r'[0-9]').hasMatch(value)) {
      return 'Password must contain a number';
    }
    if (!RegExp(r'[!@#$%^&*(),.?":{}|<>]').hasMatch(value)) {
      return 'Password must contain a special character';
    }
    return null;
  }

  /// Validate password confirmation matches
  static String? validatePasswordConfirmation(String? value, String password) {
    if (value == null || value.isEmpty) {
      return 'Confirm password is required';
    }
    if (value != password) {
      return 'Passwords do not match';
    }
    return null;
  }

  /// Validate professional title
  static String? validateProfessionalTitle(String? value) {
    if (value == null || value.isEmpty) {
      return 'Professional title is required';
    }
    if (value.trim().length < 5) {
      return 'Professional title must be at least 5 characters';
    }
    return null;
  }

  /// Validate license number
  static String? validateLicenseNumber(String? value) {
    if (value == null || value.isEmpty) {
      return 'License number is required';
    }
    if (value.trim().isEmpty) {
      return 'License number cannot be empty';
    }
    return null;
  }

  /// Validate consultation fee
  static String? validateConsultationFee(String? value) {
    if (value == null || value.isEmpty) {
      return 'Consultation fee is required';
    }

    // Input is formatted in UI (e.g. "300,000"), so parse digits only.
    final fee = parseCurrency(value);
    if (fee == null) {
      return 'Please enter a valid number';
    }
    if (fee <= 0) {
      return 'Consultation fee must be greater than zero';
    }
    return null;
  }

  /// Format currency input (VND)
  /// Removes non-digits and formats with thousand separators
  static String formatCurrency(String input) {
    // Remove all non-digit characters
    final digitsOnly = input.replaceAll(RegExp(r'[^0-9]'), '');

    if (digitsOnly.isEmpty) return '';

    // Convert to integer and back to remove leading zeros
    final number = int.parse(digitsOnly);

    // Format with thousand separators
    final formatted = number.toString().replaceAllMapped(
      RegExp(r'\B(?=(\d{3})+(?!\d))'),
      (match) => ',',
    );

    return formatted;
  }

  /// Extract numeric value from currency string
  static int? parseCurrency(String input) {
    final digitsOnly = input.replaceAll(RegExp(r'[^0-9]'), '');
    return int.tryParse(digitsOnly);
  }
}
