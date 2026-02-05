/**
 * PersonaKYC Component
 * Identity verification for proposal submission using Persona
 * Loads SDK via CDN for reliable widget embedding
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './PersonaKYC.module.css';

interface PersonaKYCProps {
  onComplete: (data: { inquiryId: string; status: string; fields: Record<string, unknown> }) => void;
  onCancel?: () => void;
  onError?: (error: unknown) => void;
  disabled?: boolean;
  walletAddress?: string;
  proposalTitle?: string;
}

// Persona client interface
interface PersonaClient {
  open: () => void;
  cancel: (force?: boolean) => void;
}

// Persona constructor interface
interface PersonaConstructor {
  Client: new (config: unknown) => PersonaClient;
}

// Declare Persona on window
declare global {
  interface Window {
    Persona?: PersonaConstructor;
  }
}

// Template ID from environment
const PERSONA_TEMPLATE_ID = process.env.NEXT_PUBLIC_PERSONA_TEMPLATE_ID || '';

export function PersonaKYC({
  onComplete,
  onCancel,
  onError,
  disabled = false,
  walletAddress,
  proposalTitle
}: PersonaKYCProps) {
  const [isKYCOpen, setIsKYCOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [kycStatus, setKycStatus] = useState<'idle' | 'loading' | 'completed' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const clientRef = useRef<PersonaClient | null>(null);

  // Load Persona SDK dynamically via CDN
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check if already loaded
    if (window.Persona) {
      setSdkLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.withpersona.com/dist/persona-v4.8.0.js';
    script.async = true;
    script.onload = () => {
      setSdkLoaded(true);
    };
    script.onerror = () => {
      setErrorMessage('Failed to load KYC verification system');
      setKycStatus('error');
    };

    document.body.appendChild(script);

    return () => {
      // Only remove if we added it
      if (script.parentNode) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Generate comprehensive reference ID
  const generateReferenceId = (): string => {
    const CLIENT_ID = 'berry-os';
    
    // Create a safe slug from proposal title
    const titleSlug = proposalTitle 
      ? proposalTitle
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-+/g, '-') // Replace multiple hyphens with single
          .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
          .substring(0, 30) // Limit length
      : 'untitled';
    
    // Create components for reference ID
    const components = [
      titleSlug,
      walletAddress ? walletAddress.toLowerCase() : 'no-wallet',
      CLIENT_ID
    ];
    
    return components.join('-');
  };

  const initializePersonaClient = () => {
    if (typeof window === 'undefined' || !window.Persona) {
      setErrorMessage('Client-side environment required');
      setKycStatus('error');
      return null;
    }

    if (!PERSONA_TEMPLATE_ID) {
      setErrorMessage('Persona template ID not configured');
      setKycStatus('error');
      return null;
    }

    try {
      const referenceId = generateReferenceId();
      
      // Prepare fields for prefilling
      const fields: Record<string, string> = {};
      
      // Add proposal title as project_name if available
      if (proposalTitle) {
        fields.project_name = proposalTitle;
      }
      
      // Add wallet address as crypto_wallet_address if available
      if (walletAddress) {
        fields.crypto_wallet_address = walletAddress;
      }

      const client = new window.Persona.Client({
        templateId: PERSONA_TEMPLATE_ID,
        referenceId,
        fields,
        onReady: () => {
          setIsLoading(false);
          client.open();
        },
        onComplete: (data: { inquiryId: string; status: string; fields: Record<string, unknown> }) => {
          setKycStatus('completed');
          setIsKYCOpen(false);
          onComplete(data);
        },
        onCancel: () => {
          setKycStatus('idle');
          setIsKYCOpen(false);
          onCancel?.();
        },
        onError: (error: unknown) => {
          console.error('KYC error:', error);
          setKycStatus('error');
          const errorMsg = error && typeof error === 'object' && 'message' in error 
            ? (error as { message: string }).message 
            : 'KYC verification failed';
          setErrorMessage(errorMsg);
          setIsKYCOpen(false);
          onError?.(error);
        },
        onEvent: (name: string) => {
          switch (name) {
            case 'start':
              setKycStatus('loading');
              break;
            default:
              // Handle other events if needed
          }
        }
      });

      return client;
    } catch (error) {
      console.error('Failed to initialize Persona client:', error);
      setErrorMessage('Failed to initialize KYC verification');
      setKycStatus('error');
      onError?.(error);
      return null;
    }
  };

  const handleStartKYC = () => {
    if (disabled || !sdkLoaded) return;
    
    setErrorMessage(null);
    setIsLoading(true);
    setKycStatus('loading');
    setIsKYCOpen(true);

    // Initialize and open Persona client
    const client = initializePersonaClient();
    if (client) {
      clientRef.current = client;
    } else {
      setIsLoading(false);
      setKycStatus('error');
      setIsKYCOpen(false);
    }
  };

  const handleCancelKYC = () => {
    if (clientRef.current) {
      try {
        clientRef.current.cancel(true);
      } catch {
        // Silently handle cancellation errors
      }
    }
    setIsKYCOpen(false);
    setKycStatus('idle');
    setIsLoading(false);
    onCancel?.();
  };

  const getButtonText = () => {
    if (!sdkLoaded) return 'Loading KYC System...';
    switch (kycStatus) {
      case 'loading':
        return 'Verifying Identity...';
      case 'completed':
        return 'Identity Verified';
      case 'error':
        return 'Retry Identity Verification';
      default:
        return 'KYC with Persona';
    }
  };

  // Don't render if no template ID configured
  if (!PERSONA_TEMPLATE_ID) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>KYC with Persona</h3>
        </div>
        <div className={styles.infoBox}>
          <p className={styles.infoText}>
            KYC verification is not currently configured. Proposals can still be submitted, 
            but may require verification before execution.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>KYC with Persona</h3>
      </div>

      {kycStatus === 'completed' ? (
        <div className={styles.successBox}>
          <p className={styles.successText}>
            Identity verified successfully
          </p>
          <p className={styles.successNote}>
            You can now create proposals that will be eligible for execution.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.infoBox}>
            <p className={styles.infoText}>
              KYC is optional to submit proposals. If your proposal succeeds and you have not KYC'd, 
              your proposal may not be executed. Contact the Nouns DUNA Admins for more information.
            </p>
            <ul className={styles.infoList}>
              <li>Government-issued ID required</li>
              <li>Takes about 2-3 minutes</li>
              <li>Data handled securely by Persona</li>
            </ul>
          </div>

          {errorMessage && (
            <div className={styles.errorBox}>
              {errorMessage}
            </div>
          )}

          <button
            className={`${styles.verifyButton} ${kycStatus === 'loading' ? styles.loading : ''} ${kycStatus === 'error' ? styles.error : ''}`}
            onClick={handleStartKYC}
            disabled={disabled || isLoading || !sdkLoaded}
          >
            {isLoading && <span className={styles.spinner} />}
            {getButtonText()}
          </button>

          <p className={styles.skipNote}>
            You can skip verification and submit your proposal, but it may not be 
            executed until you complete verification.
          </p>
        </>
      )}

      {/* Loading overlay when KYC modal is opening */}
      {isKYCOpen && isLoading && (
        <div className={styles.kycModal}>
          <div className={styles.modalOverlay} onClick={handleCancelKYC} />
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>KYC with Persona</h3>
              <button
                className={styles.closeButton}
                onClick={handleCancelKYC}
                type="button"
              >
                ×
              </button>
            </div>
            <div className={styles.loadingState}>
              <div className={styles.spinnerLarge} />
              <p>Loading verification system...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
