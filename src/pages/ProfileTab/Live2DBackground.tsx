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

/** 等待元素有非零尺寸（父容器布局完成） */
function waitForNonZeroSize(
  el: Element,
  signal: { destroyed: boolean },
  maxRetries = 120,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    let tries = 0;
    const check = () => {
      if (signal.destroyed) {
        reject(new Error("cancelled"));
        return;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        resolve({ width: rect.width, height: rect.height });
      } else if (tries++ < maxRetries) {
        requestAnimationFrame(check);
      } else {
        reject(new Error("[Live2D] 父容器尺寸始终为 0，放弃初始化"));
      }
    };
    check();
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
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const app = appRef.current;
      const model = modelRef.current;
      const canvas = canvasRef.current;
      if (!app || !model || !canvas) return;

      const parent = canvas.parentElement;
      if (!parent) return;

      const { width, height } = parent.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      app.renderer.resize(width, height);
      fitModelToContainer(model, width, height);
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const signal = { destroyed: false };

    const hitHandler = (hitAreas: string[]) => {
      if (hitAreas.includes("Body")) {
        modelRef.current?.motion("tap_body");
      } else if (hitAreas.includes("Head")) {
        modelRef.current?.expression();
      } else {
        modelRef.current?.motion("idle");
      }
    };

    // 先等待容器有尺寸，再初始化 PixiJS + 加载模型
    waitForNonZeroSize(parent, signal)
      .then(({ width, height }) => {
        if (signal.destroyed) return;

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

        return waitForCubismCore()
          .then(() => Live2DModel.from(modelPath, { autoInteract: true }))
          .then((model) => {
            if (signal.destroyed) {
              model.destroy();
              return;
            }
            modelRef.current = model;
            app.stage.addChild(model);

            model.anchor.set(0.5, 0.5);
            fitModelToContainer(model, width, height);

            model.on("hit", hitHandler);
          });
      })
      .catch((err) => {
        if (signal.destroyed) return;
        console.warn("[Live2D] 初始化失败，静默降级:", err);
      });

    window.addEventListener("resize", handleResize);

    return () => {
      signal.destroyed = true;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", handleResize);

      if (modelRef.current) {
        modelRef.current.off("hit", hitHandler);
        modelRef.current.destroy();
        modelRef.current = null;
      }

      if (appRef.current) {
        appRef.current.destroy(false, { children: true });
        appRef.current = null;
      }
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
