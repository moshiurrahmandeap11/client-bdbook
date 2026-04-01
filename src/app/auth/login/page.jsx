// app/(auth)/login/page.jsx
import LoginPageClient from "@/app/components/authComponents/LoginPage";


export const metadata = {
  title: "Login - BD Book",
};

export default async function LoginPage() {
  
  return <LoginPageClient />;
}