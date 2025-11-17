import * as signalR from "@microsoft/signalr";

let connection: signalR.HubConnection | null = null;

export const getConnection = () => connection;

export const startConnection = async () => {
  if (connection?.state === signalR.HubConnectionState.Connected) {
    return connection;
  }

  connection = new signalR.HubConnectionBuilder()
    .withUrl("/hubs/game")
    .withAutomaticReconnect()
    .build();

  try {
    await connection.start();
    console.log("SignalR connected");
    return connection;
  } catch (error) {
    console.error("SignalR connection failed:", error);
    throw error;
  }
};

export const stopConnection = async () => {
  if (connection) {
    await connection.stop();
    console.log("SignalR disconnected");
  }
};

export const getQuizzes = async () => {
  if (
    !connection ||
    connection.state !== signalR.HubConnectionState.Connected
  ) {
    console.warn("Connection not ready for getQuizzes");
    return [];
  }
  const quizzes = await fetch("/api/quiz").then((r) => r.json());
  return quizzes;
};

export const startGame = async (pin: string, quizId: string) => {
  if (
    !connection ||
    connection.state !== signalR.HubConnectionState.Connected
  ) {
    console.warn("Connection not ready for startGame");
    return;
  }
  await connection.invoke("StartGame", pin, quizId);
};
