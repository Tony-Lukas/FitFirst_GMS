export async function broadcastGymEvent(event, payload) {
  if (!process.env.SOCKET_URL || !process.env.SOCKET_SERVER_SECRET) {
    return;
  }

  try {
    await fetch(`${process.env.SOCKET_URL}/internal/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-socket-secret": process.env.SOCKET_SERVER_SECRET,
      },
      body: JSON.stringify({ event, payload }),
      cache: "no-store",
    });
  } catch {
    // The app should still work even if the socket server is offline.
  }
}
