// app/(auth)/signup/page.jsx
import SignupPageClient from "@/app/components/authComponents/SignUpPage";


export const metadata = {
  title: "Sign Up - BD Book",
};

export default async function SignupPage() {
  
  return <SignupPageClient />;
}