import * as signalR from "@microsoft/signalr";

let connection: signalR.HubConnection | null = null;

export function getConnection(): signalR.HubConnection {
  if (!connection) {
    connection = new signalR.HubConnectionBuilder()
      .withUrl(
        `${
          process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"
        }/hubs/game`,
        { withCredentials: true }
      )
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();
  }
  return connection;
}

export async function startConnection() {
  const conn = getConnection();
  if (conn.state === signalR.HubConnectionState.Disconnected) {
    try {
      await conn.start();
      console.log("SignalR connected");
    } catch (err) {
      console.error("SignalR start failed", err);
    }
  }
}

export async function stopConnection() {
  if (connection) {
    await connection.stop();
  }
}

export async function getQuizzes(): Promise<
  Array<{ id: string; title: string; description: string }>
> {
  return new Promise((resolve, reject) => {
    const conn = getConnection();
    const handler = (
      quizzes: Array<{ id: string; title: string; description: string }>
    ) => {
      conn.off("QuizzesReceived", handler);
      resolve(quizzes);
    };
    conn.on("QuizzesReceived", handler);
    conn.invoke("GetQuizzes").catch(reject);
  });
}

export async function startGame(pin: string, quizId: string): Promise<void> {
  const conn = getConnection();
  await conn.invoke("StartGame", pin, quizId);
}
