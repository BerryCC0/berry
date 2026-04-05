/**
 * PersonaKYC Component
 * Identity verification for proposal submission using Persona
 * Loads SDK via CDN for reliable widget embedding
 * 
 * Features:
 * - SDK preloading for faster opens
 * - Memory cleanup with destroy()
 * - Session token storage for inquiry resumption
 * - Enhanced event tracking for UX feedback
 */

'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTheme } from '@/OS/lib/ThemeProvider';
import styles from './PersonaKYC.module.css';

interface PersonaKYCProps {
  onComplete: (data: { inquiryId: string; status: string; fields: Record<string, unknown> }) => void;
  onCancel?: () => void;
  onError?: (error: unknown) => void;
  disabled?: boolean;
  walletAddress?: string;
  proposalTitle?: string;
  /** If true, server has confirmed this wallet is already verified */
  serverVerified?: boolean;
}

// Persona client interface
interface PersonaClient {
  open: () => void;
  cancel: (force?: boolean) => void;
  destroy?: () => void;
}

// Persona constructor interface with static methods
interface PersonaClientConstructor {
  new (config: unknown): PersonaClient;
  preload?: () => void;
}

interface PersonaConstructor {
  Client: PersonaClientConstructor;
}

// Declare Persona on window
declare global {
  interface Window {
    Persona?: PersonaConstructor;
  }
}

// Template ID from environment
const PERSONA_TEMPLATE_ID = process.env.NEXT_PUBLIC_PERSONA_TEMPLATE_ID || '';

// Theme IDs from environment (configured in Persona Dashboard)
const PERSONA_THEME_LIGHT = process.env.NEXT_PUBLIC_PERSONA_THEME_LIGHT || '';
const PERSONA_THEME_DARK = process.env.NEXT_PUBLIC_PERSONA_THEME_DARK || '';

/**
 * Determine if a hex color is "dark" by calculating relative luminance
 * Uses the sRGB to relative luminance formula from WCAG 2.0
 */
function isColorDark(hexColor: string): boolean {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Parse RGB components
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  // Convert to linear RGB
  const linearR = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const linearG = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const linearB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  
  // Calculate relative luminance
  const luminance = 0.2126 * linearR + 0.7152 * linearG + 0.0722 * linearB;
  
  // Dark if luminance is below 0.5
  return luminance < 0.5;
}

// Storage key prefix for session tokens
const SESSION_STORAGE_KEY = 'persona_kyc_session';

// Verification step descriptions for enhanced UX
type VerificationStep = 
  | 'idle' 
  | 'loading' 
  | 'started'
  | 'country_selected'
  | 'capturing_document'
  | 'document_uploaded'
  | 'capturing_selfie'
  | 'selfie_uploaded'
  | 'processing'
  | 'completed' 
  | 'error';

const STEP_MESSAGES: Record<VerificationStep, string> = {
  idle: 'Ready to verify',
  loading: 'Loading verification...',
  started: 'Verification in progress...',
  country_selected: 'Country confirmed',
  capturing_document: 'Capturing ID document...',
  document_uploaded: 'ID document received',
  capturing_selfie: 'Capturing selfie...',
  selfie_uploaded: 'Selfie received',
  processing: 'Processing verification...',
  completed: 'Verification complete',
  error: 'Verification failed',
};

// Session data for resumption
interface StoredSession {
  inquiryId: string;
  sessionToken: string;
  walletAddress: string;
  timestamp: number;
}

// Helper to get storage key for a wallet
function getSessionKey(walletAddress: string): string {
  return `${SESSION_STORAGE_KEY}_${walletAddress.toLowerCase()}`;
}

// Helper to save session for resumption
function saveSession(walletAddress: string, inquiryId: string, sessionToken: string): void {
  if (typeof window === 'undefined') return;
  try {
    const session: StoredSession = {
      inquiryId,
      sessionToken,
      walletAddress: walletAddress.toLowerCase(),
      timestamp: Date.now(),
    };
    localStorage.setItem(getSessionKey(walletAddress), JSON.stringify(session));
  } catch (e) {
    console.warn('Failed to save KYC session:', e);
  }
}

// Helper to get stored session
function getStoredSession(walletAddress: string): StoredSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = getSessionKey(walletAddress);
    const data = localStorage.getItem(key);
    if (!data) return null;
    
    const session: StoredSession = JSON.parse(data);
    // Sessions expire after 24 hours (Persona default)
    const expiryMs = 24 * 60 * 60 * 1000;
    if (Date.now() - session.timestamp > expiryMs) {
      localStorage.removeItem(key);
      return null;
    }
    return session;
  } catch (e) {
    console.warn('Failed to load KYC session:', e);
    return null;
  }
}

// Helper to clear stored session
function clearStoredSession(walletAddress: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getSessionKey(walletAddress));
  } catch (e) {
    console.warn('Failed to clear KYC session:', e);
  }
}

export function PersonaKYC({
  onComplete,
  onCancel,
  onError,
  disabled = false,
  walletAddress,
  proposalTitle,
  serverVerified = false,
}: PersonaKYCProps) {
  const [isKYCOpen, setIsKYCOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationStep, setVerificationStep] = useState<VerificationStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [hasStoredSession, setHasStoredSession] = useState(false);
  const clientRef = useRef<PersonaClient | null>(null);
  
  // Get current Berry OS theme
  const currentTheme = useTheme();
  
  // Determine if we should use dark mode for Persona
  // Check preset first, then analyze background color for custom themes
  const isDarkMode = useMemo(() => {
    if (currentTheme.preset === 'dark') return true;
    if (currentTheme.preset === 'light' || currentTheme.preset === 'classic') return false;
    // For custom themes, analyze the background color
    return isColorDark(currentTheme.colors.background);
  }, [currentTheme.preset, currentTheme.colors.background]);
  
  // Get the appropriate Persona theme ID based on current mode
  const personaThemeId = useMemo(() => {
    if (isDarkMode && PERSONA_THEME_DARK) {
      return PERSONA_THEME_DARK;
    }
    if (!isDarkMode && PERSONA_THEME_LIGHT) {
      return PERSONA_THEME_LIGHT;
    }
    // Return undefined to use Persona's default theme
    return undefined;
  }, [isDarkMode]);
  
  // Determine if verification is complete (either from server or local flow)
  const isVerified = serverVerified || verificationStep === 'completed';
  
  // Legacy status for backward compatibility
  const kycStatus = verificationStep === 'completed' ? 'completed' 
    : verificationStep === 'error' ? 'error'
    : verificationStep === 'idle' ? 'idle' 
    : 'loading';
  
  // Check for stored session on mount
  useEffect(() => {
    if (walletAddress) {
      const session = getStoredSession(walletAddress);
      setHasStoredSession(!!session);
    }
  }, [walletAddress]);
  
  // Cleanup client on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (clientRef.current?.destroy) {
        try {
          clientRef.current.destroy();
        } catch (e) {
          console.warn('Failed to destroy Persona client:', e);
        }
        clientRef.current = null;
      }
    };
  }, []);

  // Load Persona SDK dynamically via CDN
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check if already loaded
    if (window.Persona) {
      setSdkLoaded(true);
      // Preload assets for faster subsequent opens
      if (window.Persona.Client.preload) {
        window.Persona.Client.preload();
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.withpersona.com/dist/persona-v4.8.0.js';
    script.async = true;
    script.onload = () => {
      setSdkLoaded(true);
      // Preload assets after SDK loads for faster opens
      if (window.Persona?.Client?.preload) {
        window.Persona.Client.preload();
      }
    };
    script.onerror = () => {
      setErrorMessage('Failed to load KYC verification system');
      setVerificationStep('error');
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

  const initializePersonaClient = useCallback(() => {
    if (typeof window === 'undefined' || !window.Persona) {
      setErrorMessage('Client-side environment required');
      setVerificationStep('error');
      return null;
    }

    if (!PERSONA_TEMPLATE_ID) {
      setErrorMessage('Persona template ID not configured');
      setVerificationStep('error');
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
        // Apply theme based on Berry OS dark/light mode
        ...(personaThemeId && { themeId: personaThemeId }),
        onReady: () => {
          setIsLoading(false);
          client.open();
        },
        onComplete: (data: { inquiryId: string; status: string; fields: Record<string, unknown> }) => {
          setVerificationStep('completed');
          setIsKYCOpen(false);
          // Clear stored session on successful completion
          if (walletAddress) {
            clearStoredSession(walletAddress);
            setHasStoredSession(false);
          }
          onComplete(data);
        },
        onCancel: (data?: { inquiryId?: string; sessionToken?: string }) => {
          setVerificationStep('idle');
          setIsKYCOpen(false);
          // Store session token for potential resumption
          if (data?.inquiryId && data?.sessionToken && walletAddress) {
            saveSession(walletAddress, data.inquiryId, data.sessionToken);
            setHasStoredSession(true);
          }
          onCancel?.();
        },
        onError: (error: unknown) => {
          console.error('KYC error:', error);
          setVerificationStep('error');
          const errorMsg = error && typeof error === 'object' && 'message' in error 
            ? (error as { message: string }).message 
            : 'KYC verification failed';
          setErrorMessage(errorMsg);
          setIsKYCOpen(false);
          onError?.(error);
        },
        onEvent: (name: string, metadata?: Record<string, unknown>) => {
          // Enhanced event tracking for better UX feedback
          switch (name) {
            case 'start':
              setVerificationStep('started');
              break;
            case 'country-select':
              setVerificationStep('country_selected');
              break;
            case 'document-camera-select':
            case 'document-camera-capture':
              setVerificationStep('capturing_document');
              break;
            case 'document-upload':
              setVerificationStep('document_uploaded');
              break;
            case 'selfie-camera-select':
            case 'selfie-record-upload':
              setVerificationStep('capturing_selfie');
              break;
            case 'verification-change':
              // Check if verification is being processed
              if (metadata?.status === 'pending') {
                setVerificationStep('processing');
              }
              break;
            case 'success':
              setVerificationStep('processing');
              break;
            default:
              // Log other events for debugging
              if (process.env.NODE_ENV === 'development') {
                console.log('Persona event:', name, metadata);
              }
          }
        }
      });

      return client;
    } catch (error) {
      console.error('Failed to initialize Persona client:', error);
      setErrorMessage('Failed to initialize KYC verification');
      setVerificationStep('error');
      onError?.(error);
      return null;
    }
  }, [walletAddress, proposalTitle, personaThemeId, onComplete, onCancel, onError]);

  const handleStartKYC = useCallback(() => {
    if (disabled || !sdkLoaded) return;
    
    // Destroy any existing client to prevent memory leaks
    if (clientRef.current?.destroy) {
      try {
        clientRef.current.destroy();
      } catch (e) {
        console.warn('Failed to destroy previous Persona client:', e);
      }
      clientRef.current = null;
    }
    
    setErrorMessage(null);
    setIsLoading(true);
    setVerificationStep('loading');
    setIsKYCOpen(true);

    // Initialize and open Persona client
    const client = initializePersonaClient();
    if (client) {
      clientRef.current = client;
    } else {
      setIsLoading(false);
      setVerificationStep('error');
      setIsKYCOpen(false);
    }
  }, [disabled, sdkLoaded, initializePersonaClient]);

  const handleCancelKYC = useCallback(() => {
    if (clientRef.current) {
      try {
        clientRef.current.cancel(true);
      } catch {
        // Silently handle cancellation errors
      }
    }
    setIsKYCOpen(false);
    setVerificationStep('idle');
    setIsLoading(false);
    onCancel?.();
  }, [onCancel]);

  const getButtonText = () => {
    if (!sdkLoaded) return 'Loading KYC System...';
    switch (kycStatus) {
      case 'loading':
        return STEP_MESSAGES[verificationStep];
      case 'completed':
        return 'Identity Verified';
      case 'error':
        return 'Retry Identity Verification';
      default:
        // Show resume option if there's a stored session
        return hasStoredSession ? 'Resume Verification' : 'KYC with Persona';
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

      {isVerified ? (
        <div className={styles.successBox}>
          <p className={styles.successText}>
            {serverVerified ? 'Recipient identity verified' : 'Identity verified successfully'}
          </p>
          <p className={styles.successNote}>
            {serverVerified 
              ? 'This recipient address has completed KYC verification.'
              : 'You can now create proposals that will be eligible for execution.'}
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

          {hasStoredSession && (
            <p className={styles.resumeNote}>
              You have an incomplete verification session. Click above to continue where you left off.
            </p>
          )}

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
              <p>{STEP_MESSAGES[verificationStep]}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
