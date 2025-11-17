import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        <div
          className="p-8 rounded-lg shadow-md flex flex-col items-center justify-center"
          style={{ backgroundColor: "#000" }}
        >
          <h2 className="text-3xl font-bold text-[#FFD100] mb-4">Host Game</h2>
          <p className="text-white mb-6">
            Create a live quiz, invite players with a PIN and start the game.
          </p>
          <Link
            href="/host/create"
            className="inline-block px-6 py-3 bg-[#FFD100] text-black font-semibold rounded-md"
          >
            Create Lobby
          </Link>
        </div>

        <div
          className="p-8 rounded-lg shadow-md flex flex-col items-center justify-center"
          style={{ backgroundColor: "#FFD100" }}
        >
          <h2 className="text-3xl font-bold text-black mb-4">Join Game</h2>
          <p className="text-black mb-6">
            Enter a PIN and your nickname to join an ongoing game.
          </p>
          <Link
            href="/player/join"
            className="inline-block px-6 py-3 bg-black text-[#FFD100] font-semibold rounded-md"
          >
            Join Lobby
          </Link>
        </div>
      </div>
    </main>
  );
}
