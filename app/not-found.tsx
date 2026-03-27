import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFFDF7" }}>
      <div className="text-center">
        <div className="text-6xl mb-4">😔</div>
        <h1 className="text-2xl font-black text-gray-800 mb-2">ページが見つかりません</h1>
        <p className="text-gray-500 mb-6">お探しのページは存在しないか、移動した可能性があります。</p>
        <Link
          href="/"
          className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-bold hover:bg-orange-600 transition-colors inline-block"
        >
          トップページへ戻る
        </Link>
      </div>
    </div>
  );
}
