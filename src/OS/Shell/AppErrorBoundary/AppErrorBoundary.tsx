"use client";

/**
 * AppErrorBoundary
 * Catches errors in app components and displays a crash dialog
 * Prevents one app crash from taking down the entire OS
 */

import { Component, ErrorInfo, ReactNode } from "react";
import styles from "./AppErrorBoundary.module.css";

interface Props {
  appId: string;
  appName: string;
  windowId: string;
  children: ReactNode;
  onClose: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[${this.props.appId}] App crashed:`, error, errorInfo);

    this.setState({ errorInfo });

    // Could emit to systemBus here for crash analytics
    // systemBus.emit('app:crashed', { appId, windowId, error: error.message });
  }

  handleRestart = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleClose = () => {
    this.props.onClose();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.crashDialog}>
          <div className={styles.icon}>💣</div>
          <h2 className={styles.title}>
            {this.props.appName} has unexpectedly quit
          </h2>
          <p className={styles.message}>
            {this.state.error?.message || "An unknown error occurred"}
          </p>
          {process.env.NODE_ENV === "development" && this.state.error?.stack && (
            <pre className={styles.stack}>
              {this.state.error.stack.split("\n").slice(0, 5).join("\n")}
            </pre>
          )}
          <div className={styles.buttons}>
            <button className={styles.button} onClick={this.handleRestart}>
              Restart
            </button>
            <button
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={this.handleClose}
            >
              Close
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

