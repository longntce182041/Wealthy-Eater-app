const express = require("express");
const router = express.Router();

// Middleware to verify internal requests
const verifyInternalSecret = (req, res, next) => {
  const secret = req.headers["x-internal-secret"];
  if (secret !== process.env.N8N_INTERNAL_SECRET) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  next();
};

router.use(verifyInternalSecret);

router.post("/socket/emit", (req, res) => {
  const { event, room, payload } = req.body;
  if (!event || !room) {
    return res.status(400).json({ success: false, message: "Missing event or room" });
  }
  
  const io = req.app.get("socketio");
  if (io) {
    io.to(room).emit(event, payload);
    return res.status(200).json({ success: true, message: "Socket event emitted" });
  }
  
  return res.status(500).json({ success: false, message: "Socket.IO not initialized" });
});

router.post("/notifications/push", (req, res) => {
  const notification = req.body;
  // Here we would push the notification to the user via FCM or DB
  console.log("[Internal Notification API] Received push notification:", notification);
  
  const io = req.app.get("socketio");
  if (io && notification.user_id) {
    // Send a real-time notification event to the user
    io.to(notification.user_id.toString()).emit("new_notification", notification);
  }
  
  return res.status(200).json({ success: true, message: "Notification processed" });
});

module.exports = router;
