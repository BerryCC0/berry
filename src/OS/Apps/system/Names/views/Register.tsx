"use client";

/**
 * Register — claim a new .eth name.
 *
 * 2-step commit/reveal flow against ETHRegistrarController:
 *   1. commit: hashed commitment goes onchain (hides the name)
 *   2. wait ≥60s
 *   3. register: reveal secret + name, pay ETH
 *
 * The commit secret is persisted to sessionStorage via useRegisterCommitSession
 * so a closed window can recover and complete the register step.
 *
 * Step is derived from {session, nowTick, manualStep} so the post-wait
 * transition fires through a single setTimeout — no cascading setState.
 */

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import {
  useEnsAvailable,
  useEnsPrice,
  useCommitEnsName,
  useRegisterEnsName,
  useRegisterCommitSession,
  useEnsInvalidate,
  randomSecret,
  MIN_COMMITMENT_AGE_SECONDS,
} from "@/app/lib/ens/hooks";
import {
  StepIndicator,
  DurationStepper,
  PriceDisplay,
  EmptyState,
  WarningBanner,
} from "../components";
import styles from "./Register.module.css";

const ONE_YEAR = 365 * 86400;
const COMMIT_AGE_MS = MIN_COMMITMENT_AGE_SECONDS * 1000;

type Step = "input" | "commit" | "wait" | "register" | "done";
const STEP_LABELS = ["Name", "Commit", "Wait", "Register", "Done"];

const STEP_INDEX: Record<Step, number> = {
  input: 0,
  commit: 1,
  wait: 2,
  register: 3,
  done: 4,
};

export function Register() {
  const { address } = useAccount();
  const { session, save, clear } = useRegisterCommitSession(address);
  const invalidate = useEnsInvalidate();

  const [inputName, setInputName] = useState("");
  const [duration, setDuration] = useState(ONE_YEAR);
  const [manualStep, setManualStep] = useState<Step | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    if (!session) return;
    const remaining = session.committedAt + COMMIT_AGE_MS - Date.now();
    if (remaining <= 0) return;
    const t = window.setTimeout(() => setNowTick(Date.now()), remaining);
    return () => window.clearTimeout(t);
  }, [session]);

  const fullName = session?.fullName
    ?? (inputName.endsWith(".eth") ? inputName : `${inputName}.eth`);

  const step: Step = manualStep === "done"
    ? "done"
    : session
      ? nowTick - session.committedAt >= COMMIT_AGE_MS
        ? "register"
        : "wait"
      : manualStep ?? "input";

  const available = useEnsAvailable(fullName);
  const price = useEnsPrice(fullName, duration);
  const committer = useCommitEnsName();
  const registrar = useRegisterEnsName();

  const handleCommit = async () => {
    if (!address) return;
    const secret = randomSecret();
    const txHash = await committer.commit({
      name: fullName,
      owner: address,
      duration,
      secret,
    });
    save({
      fullName,
      owner: address,
      duration,
      secret,
      committedAt: Date.now(),
      commitTxHash: txHash,
    });
    setManualStep(null);
  };

  const handleRegister = async () => {
    if (!address || !session || !price.data) return;
    const total = price.data.base + price.data.premium;
    await registrar.register({
      name: session.fullName,
      owner: session.owner,
      duration: session.duration,
      secret: session.secret,
      value: total,
    });
    clear();
    if (address) invalidate.address(address);
    setManualStep("done");
  };

  const handleCancel = () => {
    clear();
    setManualStep(null);
    setInputName("");
  };

  const remainingWait = session
    ? Math.max(0, Math.ceil((session.committedAt + COMMIT_AGE_MS - nowTick) / 1000))
    : MIN_COMMITMENT_AGE_SECONDS;

  return (
    <div className={styles.container}>
      <StepIndicator steps={STEP_LABELS} current={STEP_INDEX[step]} />

      {step === "input" && (
        <section className={styles.section}>
          <h3 className={styles.title}>Pick a name</h3>
          <div className={styles.nameRow}>
            <input
              type="text"
              className={styles.input}
              placeholder="myname"
              value={inputName}
              onChange={(e) => setInputName(e.target.value.trim().toLowerCase())}
              autoFocus
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
            <span className={styles.suffix}>.eth</span>
          </div>

          {inputName && available.data === false && (
            <WarningBanner tone="danger">
              <strong>{fullName}</strong> is already registered.
            </WarningBanner>
          )}

          {inputName && available.data === true && (
            <>
              <div className={styles.field}>
                <span className={styles.label}>Duration</span>
                <DurationStepper value={duration} onChange={setDuration} />
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Price</span>
                <PriceDisplay
                  wei={price.data ? price.data.base + price.data.premium : undefined}
                  size="lg"
                />
              </div>
            </>
          )}

          <button
            type="button"
            className={styles.primaryButton}
            disabled={!available.data || !address || !price.data}
            onClick={() => setManualStep("commit")}
          >
            {!address ? "Connect wallet" : "Continue"}
          </button>
        </section>
      )}

      {step === "commit" && (
        <section className={styles.section}>
          <h3 className={styles.title}>Reserve {fullName}</h3>
          <p className={styles.copy}>
            The commit transaction reserves the name without revealing it on-chain. After
            a {MIN_COMMITMENT_AGE_SECONDS}s wait, you can complete the registration.
          </p>
          <div className={styles.field}>
            <span className={styles.label}>Total</span>
            <PriceDisplay
              wei={price.data ? price.data.base + price.data.premium : undefined}
              size="lg"
            />
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={handleCancel}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleCommit}
              disabled={committer.isPending}
            >
              {committer.isPending ? "Confirm in wallet…" : "Commit"}
            </button>
          </div>
          {committer.error && (
            <WarningBanner tone="danger">{committer.error.message}</WarningBanner>
          )}
        </section>
      )}

      {step === "wait" && (
        <section className={styles.section}>
          <h3 className={styles.title}>Wait {remainingWait}s</h3>
          <div className={styles.countdown}>{remainingWait}</div>
          <p className={styles.copy}>
            Your commit is on-chain. The protocol enforces a short wait before reveal to
            prevent front-running. You can <strong>close this window</strong> — your
            commit is saved and you can resume from any tab on the same wallet.
          </p>
          {session?.commitTxHash && (
            <div className={styles.txHash}>
              Commit tx: <code>{session.commitTxHash}</code>
            </div>
          )}
        </section>
      )}

      {step === "register" && (
        <section className={styles.section}>
          <h3 className={styles.title}>Ready to register</h3>
          <p className={styles.copy}>
            The wait period has elapsed. Click below to reveal {fullName} and complete
            registration.
          </p>
          <div className={styles.field}>
            <span className={styles.label}>Total</span>
            <PriceDisplay
              wei={price.data ? price.data.base + price.data.premium : undefined}
              size="lg"
            />
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={handleCancel}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleRegister}
              disabled={registrar.isPending || !price.data}
            >
              {registrar.isPending ? "Confirm in wallet…" : "Register"}
            </button>
          </div>
          {registrar.error && (
            <WarningBanner tone="danger">{registrar.error.message}</WarningBanner>
          )}
        </section>
      )}

      {step === "done" && (
        <EmptyState
          icon="✓"
          title={`${fullName} is yours`}
          description="Set it as your primary name or jump straight into managing records."
          cta={{ label: "Done", onClick: () => setManualStep(null) }}
        />
      )}
    </div>
  );
}
