"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AuthChangeEvent,
  Session,
  User as SupabaseUser,
} from "@supabase/supabase-js";

import { useToast } from "@/hooks/useToast";
import { createClient } from "@/lib/supabase/client";
import {
  getAuthRedirectUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

interface AuthContextValue {
  currentUser: SupabaseUser | null;
  profileImage: string | null;
  loading: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  sendEmailOtp: (email: string) => Promise<void>;
  completeEmailOtpRegistration: (
    fullName: string,
    email: string,
    password: string,
    otp: string
  ) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  passwordRecovery: boolean;
  clearPasswordRecovery: () => void;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

interface UserProfileRow {
  profile_image: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function assertSupabaseConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Add your public Supabase URL and anon key, then restart the app."
    );
  }
}

function getMetadataImage(user: SupabaseUser | null): string | null {
  if (!user) return null;

  const avatarUrl = user.user_metadata?.avatar_url;
  const picture = user.user_metadata?.picture;

  if (typeof avatarUrl === "string" && avatarUrl.trim()) {
    return avatarUrl.trim();
  }

  if (typeof picture === "string" && picture.trim()) {
    return picture.trim();
  }

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const mountedRef = useRef(true);
  const completingOtpSignupRef = useRef(false);

  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const loadUserProfile = useCallback(
    async (user: SupabaseUser | null) => {
      if (!user) {
        if (mountedRef.current) setProfileImage(null);
        return;
      }

      const fallbackImage = getMetadataImage(user);

      try {
        const { data, error } = await supabase
          .from("users")
          .select("profile_image")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!mountedRef.current) return;

        if (error) {
          setProfileImage(fallbackImage);
          return;
        }

        const profile = data as UserProfileRow | null;
        const databaseImage =
          typeof profile?.profile_image === "string"
            ? profile.profile_image.trim()
            : "";

        setProfileImage(databaseImage || fallbackImage);
      } catch {
        if (mountedRef.current) {
          setProfileImage(fallbackImage);
        }
      }
    },
    [supabase]
  );

  const refreshProfile = useCallback(async () => {
    await loadUserProfile(currentUser);
  }, [currentUser, loadUserProfile]);

  useEffect(() => {
    mountedRef.current = true;
    let active = true;

    const restoreSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;
        if (!active || !mountedRef.current) return;

        const user = session?.user ?? null;
        setCurrentUser(user);
        await loadUserProfile(user);
      } catch (error) {
        console.error("Unable to restore session:", error);

        if (active && mountedRef.current) {
          setCurrentUser(null);
          setProfileImage(null);
        }
      } finally {
        if (active && mountedRef.current) {
          setLoading(false);
        }
      }
    };

    void restoreSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (!active || !mountedRef.current) return;

        if (event === "PASSWORD_RECOVERY") {
          setPasswordRecovery(true);
        }

        const user = session?.user ?? null;

        if (completingOtpSignupRef.current && user) {
          setLoading(false);
          return;
        }

        setCurrentUser(user);
        setLoading(false);

        // Run outside the auth callback to avoid blocking Supabase auth events.
        window.setTimeout(() => {
          void loadUserProfile(user);
        }, 0);
      }
    );

    return () => {
      active = false;
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [loadUserProfile, supabase]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const didSignIn = params.get("signed_in") === "1";
    const authError = params.get("auth_error");

    if (didSignIn) {
      showToast("Welcome back!", "success");
      params.delete("signed_in");
    }

    if (authError) {
      showToast(`Sign-in failed: ${decodeURIComponent(authError)}`, "error");
      params.delete("auth_error");
    }

    if (didSignIn || authError) {
      const query = params.toString();

      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}`
      );
    }
  }, [showToast]);

  const login = useCallback(async () => {
    assertSupabaseConfigured();

    const popupWidth = 520;
    const popupHeight = 680;
    const popupLeft = Math.max(
      0,
      window.screenX + (window.outerWidth - popupWidth) / 2
    );
    const popupTop = Math.max(
      0,
      window.screenY + (window.outerHeight - popupHeight) / 2
    );
    const popup = window.open(
      "about:blank",
      "climbup-google-auth",
      `popup=yes,width=${popupWidth},height=${popupHeight},left=${Math.round(
        popupLeft
      )},top=${Math.round(popupTop)},resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      throw new Error(
        "The Google sign-in popup was blocked. Allow popups and try again."
      );
    }

    popup.document.title = "Connecting to Google...";

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (session?.user) {
        popup.close();
        setCurrentUser(session.user);
        await loadUserProfile(session.user);
        return;
      }

      document.cookie =
        "climbup_oauth_popup=1; Path=/; Max-Age=300; SameSite=Lax";
      const callbackUrl = getAuthRedirectUrl(window.location.origin);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: "online",
            prompt: "select_account",
          },
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error("Google sign-in could not be started.");

      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const authChannel =
          typeof BroadcastChannel === "undefined"
            ? null
            : new BroadcastChannel("climbup-auth");

        const finish = (callback: () => void) => {
          if (settled) return;
          settled = true;
          window.removeEventListener("message", handleMessage);
          window.removeEventListener("storage", handleStorage);
          authChannel?.removeEventListener("message", handleChannelMessage);
          authChannel?.close();
          window.clearInterval(closedCheck);
          window.clearTimeout(timeout);
          callback();
        };

        const handleResult = (result: {
          type?: string;
          status?: string;
          message?: string;
        }) => {
          if (result?.type !== "climbup:oauth") return;

          if (result.status === "success") {
            finish(resolve);
            return;
          }

          finish(() =>
            reject(
              new Error(result.message || "Google sign-in was not completed.")
            )
          );
        };

        const handleMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (event.source !== popup) return;
          handleResult(event.data);
        };

        const handleChannelMessage = (event: MessageEvent) => {
          handleResult(event.data);
        };

        const handleStorage = (event: StorageEvent) => {
          if (event.key !== "climbup:oauth:result" || !event.newValue) return;

          try {
            handleResult(JSON.parse(event.newValue));
          } catch {
            // Ignore malformed cross-window messages.
          }
        };

        const closedCheck = window.setInterval(() => {
          if (popup.closed) {
            finish(() => reject(new Error("Google sign-in window was closed.")));
          }
        }, 500);

        const timeout = window.setTimeout(() => {
          popup.close();
          finish(() => reject(new Error("Google sign-in timed out. Please try again.")));
        }, 120000);

        window.addEventListener("message", handleMessage);
        window.addEventListener("storage", handleStorage);
        authChannel?.addEventListener("message", handleChannelMessage);
        window.localStorage.removeItem("climbup:oauth:result");
        popup.location.replace(data.url);
      });

      const {
        data: { session: signedInSession },
        error: signedInSessionError,
      } = await supabase.auth.getSession();

      if (signedInSessionError) throw signedInSessionError;
      if (!signedInSession?.user) {
        throw new Error("Google sign-in completed, but the session was not restored.");
      }

      setCurrentUser(signedInSession.user);
      await loadUserProfile(signedInSession.user);
    } catch (error) {
      if (!popup.closed) popup.close();
      throw error;
    } finally {
      document.cookie =
        "climbup_oauth_popup=; Path=/; Max-Age=0; SameSite=Lax";
    }
  }, [loadUserProfile, supabase]);

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      assertSupabaseConfigured();

      const cleanEmail = email.trim().toLowerCase();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) throw error;

      setCurrentUser(data.user);
      await loadUserProfile(data.user);
    },
    [loadUserProfile, supabase]
  );

  const sendEmailOtp = useCallback(
    async (email: string) => {
      assertSupabaseConfigured();

      const cleanEmail = email.trim().toLowerCase();

      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
          data: {
            email_signup_method: "otp",
          },
        },
      });

      if (error) throw error;
    },
    [supabase]
  );

  const completeEmailOtpRegistration = useCallback(
    async (
      fullName: string,
      email: string,
      password: string,
      otp: string
    ) => {
      assertSupabaseConfigured();
      completingOtpSignupRef.current = true;

      const cleanEmail = email.trim().toLowerCase();
      const cleanOtp = otp.replace(/\D/g, "").trim();

      try {
        // 1. Verify the OTP only.
        const { data: verified, error: otpError } =
          await supabase.auth.verifyOtp({
            email: cleanEmail,
            token: cleanOtp,
            type: "email",
          });

        if (otpError) {
          throw new Error(`OTP_INVALID:${otpError.message}`);
        }

        if (!verified.user) {
          throw new Error(
            "OTP_INVALID:Verification completed but no authenticated user was returned."
          );
        }

        // 2. Configure password and metadata after OTP verification.
        const { data: updated, error: updateError } =
          await supabase.auth.updateUser({
            password,
            data: {
              full_name: fullName,
              name: fullName,
              email_signup_method: "otp",
            },
          });

        if (updateError) {
          throw new Error(`PASSWORD_SETUP:${updateError.message}`);
        }

        const finalUser = updated.user ?? verified.user;
        const metadataImage = getMetadataImage(finalUser);

        // 3. Profile creation must not be reported as an OTP failure.
        const { error: profileError } = await supabase.from("users").upsert(
          {
            user_id: finalUser.id,
            full_name: fullName,
            email: cleanEmail,
            profile_image: metadataImage,
            reputation: 0,
          },
          { onConflict: "user_id" }
        );

        if (profileError) {
          // Profile creation is optional and must never fail authentication.
          // The user remains authenticated even if the public profile table
          // is temporarily unavailable or its RLS policy is not configured.
        }

        if (mountedRef.current) {
          setCurrentUser(finalUser);
          setProfileImage(metadataImage);
        }

        // Only query the profile table when the upsert succeeded.
        if (!profileError) {
          await loadUserProfile(finalUser);
        }
      } catch (error) {
        // Do not convert profile/password errors into a fake invalid-OTP message.
        if (
          error instanceof Error &&
          error.message.startsWith("OTP_INVALID:")
        ) {
          await supabase.auth.signOut();

          if (mountedRef.current) {
            setCurrentUser(null);
            setProfileImage(null);
          }
        }

        throw error;
      } finally {
        completingOtpSignupRef.current = false;
      }
    },
    [loadUserProfile, supabase]
  );

  const sendPasswordResetEmail = useCallback(
    async (email: string) => {
      assertSupabaseConfigured();

      const cleanEmail = email.trim().toLowerCase();
      const redirectTo =
        typeof window !== "undefined" ? window.location.origin : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        redirectTo ? { redirectTo } : undefined
      );

      if (error) throw error;
    },
    [supabase]
  );

  const updatePassword = useCallback(
    async (password: string) => {
      assertSupabaseConfigured();

      const { data, error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      if (mountedRef.current) {
        setCurrentUser(data.user);
        setPasswordRecovery(false);
      }
    },
    [supabase]
  );

  const clearPasswordRecovery = useCallback(() => {
    setPasswordRecovery(false);
  }, []);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    setCurrentUser(null);
    setProfileImage(null);
    setPasswordRecovery(false);
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      profileImage,
      loading,
      login,
      loginWithEmail,
      sendEmailOtp,
      completeEmailOtpRegistration,
      sendPasswordResetEmail,
      updatePassword,
      passwordRecovery,
      clearPasswordRecovery,
      refreshProfile,
      logout,
    }),
    [
      currentUser,
      profileImage,
      loading,
      login,
      loginWithEmail,
      sendEmailOtp,
      completeEmailOtpRegistration,
      sendPasswordResetEmail,
      updatePassword,
      passwordRecovery,
      clearPasswordRecovery,
      refreshProfile,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
