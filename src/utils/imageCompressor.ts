/**
 * Utility for client-side image compression and conversion to Base64 data URL.
 * Keeps book cover uploads lightweight (~30-70KB) so they can be saved directly
 * into Firestore documents without requiring extra storage bucket billing or setup.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputFormat?: 'image/jpeg' | 'image/webp';
}

export async function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<{ dataUrl: string; originalSize: number; compressedSize: number }> {
  const {
    maxWidth = 600,
    maxHeight = 900,
    quality = 0.82,
    outputFormat = 'image/jpeg'
  } = options;

  if (!file.type.startsWith('image/')) {
    throw new Error('O arquivo selecionado não é uma imagem válida.');
  }

  // 15MB limit before client compression
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('A imagem selecionada é muito pesada (máximo 15MB).');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler arquivo da imagem.'));
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Falha ao processar o arquivo de imagem.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio scaling
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível inicializar o processador de imagem.'));
          return;
        }

        // Draw image onto canvas
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to data URL
        const dataUrl = canvas.toDataURL(outputFormat, quality);
        const compressedSize = Math.round((dataUrl.length * 3) / 4);

        resolve({
          dataUrl,
          originalSize: file.size,
          compressedSize,
        });
      };

      img.src = readerEvent.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
