import AuthHeroAnimation from "@/components/auth_components/AuthHeroAnimation";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-4rem)] w-full flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-[#f8fafc]">
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        <div className="lg:col-span-7">
          <AuthHeroAnimation />
        </div>
        <div className="lg:col-span-5 flex justify-center w-full">
          {children}
        </div>
      </div>
    </div>
  );
}

