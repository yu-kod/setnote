export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}

async function authRequest<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/auth${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    throw new AuthError(res.statusText || "サーバーエラーが発生しました", "UNKNOWN", res.status);
  }

  if (!res.ok) {
    const error = data.error as Record<string, string> | undefined;
    throw new AuthError(error?.message ?? "Unknown error", error?.code ?? "UNKNOWN", res.status);
  }

  return data as T;
}

export function signup(email: string, password: string, username: string): Promise<void> {
  return authRequest("/signup", { email, password, username });
}

export function confirmEmail(email: string, code: string): Promise<void> {
  return authRequest("/confirm", { email, code });
}

type SigninResponse = {
  accessToken: string;
  idToken: string;
  refreshToken: string;
};

export function resendCode(email: string): Promise<void> {
  return authRequest("/resend-code", { email });
}

export function signin(email: string, password: string): Promise<SigninResponse> {
  return authRequest<SigninResponse>("/signin", { email, password });
}
