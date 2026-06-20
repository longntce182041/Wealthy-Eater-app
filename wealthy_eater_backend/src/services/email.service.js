const nodemailer = require("nodemailer");

// Tạo transporter kết nối với SMTP (Cấu hình trong file .env của bác)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS, 
  },
});

/**
 * Gửi email khi hồ sơ được duyệt thành công
 */
async function sendApprovalEmail(toEmail, fullName) {
  const mailOptions = {
    from: `"Wealthy Eater" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "🎉 Chúc mừng! Hồ sơ Chuyên gia Dinh dưỡng của bạn đã được phê duyệt",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #2ecc71; text-align: center;">Hồ Sơ Được Phê Duyệt Thành Công!</h2>
        <p>Xin chào <strong>${fullName}</strong>,</p>
        <p>Hội đồng kiểm duyệt của <strong>Wealthy Eater</strong> đã hoàn tất xác thực chứng chỉ chuyên môn và giấy phép hành nghề của bạn.</p>
        <p>Hồ sơ của bạn hoàn toàn hợp lệ. Trạng thái tài khoản của bạn đã được chuyển sang <span style="color: #2ecc71; font-weight: bold;">ACTIVE (Đang hoạt động)</span>.</p>
        <p>Bây giờ bạn đã có thể đăng nhập vào hệ thống, mở lịch tư vấn và kết nối với khách hàng để kiếm thêm thu nhập.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #7f8c8d; text-align: center;">Đây là email tự động từ hệ thống Wealthy Eater, vui lòng không trả lời email này.</p>
      </div>
    `,
  };
  return transporter.sendMail(mailOptions);
}

/**
 * Gửi email khi hồ sơ bị từ chối duyệt
 */
async function sendRejectionEmail(toEmail, fullName, reason = "Chứng chỉ chuyên môn không đủ điều kiện hoặc thông tin giấy phép hành nghề không chính xác.") {
  const mailOptions = {
    from: `"Wealthy Eater" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "🔔 Thông báo kết quả kiểm duyệt hồ sơ Chuyên gia Dinh dưỡng",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #e74c3c; text-align: center;">Hồ Sơ Chưa Được Phê Duyệt</h2>
        <p>Xin chào <strong>${fullName}</strong>,</p>
        <p>Cảm ơn bạn đã gửi hồ sơ đăng ký đối tác chuyên gia dinh dưỡng tại <strong>Wealthy Eater</strong>.</p>
        <p>Tuy nhiên, sau khi tiến hành thẩm định chứng chỉ chuyên môn, hội đồng rất tiếc phải thông báo hồ sơ của bạn chưa đạt yêu cầu kiểm duyệt với lý do:</p>
        <blockquote style="background: #f9f9f9; border-left: 5px solid #e74c3c; padding: 10px 15px; margin: 15px 0;">
          ${reason}
        </blockquote>
        <p>Tài khoản chuyên gia của bạn tạm thời chuyển về trạng thái <span style="color: #e74c3c; font-weight: bold;">REJECTED</span>. Bạn vui lòng chuẩn bị lại giấy tờ chính xác và cập nhật lại hồ sơ trên hệ thống nhé.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #7f8c8d; text-align: center;">Mọi thắc mắc vui lòng liên hệ bộ phận hỗ trợ Admin Wealthy Eater.</p>
      </div>
    `,
  };
  return transporter.sendMail(mailOptions);
}

module.exports = { sendApprovalEmail, sendRejectionEmail };