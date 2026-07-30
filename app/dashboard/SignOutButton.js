"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { forgetIdentity } from "@/lib/events";

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    // Clear the cached identity before the session goes, or a shared device would
    // attribute the next person's events to whoever logged out.
    forgetIdentity();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button onClick={handleSignOut} className="text-sm text-gray-400 underline">
      Log out
    </button>
  );
}
