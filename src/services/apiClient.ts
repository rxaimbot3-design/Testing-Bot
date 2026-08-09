let inMemoryToken: string | null = null;

// Clear any legacy insecure localStorage token on module load
try {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("admin_session_token");
  }
} catch {}

export function getAdminToken(): string | null {
  return inMemoryToken;
}

export function setAdminToken(token: string): void {
  inMemoryToken = token;
}

export function clearAdminToken(): void {
  inMemoryToken = null;
}

export async function apiFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const token = getAdminToken();
  const headers = new Headers(init?.headers || {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    credentials: "same-origin",
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    // Notify application if unauthorized on protected routes
    const urlString = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (!urlString.includes("/api/auth/session") && !urlString.includes("/api/auth/login")) {
      window.dispatchEvent(new CustomEvent("auth:unauthorized", { detail: { status: response.status, url: urlString } }));
    }
  }

  return response;
}

export async function checkSession(): Promise<{ authenticated: boolean; username?: string }> {
  try {
    const res = await apiFetch("/api/auth/session");
    if (res.ok) {
      const data = await res.json();
      return { authenticated: !!data.authenticated, username: data.username };
    }
  } catch (err) {
    console.error("Session check error:", err);
  }
  return { authenticated: false };
}

export async function loginWithAdminKey(adminKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ adminKey }),
    });

    const data = await res.json();
    if (res.ok && data.success && data.token) {
      setAdminToken(data.token);
      return { success: true };
    }
    return { success: false, error: data.error || "Invalid Admin Key" };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error during login" };
  }
}

export async function logoutAdmin(): Promise<void> {
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } catch (err) {
    console.error("Logout error:", err);
  } finally {
    clearAdminToken();
  }
}



export async function loginWithDiscordToken(accessToken: string): Promise<{ success: boolean; token?: string; user?: any; error?: string }> {
  try {
    const res = await fetch("/api/auth/discord/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ accessToken }),
    });
    const data = await res.json();
    if (data.success && data.token) {
      setAdminToken(data.token);
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
