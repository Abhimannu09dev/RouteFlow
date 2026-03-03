require("dotenv").config({ path: "../.env" });
const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const {
  addUser,
  removeUser,
  getUserSocket,
  getUsersByRole,
} = require("./connectionManager");

const JWT_SECRET = process.env.JWT_SECRET;

let wss;

function initWebSocket(server) {
  wss = new WebSocket.Server({ server });

  wss.on("connection", (ws, req) => {
    console.log("Client connected");

    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get("token");
      if (!token) {
        ws.close(1008, "Token missing");
        return;
      }
      const decoded = jwt.verify(token, JWT_SECRET);

      const userId = decoded.id;
      const role = decoded.role;

      addUser(userId, ws, role);

      console.log(`User ${userId} connected with role ${role}`);
    } catch (error) {
      console.log("JWT ERROR:", error.message);
      ws.close(1008, error.message);
      return;
    }

    ws.on("close", () => {
      console.log("Client disconnected");
      removeUser(ws);
    });
  });
}

function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

module.exports = { initWebSocket, broadcast };
