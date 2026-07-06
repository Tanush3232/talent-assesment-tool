import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, FileSpreadsheet, Settings } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;
  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const isHrOrAdmin = user.role === "HR" || user.role === "ADMIN";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex h-16 items-center justify-between px-6">
          {/* Left Section: Logo & Title */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="flex items-center transition-opacity hover:opacity-80">
                <img 
                  src="https://www.zuariindustries.in/assets/web/img/logo/zuari_logo.png" 
                  alt="Zuari Industries" 
                  className="h-9 object-contain"
                />
              </Link>
              <div className="h-8 w-px bg-slate-200"></div>
              <div className="flex flex-col text-slate-700 text-[10px] font-bold tracking-widest leading-tight uppercase">
                <span>Talent Assessment</span>
                <span className="text-zuari-blue">Workspace</span>
              </div>
            </div>

            {/* Middle Section: Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 ml-6">
              <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-colors">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              {isHrOrAdmin && (
                <>
                  <Link href="/reports" className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-colors">
                    <FileSpreadsheet className="w-4 h-4" />
                    Reports
                  </Link>
                  {user.role === "ADMIN" && (
                    <Link href="/admin" className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-colors">
                      <Settings className="w-4 h-4" />
                      Admin
                    </Link>
                  )}
                </>
              )}
            </nav>
          </div>

          {/* Right Section: User Profile & Adventz Logo */}
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="flex items-center gap-2 text-left focus:outline-none hover:bg-slate-50 p-1.5 rounded-full border border-transparent hover:border-slate-200 transition-all">
                    <Avatar className="h-9 w-9 border border-slate-200 shadow-sm">
                      <AvatarFallback className="bg-zuari-blue/10 text-zuari-blue font-bold text-xs">{initials}</AvatarFallback>
                    </Avatar>
                  </button>
                }
              />
              <DropdownMenuContent className="w-64" align="end">
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="flex flex-col space-y-2">
                    <div className="flex flex-col">
                      <p className="text-sm font-bold text-slate-900 leading-none">{user.name}</p>
                      <p className="text-[11px] font-semibold tracking-wider text-zuari-blue uppercase mt-1.5">
                        {user.designation || user.role}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <form action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}>
                  <DropdownMenuItem
                    nativeButton
                    render={
                      <button type="submit" className="w-full flex items-center text-zuari-red cursor-pointer p-2">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span className="font-medium">Log out</span>
                      </button>
                    }
                  />
                </form>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-8 w-px bg-slate-200 mx-2"></div>

            <img 
              src="https://www.zuariindustries.in/assets/web/img/logo/adventz.png" 
              alt="Adventz" 
              className="h-8 object-contain"
            />
          </div>
        </div>
      </header>

      {/* Support Banner below Navbar */}
      <div className="bg-zuari-blue/5 border-b border-zuari-blue/10 px-6 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <span className="flex h-2 w-2 rounded-full bg-zuari-blue animate-pulse"></span>
            <span className="font-medium">For any doubts or assistance, reach out to:</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 text-xs sm:text-sm">
            <span className="font-bold text-slate-900">Shaik Mohammed Siddiq</span>
            <span className="hidden sm:inline text-slate-300">|</span>
            <span className="font-medium">Lead - Talent Management</span>
            <span className="hidden sm:inline text-slate-300">|</span>
            <a href="mailto:Siddiq.Shaik@adventz.com" className="text-zuari-blue hover:underline font-medium flex items-center gap-1">
              Siddiq.Shaik@adventz.com
            </a>
            <span className="hidden sm:inline text-slate-300">|</span>
            <span className="font-medium">+91 9573254626</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
