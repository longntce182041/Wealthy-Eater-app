import { io } from "socket.io-client";

class ExpertSocketService {
  constructor() {
    this.socket = null;
  }

  initializeConnection(expertJwtToken) {
    // Instantiate real-time communication protocols connecting to backend servers securely
    this.socket = io(import.meta.env.VITE_SOCKET_SERVER_URL, {
      auth: { token: expertJwtToken }, // Inject verified system security token on handshake
      transports: ["websocket"], // Bypass long-polling to minimize communication latency
      autoConnect: true,
      reconnectionAttempts: 5,
    });

    this.socket.on("connect", () => {
      console.log("✔ Real-time synchronization channel online.");
    });
  }

  emitComplianceAlert(clientRecordId, payloadData) {
    if (this.socket) {
      this.socket.emit("expert_issue_warning", {
        clientId: clientRecordId,
        ...payloadData,
      });
    }
  }

  disconnectWorkspace() {
    if (this.socket) this.socket.disconnect();
  }
}

export default new ExpertSocketService();
