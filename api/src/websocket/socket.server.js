const { Server } = require("socket.io");
const { verifyToken } = require("../utils/jwt");

let io = null;

/**
 * Initialize Socket.io server
 * @param {http.Server} httpServer - HTTP server instance
 */
function initializeSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: [
        "https://pos.fairywren.co.ke",
        "https://erp.fairywren.co.ke",
        "http://localhost:5173",
        "http://localhost:5174",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
    // Use polling for better compatibility (can upgrade to WebSocket)
    transports: ["polling", "websocket"],
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = verifyToken(token);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      socket.userPermissions = decoded.permissions || [];

      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`[WebSocket] User ${socket.userId} connected`);

    // Join user-specific room for targeted updates
    socket.join(`user:${socket.userId}`);

    // Join role-based rooms
    if (socket.userRole) {
      socket.join(`role:${socket.userRole}`);
    }

    // Join permission-based rooms
    socket.userPermissions.forEach((perm) => {
      socket.join(`perm:${perm}`);
    });

    // Handle client subscription requests
    socket.on("subscribe:bills", () => {
      socket.join("bills");
      console.log(`[WebSocket] User ${socket.userId} subscribed to bills`);
    });

    socket.on("unsubscribe:bills", () => {
      socket.leave("bills");
    });

    socket.on("subscribe:inventory", () => {
      socket.join("inventory");
    });

    socket.on("unsubscribe:inventory", () => {
      socket.leave("inventory");
    });

    socket.on("disconnect", (reason) => {
      console.log(`[WebSocket] User ${socket.userId} disconnected: ${reason}`);
    });
  });

  return io;
}

/**
 * Get the io instance (must call initializeSocketServer first)
 */
function getIO() {
  if (!io) {
    throw new Error("Socket server not initialized");
  }
  return io;
}

/**
 * Broadcast a message to all connected clients or specific rooms
 */
function broadcast(event, data, options = {}) {
  if (!io) {
    console.warn("[WebSocket] Cannot broadcast - server not initialized. Event:", event);
    return;
  }

  const { room, permissions } = options;
  
  console.log(`[WebSocket] Broadcasting '${event}' to ${room || 'all clients'}`);

  if (room) {
    io.to(room).emit(event, data);
  } else if (permissions && permissions.length > 0) {
    // Broadcast to users with specific permissions
    permissions.forEach((perm) => {
      io.to(`perm:${perm}`).emit(event, data);
    });
  } else {
    io.emit(event, data);
  }
}

module.exports = {
  initializeSocketServer,
  getIO,
  broadcast,
};
