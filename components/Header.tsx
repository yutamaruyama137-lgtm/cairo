import Link from "next/link";

interface HeaderProps {
  title?: string;
  backHref?: string;
}

export default function Header({ title, backHref }: HeaderProps) {
  const jarvisLetters = ["J","A","R","V","I","S"];
  const colors = [
    "bg-orange-500", "bg-blue-500", "bg-purple-500",
    "bg-teal-500", "bg-rose-500", "bg-amber-500"
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {backHref && (
            <Link href={backHref} className="text-gray-400 hover:text-gray-600 transition-colors mr-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </Link>
          )}
          <Link href="/" className="flex items-center gap-1">
            {jarvisLetters.map((letter, i) => (
              <div
                key={letter}
                className={`w-6 h-6 ${colors[i]} rounded-md flex items-center justify-center text-white font-black text-xs`}
              >
                {letter}
              </div>
            ))}
            <span className="font-black text-base text-gray-800 ml-1">BOT</span>
          </Link>
          {title && (
            <>
              <span className="text-gray-300">/</span>
              <span className="text-sm text-gray-500 font-medium">{title}</span>
            </>
          )}
        </div>
        <div className="text-xs text-gray-400 font-medium bg-gray-100 px-3 py-1.5 rounded-full">
          by REQS Lab
        </div>
      </div>
    </header>
  );
}
