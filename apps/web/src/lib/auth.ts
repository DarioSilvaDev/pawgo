import {
  LoginDto,
  RegisterDto,
  AuthResponse,
  RefreshTokenDto,
} from "@pawgo/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Token storage keys
const ACCESS_TOKEN_KEY = "pawgo_access_token";
const REFRESH_TOKEN_KEY = "pawgo_refresh_token";
const USER_KEY = "pawgo_user";

/**
 * Get access token from localStorage
 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Get refresh token from localStorage
 */
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Get user data from localStorage
 */
export function getUser(): AuthResponse["user"] | null {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (e) {
    // Corrupted localStorage state (e.g. old schema). Don't crash the app.
    clearAuthData();
    return null;
  }
}

/**
 * Save tokens and user data to localStorage
 */
export function saveAuthData(data: AuthResponse): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

/**
 * Clear auth data from localStorage
 */
export function clearAuthData(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

/**
 * Get authorization header
 */
export function getAuthHeader(): string | null {
  const token = getAccessToken();
  return token ? `Bearer ${token}` : null;
}

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Refresh access token
 */
async function refreshAccessToken(): Promise<boolean> {
  // If already refreshing, wait for the existing promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearAuthData();
    return false;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        clearAuthData();
        // Trigger logout event
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("auth:logout"));
        }
        return false;
      }

      const data = await response.json();
      const currentUser = getUser();

      if (currentUser) {
        saveAuthData({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresIn: data.expiresIn,
          user: currentUser,
        });
        return true;
      }

      clearAuthData();
      return false;
    } catch (error) {
      console.error("Error refreshing token:", error);
      clearAuthData();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:logout"));
      }
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * API call with authentication and automatic token refresh
 */
export async function fetchAPI(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const authHeader = getAuthHeader();

  // Only add Content-Type if there's a body
  const hasBody = options.body !== undefined && options.body !== null && options.body !== "";
  const headers: HeadersInit = {
    ...(hasBody && { "Content-Type": "application/json" }),
    ...(authHeader && { Authorization: authHeader }),
    ...options.headers,
  };

  let response = await fetch(`${API_URL}/api${endpoint}`, {
    ...options,
    headers,
  });

  // If unauthorized, try to refresh token (but not if this is already a refresh request)
  if (
    response.status === 401 &&
    authHeader &&
    !endpoint.includes("/auth/refresh")
  ) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Retry request with new token
      const newAuthHeader = getAuthHeader();
      response = await fetch(`${API_URL}/api${endpoint}`, {
        ...options,
        headers: {
          ...headers,
          Authorization: newAuthHeader || "",
        },
      });
    } else {
      // If refresh failed, clear auth data and trigger logout
      clearAuthData();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:logout"));
      }
    }
  }

  return response;
}

/**
 * Auth API functions
 */
export const authAPI = {
  /**
   * Register a new user
   * Returns message and email - no tokens until email is verified
   */
  async register(data: RegisterDto): Promise<{
    message: string;
    email: string;
  }> {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: "Error desconocido",
      }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    // Don't save auth data - user must verify email first
    return result;
  },

  /**
   * Login user
   */
  async login(data: LoginDto): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: "Credenciales inválidas",
      }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    saveAuthData(result);
    return result;
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        });
      } catch (error) {
        // Ignore errors on logout
      }
    }
    clearAuthData();
  },

  /**
   * Logout from all devices
   */
  async logoutAll(): Promise<void> {
    try {
      await fetchAPI("/auth/logout-all", {
        method: "POST",
      });
    } catch (error) {
      // Ignore errors
    }
    clearAuthData();
  },

  /**
   * Get authenticated user data
   */
  async getMe(): Promise<AuthResponse["user"] | null> {
    try {
      const response = await fetchAPI("/auth/me");
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      return null;
    }
  },

  /**
   * Request password reset email
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: "Error al enviar el email",
      }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: "Error al restablecer la contraseña",
      }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },
};

/**
 * Influencer API functions
 */
export const influencerAPI = {
  /**
   * Get influencer dashboard
   */
  async getDashboard() {
    const response = await fetchAPI("/influencers/me/dashboard");
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: "Error desconocido",
      }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Get influencer commissions
   */
  async getCommissions(filters?: {
    status?: "pending" | "paid" | "cancelled";
    startDate?: string;
    endDate?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);

    const query = params.toString();
    const endpoint = `/influencers/me/commissions${query ? `?${query}` : ""}`;

    const response = await fetchAPI(endpoint);
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: "Error desconocido",
      }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Get discount codes
   */
  async getDiscountCodes() {
    const response = await fetchAPI("/influencers/me/discount-codes");
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: "Error desconocido",
      }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Get influencer profile
   */
  async getProfile() {
    const response = await fetchAPI("/influencers/me");
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: "Error desconocido",
      }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
};
