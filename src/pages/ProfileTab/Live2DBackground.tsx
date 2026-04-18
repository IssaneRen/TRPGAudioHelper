import { useEffect, useRef, useCallback } from "react";
import * as PIXI from "pixi.js";
import { Live2DModel } from "pixi-live2d-display/cubism4";

// pixi-live2d-display 要求 window.PIXI 存在以注册 Ticker 自动更新
(window as unknown as Record<string, unknown>).PIXI = PIXI;

interface Live2DBackgroundProps {
  modelPath: string;
  opacity?: number;
  className?: string;
}

export function Live2DBackground({
  modelPath,
  opacity = 0.4,
  className = "",
}: Live2DBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const modelRef = useRef<InstanceType<typeof Live2DModel> | null>(null);

  const handleResize = useCallback(() => {
    const app = appRef.current;
    const model = modelRef.current;
    const canvas = canvasRef.current;
    if (!app || !model || !canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const { width, height } = parent.getBoundingClientRect();
    app.renderer.resize(width, height);

    const scale = (height / (model.height || 1)) * 0.8;
    model.scale.set(scale, scale);
    model.x = width / 2;
    model.y = height / 2;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const { width, height } = parent.getBoundingClientRect();

    const app = new PIXI.Application({
      view: canvas,
      width,
      height,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });
    appRef.current = app;

    let destroyed = false;

    Live2DModel.from(modelPath, { autoInteract: true })
      .then((model) => {
        if (destroyed) {
          model.destroy();
          return;
        }
        modelRef.current = model;
        app.stage.addChild(model);

        const scale = (height / (model.height || 1)) * 0.8;
        model.scale.set(scale, scale);
        model.anchor.set(0.5, 0.5);
        model.x = width / 2;
        model.y = height / 2;

        model.on("hit", (hitAreas: string[]) => {
          if (hitAreas.includes("Body")) {
            model.motion("tap_body");
          } else if (hitAreas.includes("Head")) {
            model.expression();
          } else {
            model.motion("idle");
          }
        });
      })
      .catch((err) => {
        console.warn("[Live2D] 模型加载失败，静默降级:", err);
      });

    window.addEventListener("resize", handleResize);

    return () => {
      destroyed = true;
      window.removeEventListener("resize", handleResize);
      if (modelRef.current) {
        modelRef.current.destroy();
        modelRef.current = null;
      }
      app.destroy(false, { children: true });
      appRef.current = null;
    };
  }, [modelPath, handleResize]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        opacity,
        willChange: "transform",
        transform: "translateZ(0)",
        pointerEvents: "auto",
      }}
    />
  );
}
