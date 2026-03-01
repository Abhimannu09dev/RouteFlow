const WebSocket = require("ws");

let wss;

function initWebSocket(server) {
  wss = new WebSocket.Server({ server });

  wss.on("connection", (ws, req) => {
    console.log("Client connected");
    try{
        const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get("token");
        if (!token) {
            ws.close(1008, "Token missing");
            return;
        }
        // Here you would verify the token and extract user info
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id;
        const role = decoded.role;
        addUser(userId, ws, role);
        console.log(`User ${userId} connected with role ${role}`);
    } catch (error) {
        ws.close(1008, "Invalid token");
        return;
    }

    ws.on("close", () => {
      console.log("Client disconnected");
    });
  });
}

function broadcast(data) {s
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

module.exports = { initWebSocket, broadcast };
