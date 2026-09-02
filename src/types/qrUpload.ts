export interface QrUploadedFile {
  id: string;
  sessionId: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
  isDownloadedToSoftware?: boolean;
  verifiedStamp?: boolean;
  category?: string;
  notes?: string;
}

export const QR_BROADCAST_CHANNEL = 'vmk_qr_file_sync_channel';

// Helper to format file sizes
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Convert File to Base64 Data URL with automatic optimization for high-res photos
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // If it's a PDF or non-image, read directly as data URL
    if (file.type === 'application/pdf' || !file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
      return;
    }

    // For images, optimize dimensions and compression for rapid cross-device transmission
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 2200; // Sharp document resolution
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const quality = file.type === 'image/png' ? undefined : 0.90;
        const optimizedDataUrl = canvas.toDataURL(mime, quality);
        resolve(optimizedDataUrl);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

// Print document directly from software without saving to user's device hard drive
export function printDocumentDirectly(dataUrl: string, fileName: string, isImage = false) {
  try {
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      if (isImage || dataUrl.startsWith('data:image/')) {
        frameDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${fileName} - In-Software Print</title>
              <style>
                @page { margin: 10mm; size: auto; }
                body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; }
                .header { font-size: 12px; color: #555; margin-bottom: 12px; text-align: center; border-bottom: 1px solid #ccc; width: 100%; padding-bottom: 6px; }
                img { max-width: 100%; max-height: 90vh; object-fit: contain; }
              </style>
            </head>
            <body>
              <div class="header">In-Software Candidate Document: ${fileName}</div>
              <img src="${dataUrl}" onload="window.print();" />
            </body>
          </html>
        `);
      } else {
        frameDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${fileName} - In-Software Print</title>
              <style>
                body { margin: 0; }
                iframe { width: 100vw; height: 100vh; border: none; }
              </style>
            </head>
            <body>
              <iframe src="${dataUrl}"></iframe>
              <script>
                setTimeout(function() { window.print(); }, 800);
              </script>
            </body>
          </html>
        `);
      }
      frameDoc.close();

      setTimeout(() => {
        try {
          document.body.removeChild(printFrame);
        } catch {
          // ignore
        }
      }, 60000);
    }
  } catch (err) {
    console.error('In-Software print error:', err);
    // Fallback in-tab open
    const w = window.open(dataUrl, '_blank');
    if (w) {
      setTimeout(() => w.print(), 1000);
    }
  }
}

// Trigger optional browser OS download if the user explicitly chooses to export outside software
export function triggerFileDownload(dataUrl: string, fileName: string) {
  try {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Download error:', err);
    const win = window.open();
    if (win) {
      win.document.write(
        `<iframe src="${dataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
      );
    }
  }
}
