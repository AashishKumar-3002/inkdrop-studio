import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isSingleUserMode } from "@/lib/localUser";
import ProductLanding from "@/components/marketing/ProductLanding";

export { metadata } from "./website/page";

export default async function LandingPage() {
  // Desktop opens the library; signed-in hosted users resume their workspace.
  if (isSingleUserMode()) redirect("/dashboard");
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  return <ProductLanding />;
}
