import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function LandingPage() {
  const session = await getSession();

  if (session) {
    if (session.role === "client") {
      redirect("/client");
    } else {
      redirect("/dashboard");
    }
  }

  redirect("/sign-in");
  return null;
}
