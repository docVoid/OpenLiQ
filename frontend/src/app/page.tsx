import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">OpenLiQ</h1>
          <p className="text-2xl text-gray-700 mb-8">
            Real-time Quiz Game Platform
          </p>
          <div className="space-x-4">
            <Link
              href="/quiz"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Start Quiz
            </Link>
            <Link
              href="/docs"
              className="inline-block px-6 py-3 bg-gray-200 text-gray-900 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              Documentation
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
