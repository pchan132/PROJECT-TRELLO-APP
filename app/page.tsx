import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { BoardsList } from "@/components/boards-list";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16 bg-background">
        <div className="w-full max-w-7xl flex justify-between items-center p-3 px-5 text-sm">
          <div className="flex gap-5 items-center font-semibold">
            <Link href={"/"} className="text-xl font-bold text-blue-600">
              Trello Clone
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            {hasEnvVars && <AuthButton />}
          </div>
        </div>
      </nav>

      <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <BoardsList />
      </div>
    </main>
  );
}
