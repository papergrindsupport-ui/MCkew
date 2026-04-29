import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LuX, LuLock, LuTicket, LuSparkles, LuCheck, LuLoader } from "react-icons/lu";
import toast from "react-hot-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAccountStore } from "@/stores/useAccountStore";
import { useAccountId } from "@/hooks/useAccountId";
import { useProStore } from "@/stores/useProStore";
import { SignInModal } from "@/components/auth/SignInModal";

const BASE_PRICE_CENTS = 999; // $9.99

declare global {
  interface Window {
    paypal?: any;
  }
}

let paypalSdkPromise: Promise<void> | null = null;
async function loadPayPalSdk(clientId: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.paypal) return;
  if (paypalSdkPromise) return paypalSdkPromise;
  paypalSdkPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      clientId,
    )}&currency=USD&intent=capture&disable-funding=credit,card`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load PayPal SDK"));
    document.head.appendChild(s);
  });
  return paypalSdkPromise;
}

export function UnlockModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const profile = useAccountStore((s) => s.profile);
  const accountId = useAccountId();
  const setPro = useProStore((s) => s.setPro);
  const isPro = useProStore((s) => s.isPro);

  const [showSignIn, setShowSignIn] = useState(false);
  const [code, setCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [paypalReady, setPaypalReady] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const buttonsContainerRef = useRef<HTMLDivElement | null>(null);
  const buttonsInstanceRef = useRef<any>(null);

  const finalCents = Math.max(0, Math.round(BASE_PRICE_CENTS * (1 - discountPercent / 100)));
  const finalDollars = (finalCents / 100).toFixed(2);
  const isFree = finalCents === 0;

  // Reset on open
  useEffect(() => {
    if (open) {
      setCode("");
      setDiscountPercent(0);
      setAppliedCode(null);
      setPaypalReady(false);
      setPaypalError(null);
    }
  }, [open]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  // Load PayPal SDK once we have an account & are not free
  useEffect(() => {
    if (!open || isFree || isPro) return;
    if (!accountId) {
      setPaypalError("Could not resolve your account. Please sign in again.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("paypal-config");
        if (error || !data?.clientId) throw new Error("PayPal not configured");
        await loadPayPalSdk(data.clientId);
        if (!cancelled) setPaypalReady(true);
      } catch (e) {
        if (!cancelled) setPaypalError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, accountId, isFree, isPro]);

  // Render PayPal buttons whenever they should change
  useEffect(() => {
    if (!open || !paypalReady || !accountId || isFree || isPro) return;
    if (!window.paypal || !buttonsContainerRef.current) return;

    // Tear down previous instance
    try {
      buttonsInstanceRef.current?.close?.();
    } catch {
      /* noop */
    }
    buttonsContainerRef.current.innerHTML = "";

    const instance = window.paypal.Buttons({
      style: { layout: "vertical", color: "blue", shape: "pill", label: "paypal" },
      createOrder: async () => {
        try {
          const { data, error } = await supabase.functions.invoke("paypal-create-order", {
            body: { accountId, discountPercent },
          });
          if (error) throw error;
          if (data?.alreadyPro) {
            toast.success("You're already Pro!");
            setPro(true, "paypal");
            onOpenChange(false);
            throw new Error("already pro");
          }
          if (!data?.id) throw new Error(data?.error ?? "Could not create order");
          return data.id as string;
        } catch (e) {
          toast.error((e as Error).message);
          throw e;
        }
      },
      onApprove: async (data: any) => {
        try {
          const { data: cap, error } = await supabase.functions.invoke("paypal-capture-order", {
            body: { orderId: data.orderID, accountId },
          });
          if (error || !cap?.ok) throw new Error(cap?.error ?? error?.message ?? "Capture failed");
          setPro(true, "paypal");
          toast.success("🎉 Welcome to Pro! All years & topics unlocked.");
          onOpenChange(false);
        } catch (e) {
          toast.error((e as Error).message);
        }
      },
      onError: (err: any) => {
        console.error(err);
        toast.error("PayPal error — please try again.");
      },
    });
    buttonsInstanceRef.current = instance;
    instance.render(buttonsContainerRef.current);

    return () => {
      try {
        instance?.close?.();
      } catch {
        /* noop */
      }
    };
  }, [open, paypalReady, accountId, discountPercent, isFree, isPro, setPro, onOpenChange]);

  const applyCode = async () => {
    if (!accountId) {
      setShowSignIn(true);
      return;
    }
    if (!code.trim()) return;
    setRedeeming(true);
    try {
      const { data, error } = await supabase.functions.invoke("redeem-code", {
        body: { code: code.trim(), accountId },
      });
      if (error) throw error;
      if (!data?.ok) {
        toast.error(data?.error ?? "Could not redeem code");
        setRedeeming(false);
        return;
      }
      setAppliedCode(code.trim());
      setDiscountPercent(data.percent_off ?? 0);
      if (data.pro_granted) {
        setPro(true, "gift_code");
        toast.success("🎁 Gift code applied — you're Pro!");
        onOpenChange(false);
      } else {
        toast.success(`✅ ${data.percent_off}% off applied`);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRedeeming(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="unlock-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[100] overflow-y-auto"
          >
            <div
              onClick={() => onOpenChange(false)}
              className="fixed inset-0 bg-foreground/40 backdrop-blur-sm"
              aria-hidden
            />
            <div className="relative min-h-full flex items-center justify-center p-4 sm:p-6 pointer-events-none">
              <motion.div
                initial={{ y: 12, scale: 0.97 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: 8, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className="pointer-events-auto relative w-full max-w-[480px] rounded-3xl border-[2.5px] border-border bg-card shadow-2xl p-5 sm:p-6"
                role="dialog"
                aria-modal="true"
              >
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  aria-label="Close"
                  className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition cursor-pointer"
                >
                  <LuX size={18} />
                </button>

                <div className="mb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <LuSparkles className="text-primary" size={22} />
                    Unlock Pro — lifetime
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    All years (2016–2026) and every premium topic, forever.
                  </p>
                </div>

                {/* Sign-in gate */}
                {!profile && (
                  <div className="mb-4 rounded-2xl border-[2.5px] border-border bg-muted/30 p-4 text-center">
                    <LuLock className="mx-auto mb-2 text-muted-foreground" size={22} />
                    <p className="text-sm font-medium mb-3">
                      Sign in first so we can save your Pro access.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowSignIn(true)}
                      className="px-5 py-2.5 rounded-full font-bold text-sm bg-primary text-primary-foreground border-[2.5px] border-border hover:opacity-90 transition cursor-pointer"
                    >
                      Sign in (or anonymously)
                    </button>
                  </div>
                )}

                {profile && (
                  <>
                    {/* Price */}
                    <div className="mb-4 rounded-2xl border-[2.5px] border-border p-4 bg-card-yellow/40">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <div className="text-xs uppercase font-bold text-muted-foreground tracking-wide">
                            Total today
                          </div>
                          <div className="flex items-baseline gap-2 mt-0.5">
                            <span className="text-3xl font-bold">${finalDollars}</span>
                            {discountPercent > 0 && (
                              <span className="text-sm text-muted-foreground line-through">
                                $9.99
                              </span>
                            )}
                          </div>
                        </div>
                        {appliedCode && (
                          <div className="text-right">
                            <div className="text-[10px] uppercase font-bold text-muted-foreground">
                              Code
                            </div>
                            <div className="text-sm font-mono font-bold flex items-center gap-1 text-primary">
                              <LuCheck size={14} /> {appliedCode}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Code */}
                    <div className="mb-4">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                        <LuTicket size={12} /> Gift or discount code
                      </label>
                      <div className="flex gap-2">
                        <input
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          placeholder="e.g. testinggifts"
                          disabled={!!appliedCode}
                          className="flex-1 px-4 py-2.5 rounded-xl border-[2.5px] border-border bg-card focus:outline-none focus:border-primary transition text-sm font-mono disabled:opacity-60"
                        />
                        <button
                          type="button"
                          onClick={applyCode}
                          disabled={redeeming || !!appliedCode || !code.trim()}
                          className="px-4 py-2.5 rounded-xl border-[2.5px] border-border bg-foreground text-background font-bold text-sm disabled:opacity-50 cursor-pointer hover:opacity-90 transition flex items-center gap-1.5"
                        >
                          {redeeming ? <LuLoader className="animate-spin" size={14} /> : null}
                          {redeeming ? "Applying..." : appliedCode ? "Applied" : "Apply"}
                        </button>
                      </div>
                    </div>

                    {/* PayPal / free unlock */}
                    {isFree ? (
                      <div className="rounded-2xl border-[2.5px] border-primary bg-primary/5 p-4 text-center text-sm font-medium">
                        🎉 Free with this code — Pro is being applied to your account.
                      </div>
                    ) : (
                      <>
                        {paypalError && (
                          <div className="rounded-2xl border-[2.5px] border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive mb-3">
                            {paypalError}
                          </div>
                        )}
                        {!paypalReady && !paypalError && accountId && !isPro && (
                          <div className="rounded-2xl border-[2.5px] border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                            <LuLoader className="animate-spin inline mr-2" size={14} />
                            Loading PayPal…
                          </div>
                        )}
                        <div ref={buttonsContainerRef} />
                        <p className="text-[10px] text-muted-foreground text-center mt-3">
                          PayPal sandbox — test mode. No real charges.
                        </p>
                      </>
                    )}
                  </>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SignInModal open={showSignIn} onOpenChange={setShowSignIn} />
    </>,
    document.body,
  );
}
