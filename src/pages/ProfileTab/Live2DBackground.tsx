import { useEffect, useRef, useCallback } from "react";
import * as PIXI from "pixi.js";
import { Live2DModel } from "pixi-live2d-display/cubism4";

// pixi-live2d-display 要求 window.PIXI 存在以注册 Ticker 自动更新
// 注意：不要在 cleanup 中 delete，因为模块顶层代码只执行一次
(window as unknown as Record<string, unknown>).PIXI = PIXI;

/** 等待 Cubism Core SDK (async script) 加载完成 */
function waitForCubismCore(timeout = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as unknown as Record<string, unknown>).Live2DCubismCore) {
      resolve();
      return;
    }
    const start = Date.now();
    const check = () => {
      if ((window as unknown as Record<string, unknown>).Live2DCubismCore) {
        resolve();
      } else if (Date.now() - start > timeout) {
        reject(new Error("[Live2D] Cubism Core SDK 加载超时"));
      } else {
        requestAnimationFrame(check);
      }
    };
    requestAnimationFrame(check);
  });
}

interface Live2DBackgroundProps {
  modelPath: string;
  opacity?: number;
  className?: string;
}

/** 将模型适配到容器中心 */
function fitModelToContainer(
  model: InstanceType<typeof Live2DModel>,
  width: number,
  height: number,
) {
  const scale = (height / (model.height || 1)) * 0.8;
  model.scale.set(scale, scale);
  model.x = width / 2;
  model.y = height / 2;
}

export function Live2DBackground({
  modelPath,
  opacity = 0.4,
  className = "",
}: Live2DBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const modelRef = useRef<InstanceType<typeof Live2DModel> | null>(null);
  const rafRef = useRef<number>(0);

  const handleResize = useCallback(() => {
    // RAF 节流，避免快速 resize 时大量重算
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const app = appRef.current;
      const model = modelRef.current;
      const canvas = canvasRef.current;
      if (!app || !model || !canvas) return;

      const parent = canvas.parentElement;
      if (!parent) return;

      const { width, height } = parent.getBoundingClientRect();
      app.renderer.resize(width, height);
      fitModelToContainer(model, width, height);
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const { width, height } = parent.getBoundingClientRect();

    // 容器尚未完成布局（0 尺寸），PixiJS 会因 WebGL shader 参数为 0 而崩溃
    if (width === 0 || height === 0) return;

    let app: PIXI.Application;
    try {
      app = new PIXI.Application({
        view: canvas,
        width,
        height,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
      });
    } catch (err) {
      console.warn("[Live2D] PixiJS 初始化失败，静默降级:", err);
      return;
    }
    appRef.current = app;

    let destroyed = false;

    const hitHandler = (hitAreas: string[]) => {
      if (hitAreas.includes("Body")) {
        modelRef.current?.motion("tap_body");
      } else if (hitAreas.includes("Head")) {
        modelRef.current?.expression();
      } else {
        modelRef.current?.motion("idle");
      }
    };

    waitForCubismCore()
      .then(() => Live2DModel.from(modelPath, { autoInteract: true }))
      .then((model) => {
        if (destroyed) {
          model.destroy();
          return;
        }
        modelRef.current = model;
        app.stage.addChild(model);

        model.anchor.set(0.5, 0.5);
        fitModelToContainer(model, width, height);

        model.on("hit", hitHandler);
      })
      .catch((err) => {
        console.warn("[Live2D] 模型加载失败，静默降级:", err);
      });

    window.addEventListener("resize", handleResize);

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", handleResize);

      // 显式移除事件监听器再销毁模型
      if (modelRef.current) {
        modelRef.current.off("hit", hitHandler);
        modelRef.current.destroy();
        modelRef.current = null;
      }

      // 销毁 app，但不移除 canvas DOM（React 管理 canvas 生命周期）
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
