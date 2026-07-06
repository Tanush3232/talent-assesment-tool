import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Metadata } from "next";
import Image from "next/image";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Login",
  description: "Login to Talent Assessment Portal",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* High-res background image */}
      <Image 
        src="/login-bg-v2.jpg" 
        alt="Login Background" 
        fill
        className="object-cover object-center absolute inset-0 -z-20"
        priority
      />
      {/* Overlay to ensure the login card remains readable against the background */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[5px] -z-10" />

      <Card className="w-full max-w-[420px] shadow-xl border-slate-200/60 bg-white/80 backdrop-blur-xl">
        <CardHeader className="space-y-4 items-center text-center pb-8 pt-10">
          <div className="flex items-center justify-center gap-6 mb-4">
            <img 
              src="https://www.zuariindustries.in/assets/web/img/logo/zuari_logo.png" 
              alt="Zuari Industries" 
              className="h-12 object-contain"
            />
            <div className="h-10 w-px bg-slate-300"></div>
            <img 
              src="https://www.zuariindustries.in/assets/web/img/logo/adventz.png" 
              alt="Adventz" 
              className="h-12 object-contain"
            />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
              Talent Assessment Workspace
            </CardTitle>
            <CardDescription className="text-sm font-medium text-slate-500">
              Sign in with your corporate account to continue
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pb-10">
          {error === "not_registered" && (
            <div className="p-3 text-sm text-zuari-red/90 bg-zuari-red/10 border border-zuari-red/15 rounded-lg text-center font-medium">
              Your account is not registered. Please contact HR.
            </div>
          )}
          {error === "suspended" && (
            <div className="p-3 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg text-center font-medium">
              Your account is currently inactive.
            </div>
          )}
          {(error === "CredentialsSignin" || error === "credentials") && (
            <div className="p-3 text-sm text-zuari-red/90 bg-zuari-red/10 border border-zuari-red/15 rounded-lg text-center font-medium">
              Invalid username or password. Please try again.
            </div>
          )}

          <form
            action={async (formData) => {
              "use server";
              try {
                await signIn("credentials", formData);
              } catch (err) {
                if (err instanceof AuthError) {
                  return redirect(`/login?error=${err.type}`);
                }
                throw err;
              }
            }}
            className="space-y-3"
          >
            <input type="hidden" name="redirectTo" value="/dashboard" />
            <input 
              name="username" 
              placeholder="Username (admin, hr, manager)" 
              className="w-full h-11 px-3 border border-slate-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary" 
              required 
            />
            <input 
              name="password" 
              type="password" 
              placeholder="Password (1234)" 
              className="w-full h-11 px-3 border border-slate-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary" 
              required 
            />
            <Button
              type="submit"
              className="w-full h-11 bg-slate-800 hover:bg-slate-900 text-white font-medium shadow-sm transition-all active:scale-[0.98]"
            >
              Sign in with Dummy Credentials
            </Button>
          </form>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-semibold tracking-wider">OR</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <form
            action={async () => {
              "use server";
              await signIn("microsoft-entra-id", { redirectTo: "/dashboard" });
            }}
          >
            <Button
              type="submit"
              variant="outline"
              className="w-full h-11 bg-white hover:bg-slate-50 text-slate-700 border-slate-300 font-medium shadow-sm transition-all active:scale-[0.98]"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 0H0v10h10V0z" fill="#f25022"/>
                <path d="M21 0H11v10h10V0z" fill="#7fba00"/>
                <path d="M10 11H0v10h10V11z" fill="#00a4ef"/>
                <path d="M21 11H11v10h10V11z" fill="#ffb900"/>
              </svg>
              Sign in with Microsoft
            </Button>
          </form>

          <div className="text-center text-xs text-slate-400 font-medium">
            &copy; {new Date().getFullYear()} Adventz Group. All rights reserved.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
