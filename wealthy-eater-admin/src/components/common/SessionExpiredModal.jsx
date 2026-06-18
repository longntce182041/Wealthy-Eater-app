
/**
 * SessionExpiredModal
 *
 * Displayed as an overlay when the 'session:expired' event is fired.
 * Blocks all interaction until the user clicks "Đăng nhập lại".
 *
 * Props:
 *   isOpen    {boolean}  - Whether to show the modal.
 *   onDismiss {function} - Callback that navigates to /login and closes.
 */
export default function SessionExpiredModal({ isOpen, onDismiss }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "#1e293b",
          borderRadius: "16px",
          padding: "40px 36px",
          maxWidth: "400px",
          width: "90%",
          textAlign: "center",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "rgba(239,68,68,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {/* Title */}
        <h2
          style={{
            color: "#f1f5f9",
            fontSize: "20px",
            fontWeight: 700,
            margin: "0 0 10px",
          }}
        >
          Phiên đăng nhập hết hạn
        </h2>

        {/* Message */}
        <p
          style={{
            color: "#94a3b8",
            fontSize: "14px",
            lineHeight: 1.6,
            margin: "0 0 28px",
          }}
        >
          Token của bạn đã hết hạn và không thể tự động làm mới. Vui lòng đăng
          nhập lại để tiếp tục.
        </p>

        {/* CTA Button */}
        <button
          onClick={onDismiss}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "10px",
            border: "none",
            background: "linear-gradient(135deg, #ef4444, #dc2626)",
            color: "#fff",
            fontSize: "15px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "opacity 0.2s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
        >
          Đăng nhập lại
        </button>
      </div>
    </div>
  );
}
