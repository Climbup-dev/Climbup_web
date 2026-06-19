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
import { createClient } from "@/lib/supabase/client";
import { getAuthRedirectUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import { useToast } from "@/hooks/useToast";

interface AuthContextValue {
  currentUser: SupabaseUser | null;
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
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function assertSupabaseConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Add your public Supabase URL and anon key, then restart the app."
    );
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const completingOtpSignupRef = useRef(false);
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }: { data: { session: Session | null } }) => {
        if (!mounted) return;
        setCurrentUser(data.session?.user ?? null);
      })
      .catch(() => {
        if (mounted) setCurrentUser(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (completingOtpSignupRef.current && session?.user) {
          setLoading(false);
          return;
        }

        setCurrentUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const didSignIn = params.get("signed_in") === "1";
    const authErr = params.get("auth_error");

    if (didSignIn) {
      showToast("Welcome back!", "success");
      params.delete("signed_in");
    }

    if (authErr) {
      showToast(`Sign-in failed: ${decodeURIComponent(authErr)}`, "error");
      params.delete("auth_error");
    }

    if (didSignIn || authErr) {
      const next = params.toString();
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${next ? `?${next}` : ""}`
      );
    }
  }, [showToast]);

  const login = useCallback(async () => {
    assertSupabaseConfigured();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthRedirectUrl(window.location.origin),
        queryParams: {
          access_type: "online",
          prompt: "consent",
        },
      },
    });

    if (error) throw error;
    if (data?.url) window.location.href = data.url;
  }, [supabase]);

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      assertSupabaseConfigured();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (data.user) setCurrentUser(data.user);
    },
    [supabase]
  );

  const sendEmailOtp = useCallback(
    async (email: string) => {
      assertSupabaseConfigured();

      const { error } = await supabase.auth.signInWithOtp({
        email,
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
    async (fullName: string, email: string, password: string, otp: string) => {
      assertSupabaseConfigured();
      completingOtpSignupRef.current = true;

      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: "email",
        });

        if (error) throw error;
        if (!data.user) {
          throw new Error("OTP verification succeeded, but no user was returned.");
        }

        const { error: profileError } = await supabase.from("users").upsert(
          {
            user_id: data.user.id,
            full_name: fullName,
            email,
            profile_image: data.user.user_metadata?.avatar_url || null,
            reputation: 0,
          },
          { onConflict: "user_id" }
        );

        if (profileError) throw profileError;

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
          await supabase
            .from("users")
            .delete()
            .eq("user_id", data.user.id);
          throw updateError;
        }

        setCurrentUser(updated.user ?? data.user);
      } catch (error) {
        await supabase.auth.signOut();
        throw error;
      } finally {
        completingOtpSignupRef.current = false;
      }
    },
    [supabase]
  );

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setCurrentUser(null);
  }, [supabase]);

  const value = useMemo(
    () => ({
      currentUser,
      loading,
      login,
      loginWithEmail,
      sendEmailOtp,
      completeEmailOtpRegistration,
      logout,
    }),
    [
      currentUser,
      loading,
      login,
      loginWithEmail,
      sendEmailOtp,
      completeEmailOtpRegistration,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
