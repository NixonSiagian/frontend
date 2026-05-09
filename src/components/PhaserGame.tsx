import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { WorldScene } from "./game/WorldScene";

type PhaserGameProps = {
  onError?: (error: Error) => void;
};

function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  return new Error(typeof value === "string" ? value : "Unknown Phaser runtime error");
}

export default function PhaserGame({ onError }: PhaserGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    const isMobile =
      (typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches) ||
      /Mobi|Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);
    const width = Math.max(window.innerWidth || 0, 320);
    const height = Math.max(window.innerHeight || 0, 480);

    let contextLostHandler: ((event: Event) => void) | null = null;

    try {
      const config: Phaser.Types.Core.GameConfig = {
        type: isMobile ? Phaser.CANVAS : Phaser.AUTO,
        parent: containerRef.current,
        width,
        height,
        backgroundColor: "#b8a888",
        pixelArt: true,
        scene: [WorldScene],
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
      };

      gameRef.current = new Phaser.Game(config);

      const canvas = gameRef.current.canvas as HTMLCanvasElement | null;
      if (canvas) {
        contextLostHandler = (event: Event) => {
          event.preventDefault();
          onError?.(new Error("Graphics context lost while running Phaser."));
        };
        canvas.addEventListener("webglcontextlost", contextLostHandler, false);
      }
    } catch (error) {
      const normalizedError = toError(error);
      onError?.(normalizedError);
      if (import.meta.env.DEV) {
        console.error("Phaser initialization failed:", normalizedError);
      }
    }

    return () => {
      if (gameRef.current) {
        const canvas = gameRef.current.canvas as HTMLCanvasElement | null;
        if (canvas && contextLostHandler) {
          canvas.removeEventListener("webglcontextlost", contextLostHandler);
        }
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [onError]);

  return (
    <div
      ref={containerRef}
      data-testid="phaser-container"
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}
