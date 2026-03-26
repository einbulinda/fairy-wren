import { useEffect, useRef, useCallback, useState } from "react";
import { io } from "socket.io-client";
import { TokenService } from "@/api/token.service";

const SOCKET_URL = import.meta.env.VITE_SERVER_URL;

export const useSocket = () => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    const token = TokenService.getToken();
    
    // Don't attempt connection if no token
    if (!token) {
      console.log("[Socket] No token, skipping connection");
      setIsConnected(false);
      setConnectionError(null);
      return;
    }

    console.log("[Socket] Connecting to:", SOCKET_URL);

    // Initialize socket connection
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on("connect", () => {
      console.log("[Socket] Connected, socket id:", socket.id);
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("[Socket] Connection error:", error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    socket.on("error", (error) => {
      console.error("[Socket] Error:", error);
    });

    // Debug: Log all incoming events
    socket.onAny((eventName, ...args) => {
      console.log("[Socket] Received event:", eventName, args);
    });

    // Cleanup
    return () => {
      console.log("[Socket] Cleaning up connection");
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Subscribe to events
  const subscribe = useCallback((event, callback) => {
    if (!socketRef.current) {
      console.warn("[Socket] Cannot subscribe - no socket:", event);
      return;
    }
    console.log("[Socket] Subscribing to:", event);
    socketRef.current.on(event, callback);
  }, []);

  // Unsubscribe from events
  const unsubscribe = useCallback((event, callback) => {
    if (!socketRef.current) return;
    console.log("[Socket] Unsubscribing from:", event);
    socketRef.current.off(event, callback);
  }, []);

  // Emit events to server
  const emit = useCallback((event, data) => {
    if (!socketRef.current) {
      console.warn("[Socket] Cannot emit - no socket:", event);
      return;
    }
    console.log("[Socket] Emitting:", event);
    socketRef.current.emit(event, data);
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    subscribe,
    unsubscribe,
    emit,
  };
};
