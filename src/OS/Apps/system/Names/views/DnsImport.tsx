"use client";

/**
 * DnsImport — multi-step wizard for bringing a DNS domain into ENS.
 *
 * Two paths:
 *   - Gasless: add a TXT record with the ExtendedDNSResolver. Resolution
 *     happens via CCIP-Read; no transaction needed. The wizard polls
 *     for resolution to confirm setup.
 *   - Onchain: submit a DNSSEC proof to DNSRegistrar. Costs gas but
 *     registers the name in ENS Registry, enabling subnames + transfer.
 *
 * Both paths require DNSSEC enabled at the user's DNS registrar.
 */

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import {
  useDnsImportData,
  useImportDnsName,
  useEnsAddressRecord,
} from "@/app/lib/ens/hooks";
import { ENS_ADDRESSES } from "@/app/lib/ens/contracts";
import { StepIndicator, WarningBanner, EmptyState } from "../components";
import styles from "./DnsImport.module.css";

type Step = 0 | 1 | 2 | 3 | 4;
const STEPS = ["Domain", "DNSSEC", "Path", "Configure", "Done"];

type Path = "gasless" | "onchain" | null;

export function DnsImport() {
  const { address } = useAccount();
  const [step, setStep] = useState<Step>(0);
  const [domain, setDomain] = useState("");
  const [domainInput, setDomainInput] = useState("");
  const [path, setPath] = useState<Path>(null);
  const [copied, setCopied] = useState(false);
  const [polling, setPolling] = useState(false);

  // Step 2: DNSSEC detection happens implicitly when getDnsImportData
  // succeeds. We don't pre-check via DoH; just attempt the proof fetch
  // when the user advances, and surface errors with a friendly hint.
  const dnsData = useDnsImportData();
  const importer = useImportDnsName();

  // Step 4a (gasless): poll the resolver for the expected address
  const resolution = useEnsAddressRecord(polling ? domain : undefined);

  useEffect(() => {
    if (!polling) return;
    const t = window.setInterval(() => resolution.refetch(), 5000);
    return () => window.clearInterval(t);
  }, [polling, resolution]);

  const expectedAddress = address?.toLowerCase();
  const resolvedMatches =
    polling &&
    resolution.data?.value?.toLowerCase() === expectedAddress;

  // Schedule the success transition into a microtask so the setState
  // doesn't fire synchronously inside the effect body.
  useEffect(() => {
    if (!resolvedMatches) return;
    const t = window.setTimeout(() => {
      setStep(4);
      setPolling(false);
    }, 0);
    return () => window.clearTimeout(t);
  }, [resolvedMatches]);

  const handleSubmitDomain = () => {
    const v = domainInput.trim().toLowerCase();
    if (!v.includes(".") || v.endsWith(".eth")) return;
    setDomain(v);
    setStep(1);
  };

  const handleCheckDnssec = async () => {
    // Use ensjs.getDnsImportData as a probe — it'll throw if DNSSEC is unconfigured.
    try {
      await dnsData.fetch(domain);
      setStep(2);
    } catch {
      // Error surfaces in dnsData.error; user stays on step 1.
    }
  };

  const handlePickGasless = () => {
    setPath("gasless");
    setStep(3);
  };

  const handlePickOnchain = () => {
    setPath("onchain");
    setStep(3);
  };

  const handleSubmitProof = async () => {
    if (!dnsData.data || !address) return;
    await importer.importName({
      name: domain,
      dnsImportData: dnsData.data,
      resolverAddress: ENS_ADDRESSES.publicResolver,
      address,
    });
    setStep(4);
  };

  const txtRecord = `ENS1 ${ENS_ADDRESSES.extendedDnsResolver} ${address ?? "0xYourAddress"}`;

  const handleCopyTxt = async () => {
    try {
      await navigator.clipboard.writeText(txtRecord);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const reset = () => {
    setStep(0);
    setDomain("");
    setDomainInput("");
    setPath(null);
    dnsData.reset();
    setPolling(false);
  };

  return (
    <div className={styles.container}>
      <StepIndicator steps={STEPS} current={step} />

      {/* Step 0: Domain entry */}
      {step === 0 && (
        <section className={styles.section}>
          <h3 className={styles.title}>Domain</h3>
          <p className={styles.copy}>Enter the DNS domain you want to use in ENS.</p>
          <div className={styles.inputRow}>
            <input
              type="text"
              className={styles.input}
              placeholder="nounsfoundation.org"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value.trim().toLowerCase())}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
            <button
              type="button"
              className={styles.nextButton}
              onClick={handleSubmitDomain}
              disabled={!domainInput.includes(".") || domainInput.endsWith(".eth")}
            >
              Next →
            </button>
          </div>
          {domainInput.endsWith(".eth") && (
            <div className={styles.hint}>For .eth names, use the Register tab instead.</div>
          )}
        </section>
      )}

      {/* Step 1: DNSSEC check */}
      {step === 1 && (
        <section className={styles.section}>
          <h3 className={styles.title}>DNSSEC</h3>
          <p className={styles.copy}>
            <strong>{domain}</strong> needs DNSSEC enabled at your DNS registrar before it
            can be used in ENS. Click below to verify.
          </p>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleCheckDnssec}
            disabled={dnsData.isLoading}
          >
            {dnsData.isLoading ? "Checking…" : "Check DNSSEC"}
          </button>
          {dnsData.error && (
            <WarningBanner tone="danger">
              DNSSEC verification failed: {dnsData.error.message}
              <br />
              Enable DNSSEC at your registrar (Cloudflare, Namecheap, Porkbun all support it
              with one click). Vercel-registered domains currently don&apos;t support DNSSEC.
            </WarningBanner>
          )}
        </section>
      )}

      {/* Step 2: Path choice */}
      {step === 2 && (
        <section className={styles.section}>
          <h3 className={styles.title}>Choose a path</h3>
          <div className={styles.pathChoice}>
            <button type="button" className={styles.pathCard} onClick={handlePickGasless}>
              <div className={styles.pathHead}>Gasless</div>
              <div className={styles.pathSub}>Free. TXT record only.</div>
              <p className={styles.pathBody}>
                Resolution happens via CCIP-Read at query time. No transaction. Limited to
                a single address record — no subnames or full ENS features.
              </p>
            </button>
            <button
              type="button"
              className={styles.pathCard}
              onClick={handlePickOnchain}
              disabled={!address}
            >
              <div className={styles.pathHead}>Onchain</div>
              <div className={styles.pathSub}>~1-3M gas (~$30-100).</div>
              <p className={styles.pathBody}>
                Submits a DNSSEC proof to the DNSRegistrar contract. Registers your name
                in the ENS Registry, enabling subnames, transfer, and full resolver flexibility.
              </p>
            </button>
          </div>
        </section>
      )}

      {/* Step 3a: Gasless configuration */}
      {step === 3 && path === "gasless" && (
        <section className={styles.section}>
          <h3 className={styles.title}>Add TXT record</h3>
          <p className={styles.copy}>
            Add this <code className={styles.inlineCode}>TXT</code> record at the apex of{" "}
            <strong>{domain}</strong>:
          </p>
          <div className={styles.txtBlock}>
            <code className={styles.txtRecord}>{txtRecord}</code>
            <button
              type="button"
              className={styles.smallButton}
              onClick={handleCopyTxt}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className={styles.hint}>
            DNS propagation can take a few minutes to a few hours. Once it&apos;s live, click
            below to verify resolution.
          </p>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => setPolling(true)}
            disabled={polling}
          >
            {polling ? "Checking resolution…" : "Check resolution"}
          </button>
          {polling && !resolvedMatches && resolution.data?.value && (
            <div className={styles.hint}>
              Resolved to {resolution.data.value} (expected {expectedAddress}). Keep waiting.
            </div>
          )}
        </section>
      )}

      {/* Step 3b: Onchain configuration */}
      {step === 3 && path === "onchain" && (
        <section className={styles.section}>
          <h3 className={styles.title}>Submit proof onchain</h3>
          <p className={styles.copy}>
            The DNSSEC proof for <strong>{domain}</strong> is ready. Submit it to the
            DNSRegistrar contract to register your name in ENS.
          </p>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleSubmitProof}
            disabled={!dnsData.data || importer.isPending}
          >
            {importer.isPending ? "Confirm in wallet…" : "Submit proof"}
          </button>
          {importer.error && (
            <WarningBanner tone="danger">
              Submission failed: {importer.error.message}
            </WarningBanner>
          )}
        </section>
      )}

      {/* Step 4: Done */}
      {step === 4 && (
        <section className={styles.section}>
          <EmptyState
            icon="✓"
            title={`${domain} is now in ENS`}
            description={
              path === "gasless"
                ? "Resolution is live. Records will work anywhere ENS is supported."
                : "Imported onchain. You can now manage records, create subnames, and transfer."
            }
            cta={{
              label: "View on app.ens.domains",
              onClick: () => window.open(`https://app.ens.domains/${domain}`, "_blank"),
            }}
          />
          <button type="button" className={styles.linkButton} onClick={reset}>
            Import another name
          </button>
        </section>
      )}
    </div>
  );
}
