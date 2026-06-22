"use client";

import "../styles/AuthModal.css";
import "../styles/AuthHomeTheme.css";

import Image from "next/image";
import { createPortal } from "react-dom";
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  initialMode?: "login" | "register";
}

type AuthMode = "login" | "register" | "forgot";
type AuthStep = "form" | "otp" | "new-password";

const LIMITS = {
  otpCooldown: 60,
  closeDuration: 250,
  minPassword: 8,
  maxPassword: 128,
  maxName: 80,
  maxEmail: 254,
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizeName = (value: string) => value.trim().replace(/\s+/g, " ");
const isValidEmail = (value: string) =>
  value.length <= LIMITS.maxEmail && EMAIL_PATTERN.test(value);

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    const candidate = error as Error & {
      status?: number;
      code?: string;
      name?: string;
    };

    return {
      rawMessage: candidate.message.trim(),
      message: candidate.message.trim().toLowerCase(),
      status: candidate.status,
      code: candidate.code?.toLowerCase() ?? "",
      name: candidate.name?.toLowerCase() ?? "",
    };
  }

  if (typeof error === "object" && error !== null) {
    const candidate = error as {
      message?: unknown;
      status?: unknown;
      code?: unknown;
      name?: unknown;
    };

    const rawMessage =
      typeof candidate.message === "string"
        ? candidate.message.trim()
        : "";

    return {
      rawMessage,
      message: rawMessage.toLowerCase(),
      status:
        typeof candidate.status === "number"
          ? candidate.status
          : undefined,
      code:
        typeof candidate.code === "string"
          ? candidate.code.toLowerCase()
          : "",
      name:
        typeof candidate.name === "string"
          ? candidate.name.toLowerCase()
          : "",
    };
  }

  return {
    rawMessage: "",
    message: "",
    status: undefined as number | undefined,
    code: "",
    name: "",
  };
}

function getSafeAuthError(
  error: unknown,
  fallback = "Authentication failed. Please try again."
) {
  const { rawMessage, message, status, code } = getErrorDetails(error);

  if (rawMessage.startsWith("OTP_INVALID:")) {
    return (
      rawMessage.replace("OTP_INVALID:", "").trim() ||
      "The verification code is invalid or expired."
    );
  }

  if (rawMessage.startsWith("PASSWORD_SETUP:")) {
    return (
      rawMessage.replace("PASSWORD_SETUP:", "").trim() ||
      "Email verified, but the password could not be configured."
    );
  }

  if (
    status === 429 ||
    code.includes("over_request_rate_limit") ||
    message.includes("rate limit") ||
    message.includes("too many")
  ) {
    return "Too many attempts. Please wait a moment before trying again.";
  }

  if (
    code.includes("invalid_credentials") ||
    message.includes("invalid login credentials") ||
    message.includes("invalid credential") ||
    message.includes("wrong password")
  ) {
    return "Incorrect email or password.";
  }

  if (
    message.includes("email not confirmed") ||
    code.includes("email_not_confirmed")
  ) {
    return "Please verify your email before signing in.";
  }

  if (
    message.includes("user not found") ||
    message.includes("no user")
  ) {
    return "No account exists with this email address.";
  }

  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("offline") ||
    message.includes("failed to fetch")
  ) {
    return "Network error. Check your internet connection and try again.";
  }

  if (
    message.includes("expired") ||
    message.includes("invalid otp") ||
    message.includes("invalid token") ||
    code.includes("otp_expired")
  ) {
    return "The verification code is invalid or expired.";
  }

  if (
    message.includes("popup-closed-by-user") ||
    message.includes("popup closed")
  ) {
    return "Google sign-in was cancelled.";
  }

  if (
    message.includes("popup-blocked") ||
    message.includes("blocked")
  ) {
    return "The Google sign-in popup was blocked. Allow popups and try again.";
  }

  return rawMessage || fallback;
}

export default function AuthModal({
  open,
  onClose,
  initialMode = "login",
}: AuthModalProps) {
  const {
    currentUser,
    loading,
    login,
    loginWithEmail,
    sendEmailOtp,
    completeEmailOtpRegistration,
    sendPasswordResetEmail,
    updatePassword,
    passwordRecovery,
    clearPasswordRecovery,
  } = useAuth();
  const { showToast } = useToast();

  const titleId = useId();
  const descriptionId = useId();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [step, setStep] = useState<AuthStep>("form");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isClosing, setIsClosing] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const closingRef = useRef(false);
  const mountedRef = useRef(true);
  const otpRequestRef = useRef(false);
  const otpVerificationRef = useRef(false);

  const portalTarget = typeof document === "undefined" ? null : document.body;
  const effectiveOpen = open || passwordRecovery;
  const isBusy = submitting || googleSubmitting || isClosing;

  const clearMessages = useCallback(() => {
    setError("");
    setSuccess("");
  }, []);

  const resetForm = useCallback(() => {
    setMode(initialMode);
    setStep("form");
    setFullName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setOtp("");
    clearMessages();
    setSubmitting(false);
    setGoogleSubmitting(false);
    setResendCooldown(0);
    otpRequestRef.current = false;
    otpVerificationRef.current = false;
  }, [clearMessages, initialMode]);

  const showAuthError = useCallback(
    (authError: unknown, fallback: string) => {
      const message = getSafeAuthError(authError, fallback);
      setError(message);
      showToast(message, "error");
    },
    [showToast]
  );

  const startSmoothClose = useCallback(() => {
    if (closingRef.current) return;

    closingRef.current = true;
    setIsClosing(true);

    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }

    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      if (!mountedRef.current) return;

      resetForm();
      clearPasswordRecovery();
      closingRef.current = false;
      setIsClosing(false);
      onClose();
    }, LIMITS.closeDuration);
  }, [clearPasswordRecovery, onClose, resetForm]);

  const closeModal = useCallback(() => {
    if (!isBusy) startSmoothClose();
  }, [isBusy, startSmoothClose]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!effectiveOpen) {
      closingRef.current = false;
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [effectiveOpen]);

  useEffect(() => {
    if (!effectiveOpen || isClosing) return;
    const timer = window.setTimeout(() => firstInputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [effectiveOpen, mode, step, isClosing]);

  useEffect(() => {
    if (!effectiveOpen || resendCooldown <= 0) return;
    const timer = window.setTimeout(
      () => setResendCooldown((value) => Math.max(value - 1, 0)),
      1000
    );
    return () => window.clearTimeout(timer);
  }, [effectiveOpen, resendCooldown]);

  useEffect(() => {
    if (
      effectiveOpen &&
      !loading &&
      currentUser &&
      !passwordRecovery &&
      !closingRef.current
    ) {
      startSmoothClose();
    }
  }, [
    effectiveOpen,
    loading,
    currentUser,
    passwordRecovery,
    startSmoothClose,
  ]);

  useEffect(() => {
    if (!passwordRecovery) return;

    const timer = window.setTimeout(() => {
      setMode("forgot");
      setStep("new-password");
      setPassword("");
      setConfirmPassword("");
      clearMessages();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [passwordRecovery, clearMessages]);

  const switchMode = (nextMode: AuthMode) => {
    if (isBusy) return;
    setMode(nextMode);
    setStep("form");
    setFullName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setOtp("");
    setResendCooldown(0);
    clearMessages();
  };

  const validateLogin = () => {
    const cleanEmail = normalizeEmail(email);
    if (!isValidEmail(cleanEmail)) return "Please enter a valid email address.";
    if (!password) return "Please enter your password.";
    if (password.length > LIMITS.maxPassword) return "The password is too long.";
    return null;
  };

  const validateRegistration = () => {
    const cleanName = normalizeName(fullName);
    const cleanEmail = normalizeEmail(email);

    if (cleanName.length < 2 || cleanName.length > LIMITS.maxName) {
      return `Enter a name between 2 and ${LIMITS.maxName} characters.`;
    }
    if (!isValidEmail(cleanEmail)) return "Please enter a valid email address.";
    if (password.length < LIMITS.minPassword) {
      return `Password must contain at least ${LIMITS.minPassword} characters.`;
    }
    if (password.length > LIMITS.maxPassword) {
      return `Password cannot exceed ${LIMITS.maxPassword} characters.`;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return "Password must contain at least one letter and one number.";
    }
    return null;
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isBusy) return;

    const cleanEmail = normalizeEmail(email);
    const validationError = validateLogin();

    if (validationError) {
      setError(validationError);
      setSuccess("");
      return;
    }

    setEmail(cleanEmail);
    setSubmitting(true);
    clearMessages();

    try {
      await loginWithEmail(cleanEmail, password);

      if (!mountedRef.current) return;

      showToast("Signed in successfully", "success");

      // The currentUser effect closes the modal after authentication.
      // Avoid calling startSmoothClose here as well, which can cause
      // duplicate close transitions during a successful login.
    } catch (authError) {
      if (!mountedRef.current) return;

      const message = getSafeAuthError(
        authError,
        "Unable to sign in. Please check your details."
      );

      setError(message);
      setSuccess("");
      showToast(message, "error");

      // Keep the email so the user only needs to re-enter the password.
      setPassword("");
    } finally {
      if (mountedRef.current && !closingRef.current) {
        setSubmitting(false);
      }
    }
  };

  const handleSendRegistrationOtp = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (isBusy || otpRequestRef.current || resendCooldown > 0) return;

    const validationError = validateRegistration();
    if (validationError) {
      setError(validationError);
      setSuccess("");
      return;
    }

    const cleanName = normalizeName(fullName);
    const cleanEmail = normalizeEmail(email);

    otpRequestRef.current = true;
    setSubmitting(true);
    clearMessages();

    try {
      await sendEmailOtp(cleanEmail);
      if (!mountedRef.current) return;

      setFullName(cleanName);
      setEmail(cleanEmail);
      setOtp("");
      setStep("otp");
      setResendCooldown(LIMITS.otpCooldown);
      setSuccess(`An 8-digit verification code was sent to ${cleanEmail}.`);
      showToast("Verification code sent to your email", "success");
    } catch (authError) {
      if (mountedRef.current) {
        showAuthError(authError, "Unable to send the verification code.");
      }
    } finally {
      otpRequestRef.current = false;
      if (mountedRef.current) setSubmitting(false);
    }
  };

  const handleVerifyRegistrationOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isBusy || otpVerificationRef.current) return;

    const cleanOtp = otp.replace(/\D/g, "");
    if (!/^\d{8}$/.test(cleanOtp)) {
      setError("Enter the complete 8-digit verification code.");
      setSuccess("");
      return;
    }

    otpVerificationRef.current = true;
    setSubmitting(true);
    clearMessages();

    try {
      await completeEmailOtpRegistration(
        normalizeName(fullName),
        normalizeEmail(email),
        password,
        cleanOtp
      );

      if (!mountedRef.current) return;
      showToast("Account verified and created successfully", "success");
      startSmoothClose();
    } catch (authError) {
      if (mountedRef.current) {
        const rawMessage =
          authError instanceof Error ? authError.message : "";

        if (rawMessage.startsWith("OTP_INVALID:")) {
          setOtp("");
          const details = rawMessage.replace("OTP_INVALID:", "").trim();
          const message =
            details || "The verification code is invalid or expired.";

          setError(message);
          showToast(message, "error");
        } else if (rawMessage.startsWith("PASSWORD_SETUP:")) {
          const details = rawMessage.replace("PASSWORD_SETUP:", "").trim();
          const message =
            details ||
            "Email verified, but the password could not be configured.";

          setError(message);
          showToast(message, "error");
        } else {
          const message =
            rawMessage ||
            "Verification succeeded, but account setup could not be completed.";

          setError(message);
          showToast(message, "error");
        }
      }
    } finally {
      otpVerificationRef.current = false;
      if (mountedRef.current && !closingRef.current) setSubmitting(false);
    }
  };

  const handleForgotPassword = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (isBusy) return;

    const cleanEmail = normalizeEmail(email);

    if (!isValidEmail(cleanEmail)) {
      setError("Please enter a valid email address.");
      setSuccess("");
      return;
    }

    setSubmitting(true);
    clearMessages();

    try {
      await sendPasswordResetEmail(cleanEmail);

      if (!mountedRef.current) return;

      setEmail(cleanEmail);
      setSuccess(
        "Password reset link sent. Open the link from your email to create a new password."
      );
      showToast("Password reset link sent", "success");
    } catch (authError) {
      if (mountedRef.current) {
        showAuthError(authError, "Unable to send the password reset link.");
      }
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  };

  const handleUpdatePassword = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (isBusy) return;

    if (password.length < LIMITS.minPassword) {
      setError(
        `Password must contain at least ${LIMITS.minPassword} characters.`
      );
      setSuccess("");
      return;
    }

    if (password.length > LIMITS.maxPassword) {
      setError(`Password cannot exceed ${LIMITS.maxPassword} characters.`);
      setSuccess("");
      return;
    }

    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError("Password must contain at least one letter and one number.");
      setSuccess("");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setSuccess("");
      return;
    }

    setSubmitting(true);
    clearMessages();

    try {
      await updatePassword(password);

      if (!mountedRef.current) return;

      showToast("Password updated successfully", "success");
      setSuccess("Your password has been updated successfully.");
      window.setTimeout(() => startSmoothClose(), 500);
    } catch (authError) {
      if (mountedRef.current) {
        showAuthError(authError, "Unable to update your password.");
      }
    } finally {
      if (mountedRef.current && !closingRef.current) {
        setSubmitting(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    if (isBusy || loading) return;

    if (currentUser) {
      showToast("You are already signed in", "success");
      startSmoothClose();
      return;
    }

    setGoogleSubmitting(true);
    clearMessages();

    try {
      const googleLogin = login();
      startSmoothClose();
      await googleLogin;
      if (!mountedRef.current) return;

      showToast("Signed in successfully", "success");
    } catch (authError) {
      if (mountedRef.current) {
        showAuthError(authError, "Google sign-in could not be completed.");
      }
    } finally {
      if (mountedRef.current && !closingRef.current) {
        setGoogleSubmitting(false);
      }
    }
  };

  const handleModalKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.key !== "Tab" || !modalRef.current) return;

    const elements = Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => element.offsetParent !== null);

    if (!elements.length) {
      event.preventDefault();
      modalRef.current.focus();
      return;
    }

    const first = elements[0];
    const last = elements[elements.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };



  if (!effectiveOpen || !portalTarget) return null;

  const modalTitle =
    step === "otp"
      ? "Verify your email"
      : step === "new-password"
        ? "Create new password"
        : mode === "register"
          ? "Create your account"
          : mode === "forgot"
            ? "Forgot password"
            : "Sign in to ClimbUP";

  const modalDescription =
    step === "otp"
      ? `Enter the 8-digit verification code sent to ${email}.`
      : step === "new-password"
        ? "Enter and confirm your new secure password."
        : mode === "register"
          ? "Create your account and verify your email securely."
          : mode === "forgot"
            ? "Enter your email and we will send you a secure reset link."
            : "Welcome back. Sign in using your email and password.";

  return createPortal(
    <div
      id="auth-modal"
      className={`auth-modal-overlay ${isClosing ? "auth-modal-overlay-closing" : ""}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}
    >
      <div className="auth-modal-wrapper">
        <div
          ref={modalRef}
          className={`auth-modal ${isClosing ? "auth-modal-closing" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          aria-busy={isBusy}
          tabIndex={-1}
          onKeyDown={handleModalKeyDown}
        >
          <button
            type="button"
            className="auth-modal-close"
            onClick={closeModal}
            disabled={isBusy}
            aria-label="Close authentication dialog"
          >
            <span aria-hidden="true">×</span>
          </button>

          <div className="auth-brand">
            <Image
              className="auth-logo-image"
              src="/logo.png"
              alt="ClimbUP logo"
              width={76}
              height={76}
              priority
            />
          </div>

          <h2 id={titleId} className="auth-title">{modalTitle}</h2>
          <p id={descriptionId} className="auth-description">{modalDescription}</p>

          <div className="auth-trust-tags" aria-label="Account security information">
            <span>Privacy protected</span>
          </div>

          <div className="auth-message-container" aria-live="polite" aria-atomic="true">
            {error && <div className="auth-error" role="alert">{error}</div>}
            {success && <div className="auth-success" role="status">{success}</div>}
          </div>

          {step === "form" ? (
            <form
              className="auth-form"
              onSubmit={
                mode === "register"
                  ? handleSendRegistrationOtp
                  : mode === "forgot"
                    ? handleForgotPassword
                    : handleLogin
              }
              noValidate
            >
              {mode === "register" && (
                <label className="auth-label">
                  <span>Full name</span>
                  <input
                    ref={firstInputRef}
                    className="auth-input"
                    type="text"
                    value={fullName}
                    onChange={(event) => {
                      setFullName(event.target.value.slice(0, LIMITS.maxName));
                      clearMessages();
                    }}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={LIMITS.maxName}
                    disabled={isBusy}
                    spellCheck={false}
                  />
                </label>
              )}

              <label className="auth-label">
                <span>Email address</span>
                <input
                  ref={mode !== "register" ? firstInputRef : undefined}
                  className="auth-input"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value.slice(0, LIMITS.maxEmail));
                    clearMessages();
                  }}
                  placeholder="you@example.com"
                  autoComplete={mode === "login" ? "username" : "email"}
                  inputMode="email"
                  required
                  maxLength={LIMITS.maxEmail}
                  disabled={isBusy}
                  spellCheck={false}
                  autoCapitalize="none"
                />
              </label>

              {mode !== "forgot" && (
                <label className="auth-label">
                  <span>Password</span>
                  <input
                    className="auth-input"
                    type="password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value.slice(0, LIMITS.maxPassword));
                      clearMessages();
                    }}
                    placeholder={mode === "register" ? "At least 8 characters" : "Enter your password"}
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                    required
                    minLength={mode === "register" ? LIMITS.minPassword : 1}
                    maxLength={LIMITS.maxPassword}
                    disabled={isBusy}
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </label>
              )}

              {mode === "login" && (
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "-8px",
                    marginBottom: "8px",
                  }}
                >
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => switchMode("forgot")}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#2563eb",
                      padding: 0,
                      fontSize: "14px",
                      fontWeight: 700,
                      cursor: isBusy ? "not-allowed" : "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {mode === "register" && (
                <p className="auth-password-hint">
                  Use at least 8 characters containing a letter and a number.
                </p>
              )}

              <button className="auth-primary-button" type="submit" disabled={isBusy}>
                {submitting
                  ? mode === "register"
                    ? "Sending verification code..."
                    : mode === "forgot"
                      ? "Sending reset link..."
                      : "Signing in..."
                  : mode === "register"
                    ? "Send verification code"
                    : mode === "forgot"
                      ? "Send reset link"
                      : "Sign in"}
              </button>
            </form>
          ) : step === "new-password" ? (
            <form className="auth-form" onSubmit={handleUpdatePassword} noValidate>
              <label className="auth-label">
                <span>New password</span>
                <input
                  ref={firstInputRef}
                  className="auth-input"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value.slice(0, LIMITS.maxPassword));
                    clearMessages();
                  }}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  required
                  minLength={LIMITS.minPassword}
                  maxLength={LIMITS.maxPassword}
                  disabled={isBusy}
                />
              </label>

              <label className="auth-label">
                <span>Confirm new password</span>
                <input
                  className="auth-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(
                      event.target.value.slice(0, LIMITS.maxPassword)
                    );
                    clearMessages();
                  }}
                  placeholder="Re-enter your new password"
                  autoComplete="new-password"
                  required
                  minLength={LIMITS.minPassword}
                  maxLength={LIMITS.maxPassword}
                  disabled={isBusy}
                />
              </label>

              <p className="auth-password-hint">
                Use at least 8 characters containing a letter and a number.
              </p>

              <button
                className="auth-primary-button"
                type="submit"
                disabled={
                  isBusy ||
                  password.length < LIMITS.minPassword ||
                  confirmPassword.length < LIMITS.minPassword
                }
              >
                {submitting ? "Updating password..." : "Update password"}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleVerifyRegistrationOtp} noValidate>
              <label className="auth-label">
                <span>Verification code</span>
                <input
                  ref={firstInputRef}
                  className="auth-input auth-otp-input"
                  type="text"
                  value={otp}
                  onChange={(event) => {
                    setOtp(event.target.value.replace(/\D/g, "").slice(0, 8));
                    clearMessages();
                  }}
                  placeholder="00000000"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  enterKeyHint="done"
                  required
                  minLength={8}
                  maxLength={8}
                  pattern="[0-9]{8}"
                  disabled={isBusy}
                  aria-label="Eight-digit email verification code"
                />
              </label>

              <button
                className="auth-primary-button"
                type="submit"
                disabled={isBusy || otp.length !== 8}
              >
                {submitting ? "Verifying..." : "Verify and create account"}
              </button>

              <div className="auth-otp-actions">
                <button
                  type="button"
                  className="auth-text-button"
                  disabled={isBusy}
                  onClick={() => {
                    setStep("form");
                    setOtp("");
                    setResendCooldown(0);
                    clearMessages();
                  }}
                >
                  Change email
                </button>

                <button
                  type="button"
                  className="auth-text-button"
                  onClick={() => handleSendRegistrationOtp()}
                  disabled={isBusy || resendCooldown > 0}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}

          {step === "form" && (
            <>
              <div className="auth-divider" aria-hidden="true"><span>or</span></div>

              <button
                type="button"
                className="auth-text-button auth-mode-switch"
                disabled={isBusy}
                onClick={() =>
                  switchMode(
                    mode === "forgot"
                      ? "login"
                      : mode === "login"
                        ? "register"
                        : "login"
                  )
                }
              >
                {mode === "forgot"
                  ? "Back to sign in"
                  : mode === "register"
                    ? "Already have an account? Sign in"
                    : "New here? Create an account"}
              </button>

              <button
                className="auth-google-button"
                onClick={handleGoogleLogin}
                disabled={isBusy || loading}
                type="button"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {loading
                  ? "Checking session..."
                  : googleSubmitting
                    ? "Connecting securely..."
                    : "Continue with Google"}
              </button>
            </>
          )}

          <p className="auth-terms">
            By continuing, you agree to our{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer">Terms</a>{" "}
            and{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>,
    portalTarget
  );
}
