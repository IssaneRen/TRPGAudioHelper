/** 压缩图片并返回 base64 data URL */
export function compressImage(
  file: File,
  maxSize = 600,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("请选择图片文件"));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error("图片文件不能超过 10MB"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/webp", quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("图片加载失败"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}
