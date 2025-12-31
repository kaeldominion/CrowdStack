"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UserAssignmentPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the main users page which has assignment functionality
    router.replace("/admin/users");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-secondary">Redirecting to User Management...</p>
    </div>
  );
}

