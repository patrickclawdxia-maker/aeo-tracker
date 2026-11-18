import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(160deg, #0d0a1e 0%, #130d2e 50%, #0f0c29 100%)" }}
    >
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-indigo-700/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-violet-700/15 blur-[80px]" />
      </div>

      <div className="relative z-10 w-full flex flex-col items-center">
        {/* Logo */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-lg shadow-indigo-900/50">
            A
          </div>
          <span className="text-xl font-bold text-white">AEO Tracker</span>
        </div>

        <SignIn
          appearance={{
            variables: {
              colorPrimary: "#6366f1",
              colorBackground: "#1a1040",
              borderRadius: "12px",
            },
            elements: {
              rootBox: "w-full max-w-md",
              card: "bg-transparent shadow-none border border-white/10 backdrop-blur-sm",
              headerTitle: "text-white font-bold",
              headerSubtitle: "text-white/50",
              socialButtonsBlockButton: "border-white/15 bg-white/8 text-white hover:bg-white/12",
              socialButtonsBlockButtonText: "text-white font-medium",
              dividerLine: "bg-white/10",
              dividerText: "text-white/30",
              formFieldLabel: "text-white/60 text-xs uppercase tracking-wide",
              formFieldInput: "bg-white/6 border-white/15 text-white placeholder-white/25 focus:border-indigo-400/60",
              formButtonPrimary: "bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 shadow-lg shadow-indigo-900/50",
              footerActionText: "text-white/40",
              footerActionLink: "text-indigo-400 hover:text-indigo-300",
              identityPreviewText: "text-white/70",
              identityPreviewEditButtonIcon: "text-indigo-400",
            },
          }}
        />
      </div>
    </div>
  );
}
