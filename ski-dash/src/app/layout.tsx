import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'YUKIMIRU 雪見 - 日本滑雪场情报',
  description: '日本关东地区滑雪场综合情况看板，智能推荐最佳滑雪场',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen">
        <header className="sticky top-0 z-50 bg-black/70 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5">
              <span className="text-2xl">🎿</span>
              <h1 className="text-lg font-bold text-[#e2e8f0]">YUKIMIRU 雪見</h1>
            </a>
            <span className="text-sm text-[#94a3b8]">滑雪场情况看板</span>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
