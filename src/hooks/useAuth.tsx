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

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) throw sessionError;

    if (session?.user) {
      setCurrentUser(session.user);
      await loadUserProfile(session.user);
      return;
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthRedirectUrl(window.location.origin),
        queryParams: {
          access_type: "online",
        },
      },
    });

    if (error) throw error;

    if (data.url) {
      window.location.assign(data.url);
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
