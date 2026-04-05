"use client";

/**
 * SoundJam
 * Audio player with waveform visualization inspired by classic Mac SoundJam
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { AppComponentProps } from "@/OS/types/app";
import { filesystem } from "@/OS/lib/Filesystem";
import styles from "./SoundJam.module.css";

interface SoundJamInitialState {
  filePath?: string;
}

export function SoundJam({ windowId, initialState }: AppComponentProps) {
  const state = initialState as SoundJamInitialState | undefined;
  const [filePath, setFilePath] = useState<string | null>(state?.filePath || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [playlist, setPlaylist] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number>(0);

  // Load audio and build playlist from folder
  useEffect(() => {
    if (!filePath) return;

    const loadPlaylist = async () => {
      const parentPath = filesystem.getParentPath(filePath);
      const siblings = await filesystem.readDirectory(parentPath);
      const audioFiles = siblings
        .filter((f) => f.mimeType?.startsWith("audio/"))
        .map((f) => f.path);
      setPlaylist(audioFiles);
      setCurrentIndex(audioFiles.indexOf(filePath));
    };

    loadPlaylist();
  }, [filePath]);

  // Setup Web Audio API for visualization
  const setupAudioContext = useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return;

    try {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(audioRef.current);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;

      source.connect(analyzer);
      analyzer.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      analyzerRef.current = analyzer;
    } catch (err) {
      console.error("Failed to setup audio context:", err);
    }
  }, []);

  // Waveform visualization
  useEffect(() => {
    if (!canvasRef.current || !analyzerRef.current || !isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyzer = analyzerRef.current;
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isPlaying) return;

      animationRef.current = requestAnimationFrame(draw);
      analyzer.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.9;

        // Gradient from accent color to lighter version
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, "#6366f1");
        gradient.addColorStop(1, "#a5b4fc");

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  // Playback controls
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;

    // Setup audio context on first interaction
    if (!audioContextRef.current) {
      setupAudioContext();
    }

    if (audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  }, [isPlaying, setupAudioContext]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const playNext = useCallback(() => {
    if (currentIndex < playlist.length - 1) {
      setFilePath(playlist[currentIndex + 1]);
    } else if (isLooping && playlist.length > 0) {
      setFilePath(playlist[0]);
    }
  }, [currentIndex, playlist, isLooping]);

  const playPrevious = useCallback(() => {
    if (currentTime > 3) {
      seek(0);
    } else if (currentIndex > 0) {
      setFilePath(playlist[currentIndex - 1]);
    }
  }, [currentTime, currentIndex, playlist, seek]);

  // Audio event handlers
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    playNext();
  }, [playNext]);

  const handlePlay = useCallback(() => setIsPlaying(true), []);
  const handlePause = useCallback(() => setIsPlaying(false), []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          playPrevious();
          break;
        case "ArrowRight":
          playNext();
          break;
        case "ArrowUp":
          setVolume((v) => Math.min(v + 0.1, 1));
          break;
        case "ArrowDown":
          setVolume((v) => Math.max(v - 0.1, 0));
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, playPrevious, playNext]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Auto-play when file changes
  useEffect(() => {
    if (filePath && audioRef.current) {
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [filePath]);

  const fileName =
    filePath?.split("/").pop()?.replace(/\.[^/.]+$/, "") || "No track";

  if (!filePath) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <p>🎵</p>
          <p>No audio file open</p>
          <p className={styles.hint}>Open an audio file from Finder</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <audio
        ref={audioRef}
        src={filePath ? `/filesystem${filePath}` : undefined}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={handlePlay}
        onPause={handlePause}
        loop={isLooping && playlist.length === 1}
      />

      {/* Visualization */}
      <canvas
        ref={canvasRef}
        className={styles.visualizer}
        width={380}
        height={60}
      />

      {/* Track info */}
      <div className={styles.trackInfo}>
        <span className={styles.trackName}>{fileName}</span>
        <span className={styles.time}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Progress bar */}
      <input
        type="range"
        className={styles.progressBar}
        min={0}
        max={duration || 100}
        value={currentTime}
        onChange={(e) => seek(Number(e.target.value))}
      />

      {/* Controls */}
      <div className={styles.controls}>
        <button onClick={playPrevious} title="Previous">
          ⏮
        </button>
        <button
          onClick={togglePlay}
          className={styles.playButton}
          title="Play/Pause"
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button onClick={playNext} title="Next">
          ⏭
        </button>

        <div className={styles.volumeControl}>
          <span>{volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </div>

        <button
          onClick={() => setIsLooping(!isLooping)}
          className={isLooping ? styles.active : ""}
          title="Loop"
        >
          🔁
        </button>

        <button onClick={() => setShowPlaylist(!showPlaylist)} title="Playlist">
          ☰
        </button>
      </div>

      {/* Playlist */}
      {showPlaylist && playlist.length > 0 && (
        <div className={styles.playlist}>
          {playlist.map((path, index) => (
            <div
              key={path}
              className={`${styles.playlistItem} ${
                index === currentIndex ? styles.current : ""
              }`}
              onClick={() => setFilePath(path)}
            >
              <span className={styles.playlistIndex}>{index + 1}</span>
              <span className={styles.playlistName}>
                {path.split("/").pop()?.replace(/\.[^/.]+$/, "")}
              </span>
              {index === currentIndex && isPlaying && (
                <span className={styles.nowPlaying}>♪</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

