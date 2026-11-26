import { useCallback, useEffect, useRef, useState } from "react";
import {
  Send,
  Smartphone,
  Check,
  X,
  AlertTriangle,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { MpesaService, mpesaErrorMessage } from "@/services/mpesa.service";
import { useAppStore } from "@/store/app.store";
import { normalizeStkPhone } from "@/utils/mpesa";

const POLL_MS = 4000; // fallback while a prompt is waiting, in case the socket is down

let configPromise = null;
/** STK settings, loaded once per session (null when the API can't be reached). */
function loadStkConfig() {
  if (!configPromise) {
    configPromise = MpesaService.stkConfig().catch(() => {
      configPromise = null; // try again next time
      return null;
    });
  }
  return configPromise;
}

const fmt = (n) => `KSh ${Number(n).toLocaleString()}`;
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * "Send M-Pesa prompt": pushes a PIN prompt to the customer's phone for (part
 * of) the bill. The API applies the payment to the bill when KCB confirms it,
 * so nothing is added to the modal's payment lines; `onPaid` lets the screen
 * refresh the bill (and close the modal when it's fully paid).
 *
 * Renders nothing unless prompts are switched on (KCB_STK_ENABLED).
 *
 * @param {object}  props
 * @param {string}  props.billId
 * @param {number}  props.amountToCover  what the bill still needs
 * @param {boolean} props.disabled
 * @param {(prompt: object) => void} props.onPaid
 */
const MpesaStkPanel = ({ billId, amountToCover, disabled, onPaid }) => {
  const [config, setConfig] = useState(null);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [prompt, setPrompt] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(Date.now());
  const paidNotified = useRef(new Set());
  const stkEvent = useAppStore((s) => s.mpesaStkEvent);

  const maxForBill = Math.floor(amountToCover);

  useEffect(() => {
    let alive = true;
    loadStkConfig().then((c) => alive && setConfig(c));
    return () => {
      alive = false;
    };
  }, []);

  // Pick up a prompt still in flight for this bill (modal reopened).
  useEffect(() => {
    if (!config?.enabled || !billId) return undefined;
    let alive = true;
    MpesaService.stkList(billId)
      .then((list) => {
        const latest = Array.isArray(list) ? list[0] : null;
        if (alive && latest?.active) setPrompt(latest);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [config?.enabled, billId]);

  // Default amount: what the bill still needs (whole shillings).
  useEffect(() => {
    if (!prompt) setAmount(maxForBill > 0 ? String(maxForBill) : "");
  }, [maxForBill, prompt]);

  const refresh = useCallback(async (id) => {
    try {
      setPrompt(await MpesaService.stkGet(id));
    } catch {
      /* keep the last known state; the next poll or event retries */
    }
  }, []);

  // Live update from the socket.
  useEffect(() => {
    if (
      prompt &&
      stkEvent?.id === prompt.id &&
      stkEvent.status !== prompt.status
    )
      refresh(prompt.id);
  }, [stkEvent, prompt, refresh]);

  // Countdown + polling fallback while waiting.
  useEffect(() => {
    if (!prompt?.active) return undefined;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(() => refresh(prompt.id), POLL_MS);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [prompt?.active, prompt?.id, refresh]);

  // Cooldown countdown after a failed prompt.
  useEffect(() => {
    if (!prompt || prompt.active || prompt.status === "paid") return undefined;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [prompt]);

  // Tell the screen once per paid prompt.
  useEffect(() => {
    if (prompt?.status === "paid" && !paidNotified.current.has(prompt.id)) {
      paidNotified.current.add(prompt.id);
      onPaid?.(prompt);
    }
  }, [prompt, onPaid]);

  if (!config?.enabled || !billId) return null;

  const normalized = normalizeStkPhone(phone);
  const amountNum = Number(amount);
  const amountOk =
    Number.isInteger(amountNum) &&
    amountNum >= 1 &&
    amountNum <= Math.min(maxForBill, config.maxAmount);
  const cooldownLeft =
    prompt && !prompt.active
      ? Math.max(
          0,
          Math.ceil(
            (new Date(prompt.createdAt).getTime() +
              config.resendCooldownSeconds * 1000 -
              now) /
              1000,
          ),
        )
      : 0;
  const canSend =
    !!normalized &&
    amountOk &&
    !sending &&
    !disabled &&
    !prompt?.active &&
    cooldownLeft === 0;

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      setPrompt(
        await MpesaService.stkSend({
          billId,
          phone: normalized,
          amount: amountNum,
        }),
      );
      setNow(Date.now());
    } catch (err) {
      setError(mpesaErrorMessage(err, "Could not send the M-Pesa prompt"));
    } finally {
      setSending(false);
    }
  };

  const secondsLeft = prompt?.active
    ? Math.max(
        0,
        Math.round((new Date(prompt.expiresAt).getTime() - now) / 1000),
      )
    : 0;

  const showForm = !prompt || (prompt.status !== "paid" && !prompt.active);
  const showNewPrompt = prompt?.status === "paid" && maxForBill > 0;

  return (
    <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Smartphone size={16} className="text-green-400" />
        <span className="text-sm font-semibold text-green-300">
          Send M-Pesa Prompt
        </span>
        {config.mock && (
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-semibold">
            TEST MODE
          </span>
        )}
      </div>

      {/* ── Status card ── */}
      {prompt && (
        <div
          className={`rounded-lg px-3 py-2.5 text-sm border ${
            prompt.active
              ? "border-green-500/30 bg-gray-800/60"
              : prompt.status === "paid"
                ? "border-green-500/50 bg-green-500/10"
                : "border-red-500/30 bg-red-500/10"
          }`}
        >
          <div className="flex items-start gap-2">
            {prompt.active ? (
              <Loader2
                size={18}
                className="text-green-400 animate-spin shrink-0 mt-0.5"
              />
            ) : prompt.status === "paid" ? (
              <Check size={18} className="text-green-400 shrink-0 mt-0.5" />
            ) : (
              <X size={18} className="text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p
                className={`font-semibold ${prompt.status === "paid" ? "text-green-300" : prompt.active ? "text-white" : "text-red-300"}`}
              >
                {prompt.status === "paid"
                  ? `Paid ${fmt(prompt.paidAmount ?? prompt.amount)}`
                  : prompt.statusText}
                {prompt.active && (
                  <span className="font-mono text-gray-400 font-normal">
                    {" "}
                    ({mmss(secondsLeft)})
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {fmt(prompt.amount)} · {prompt.phone} · Ref{" "}
                <span className="font-mono text-gray-300">
                  {prompt.accountRef}
                </span>
                {prompt.receipt && (
                  <>
                    {" "}
                    ·{" "}
                    <span className="font-mono text-gray-300">
                      {prompt.receipt}
                    </span>
                  </>
                )}
              </p>
              {prompt.status === "paid" && prompt.problem && (
                <p className="text-xs text-yellow-300 mt-1 flex gap-1">
                  <AlertTriangle size={13} className="shrink-0 mt-px" />
                  {prompt.problem}
                </p>
              )}
            </div>
          </div>
          {showNewPrompt && (
            <button
              onClick={() => setPrompt(null)}
              disabled={disabled}
              className="mt-2 text-xs text-green-300 hover:text-green-200 flex items-center gap-1 disabled:opacity-50"
            >
              <RotateCcw size={12} /> Send another prompt for the remaining{" "}
              {fmt(maxForBill)}
            </button>
          )}
        </div>
      )}

      {/* ── Form ── */}
      {showForm && (
        <>
          <div className="flex gap-2">
            <input
              type="tel"
              inputMode="tel"
              autoComplete="off"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Customer phone 07XX XXX XXX"
              disabled={disabled || sending}
              className={`flex-1 min-w-0 px-3 py-2.5 rounded-lg bg-gray-800/60 border-2 text-white placeholder-gray-500 focus:outline-none transition-all font-mono disabled:opacity-50 ${
                phone && !normalized
                  ? "border-red-500/60"
                  : "border-green-500/30 focus:border-green-500"
              }`}
            />
            <div className="relative w-28 shrink-0">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                KSh
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={amount}
                onChange={(e) =>
                  /^\d*$/.test(e.target.value) && setAmount(e.target.value)
                }
                onFocus={(e) => e.target.select()}
                disabled={disabled || sending}
                className={`w-full pl-9 pr-2 py-2.5 rounded-lg bg-gray-800/60 border-2 text-white focus:outline-none font-mono disabled:opacity-50 ${
                  amount && !amountOk
                    ? "border-red-500/60"
                    : "border-green-500/30 focus:border-green-500"
                }`}
              />
            </div>
          </div>
          {amount && !amountOk && (
            <p className="text-xs text-red-300">
              Whole shillings, up to{" "}
              {fmt(Math.min(maxForBill, config.maxAmount))}.
            </p>
          )}
          <button
            onClick={send}
            disabled={!canSend}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Sending…
              </>
            ) : cooldownLeft > 0 ? (
              `Resend in ${cooldownLeft}s`
            ) : (
              <>
                <Send size={16} /> {prompt ? "Resend prompt" : "Send prompt"}
              </>
            )}
          </button>
          <p className="text-[11px] text-gray-500">
            The customer gets a PIN prompt for this amount. The bill updates by
            itself once they pay.
          </p>
        </>
      )}

      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
};

export default MpesaStkPanel;
