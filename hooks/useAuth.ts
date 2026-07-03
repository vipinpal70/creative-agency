import { useState, useEffect } from "react";

export interface User {
  id: string;
  email: string;
  role: string;
  roles?: string[];
  firstName?: string;
  lastName?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (err) {
        console.error("Failed to fetch user session", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMe();
  }, []);

  return { user, loading };
}
