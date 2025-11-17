"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import * as signalR from "@microsoft/signalr";

interface UseSignalROptions {
  url?: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Custom hook to manage SignalR connection to the backend GameHub.
 * @param options Configuration options for the SignalR connection
 * @returns Connection object with connection state and invoke methods
 */
export function useSignalR(options: UseSignalROptions = {}) {
  const {
    url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
    onConnected,
    onDisconnected,
    onError,
  } = options;

  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    try {
      setIsConnecting(true);

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(`${url}/hubs/game`, {
          withCredentials: true,
        })
        .withAutomaticReconnect([0, 2000, 10000])
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Connection event handlers
      connection.onreconnecting(() => {
        console.log("SignalR reconnecting...");
        setIsConnected(false);
      });

      connection.onreconnected(() => {
        console.log("SignalR reconnected");
        setIsConnected(true);
      });

      connection.onclose(() => {
        console.log("SignalR disconnected");
        setIsConnected(false);
        setIsConnecting(false);
        onDisconnected?.();
      });

      // Server-sent methods
      connection.on("ReceiveWelcome", (message: string) => {
        console.log("Server:", message);
      });

      connection.on("GameStarted", (gameId: string) => {
        console.log("Game started:", gameId);
      });

      connection.on("GameEnded", (gameId: string) => {
        console.log("Game ended:", gameId);
      });

      await connection.start();
      connectionRef.current = connection;
      setIsConnected(true);
      setIsConnecting(false);
      onConnected?.();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error("SignalR connection failed:", err);
      setIsConnecting(false);
      onError?.(err);
    }
  }, [url, onConnected, onDisconnected, onError]);

  const disconnect = useCallback(async () => {
    try {
      if (connectionRef.current) {
        await connectionRef.current.stop();
        connectionRef.current = null;
        setIsConnected(false);
      }
    } catch (error) {
      console.error("Error disconnecting from SignalR:", error);
    }
  }, []);

  const invoke = useCallback(
    async <T = any>(methodName: string, ...args: any[]): Promise<T | null> => {
      try {
        if (!connectionRef.current || !isConnected) {
          throw new Error("SignalR connection not established");
        }
        return await connectionRef.current.invoke<T>(methodName, ...args);
      } catch (error) {
        console.error(`Error invoking ${methodName}:`, error);
        throw error;
      }
    },
    [isConnected]
  );

  const on = useCallback(
    (eventName: string, callback: (...args: any[]) => void) => {
      if (!connectionRef.current) {
        console.warn("SignalR connection not established");
        return;
      }
      connectionRef.current.on(eventName, callback);
    },
    []
  );

  const off = useCallback(
    (eventName: string, callback?: (...args: any[]) => void) => {
      if (!connectionRef.current) return;
      if (callback) {
        connectionRef.current.off(
          eventName,
          callback as (...args: any[]) => void
        );
      } else {
        connectionRef.current.off(eventName);
      }
    },
    []
  );

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connection: connectionRef.current,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    invoke,
    on,
    off,
  };
}
