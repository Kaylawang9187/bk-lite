import { authOptions } from "@/constants/authOptions";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import SigninClient from "./SigninClient";

const signinErrors: Record<string | "default", string> = {
  default: "Unable to sign in.",
  signin: "Try signing in with a different account.",
  oauthsignin: "Try signing in with a different account.",
  oauthcallbackerror: "Try signing in with a different account.",
  oauthcreateaccount: "Try signing in with a different account.",
  emailcreateaccount: "Try signing in with a different account.",
  callback: "Try signing in with a different account.",
  oauthaccountnotlinked: "To confirm your identity, sign in with the same account you used originally.",
  sessionrequired: "Please sign in to access this page.",
};

interface SignInPageProp {
  params?: object;
  searchParams: {
    callbackUrl: string;
    error: string;
  };
}

export default async function SigninPage({ searchParams }: SignInPageProp) {
  const session = await getServerSession(authOptions);
  if (session && session.user && session.user.id) {
    redirect(searchParams.callbackUrl || "/");
  }
  return <SigninClient searchParams={searchParams} signinErrors={signinErrors} />;
}
