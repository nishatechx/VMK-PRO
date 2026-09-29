import { QrUploadedFile } from '../types/qrUpload';
import { db } from '../lib/firebase';
import { sanitizeForFirestore } from './authService';
import { collection, doc, setDoc } from 'firebase/firestore';
import { safeStorage } from '../utils/safeStorage';

export interface VaultAttachmentAuditLog {
  id: string;
  fileId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  userId?: string;
  userName?: string;
  targetSite: string;
  attachedAt: string;
  method: 'extension_bridge' | 'clipboard_paste' | 'in_app_simulator' | 'direct_download';
  status: 'success' | 'failed';
  details?: string;
}

export const VAULT_BRIDGE_CHANNEL = 'vmk_vault_portal_bridge';
export const TARGET_PORTAL_URL = 'https://sac.maharashtracet.org/mhcet/portal/tickets/my-tickets';
export const TARGET_PORTAL_DOMAIN = 'sac.maharashtracet.org';

const AUDIT_LOGS_STORAGE_KEY = 'vmk_vault_attachment_audit_logs';

let broadcastBridge: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastBridge = new BroadcastChannel(VAULT_BRIDGE_CHANNEL);
  }
} catch {
  // BroadcastChannel unavailable
}

/**
 * Validates if a vault file matches the accepted file formats specified by target input
 */
export function isFileFormatAccepted(fileName: string, mimeType: string, acceptedFormats?: string[]): boolean {
  if (!acceptedFormats || acceptedFormats.length === 0) return true;

  const lowerName = fileName.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  return acceptedFormats.some((rule) => {
    const r = rule.trim().toLowerCase();
    if (!r) return true;

    // Wildcard e.g. "image/*"
    if (r.endsWith('/*')) {
      const prefix = r.slice(0, -2);
      return lowerMime.startsWith(prefix);
    }

    // Extension e.g. ".pdf", ".jpg", ".png"
    if (r.startsWith('.')) {
      return lowerName.endsWith(r);
    }

    // Exact MIME type e.g. "application/pdf"
    return lowerMime === r;
  });
}

/**
 * Validates if file size is within target website restrictions
 */
export function isFileSizeAccepted(fileSizeBytes: number, maxSizeBytes?: number): boolean {
  if (!maxSizeBytes || maxSizeBytes <= 0) return true;
  return fileSizeBytes <= maxSizeBytes;
}

/**
 * Converts a base64 Data URL or SVG Data URL into a real browser Blob
 */
export async function dataUrlToBlob(dataUrl: string, fallbackMime = 'application/octet-stream'): Promise<Blob> {
  // Handle SVG text data url
  if (dataUrl.startsWith('data:image/svg+xml')) {
    const parts = dataUrl.split(',');
    const isBase64 = parts[0].includes('base64');
    const content = isBase64 ? atob(parts[1]) : decodeURIComponent(parts[1]);
    return new Blob([content], { type: 'image/svg+xml' });
  }

  // Handle standard base64 data URL
  if (dataUrl.startsWith('data:')) {
    const res = await fetch(dataUrl);
    return await res.blob();
  }

  // Raw base64 string
  const byteCharacters = atob(dataUrl);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: fallbackMime });
}

/**
 * Copies the real binary file to the OS system clipboard using the modern Clipboard File API.
 * This allows the user to immediately press Ctrl+V into the target website's dropzone / file control.
 */
export async function copyFileBlobToClipboard(file: QrUploadedFile): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard || !navigator.clipboard.write) {
      console.warn('Clipboard File API is not supported in this browser environment');
      return false;
    }

    const blob = await dataUrlToBlob(file.dataUrl, file.type);

    // Modern browsers support image types on clipboard directly
    if (file.type.startsWith('image/') || file.name.match(/\.(png|jpg|jpeg|webp)$/i)) {
      // Ensure PNG format for widest OS clipboard compatibility if needed
      const item = new ClipboardItem({ [blob.type]: blob });
      await navigator.clipboard.write([item]);
      return true;
    }

    // For PDF or other documents, write standard mime if supported
    try {
      const item = new ClipboardItem({ [blob.type]: blob });
      await navigator.clipboard.write([item]);
      return true;
    } catch {
      // Some browsers restrict non-image mime types on clipboard
      return false;
    }
  } catch (err) {
    console.warn('Could not copy file to clipboard:', err);
    return false;
  }
}

/**
 * Attaches a Vault File directly into an <input type="file"> DOM element via DataTransfer API
 */
export async function attachVaultFileToInput(
  inputElement: HTMLInputElement,
  file: QrUploadedFile
): Promise<boolean> {
  try {
    const blob = await dataUrlToBlob(file.dataUrl, file.type);
    const nativeFile = new File([blob], file.name, {
      type: file.type || blob.type || 'application/octet-stream',
      lastModified: new Date(file.uploadedAt || Date.now()).getTime(),
    });

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(nativeFile);

    inputElement.files = dataTransfer.files;

    // Dispatch native change and input events so framework bindings (React, Vue, Angular, jQuery) pick it up
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    inputElement.dispatchEvent(new Event('change', { bubbles: true }));

    return true;
  } catch (err) {
    console.error('Failed to attach file to input:', err);
    return false;
  }
}

/**
 * Broadcasts a selected Vault File to any listening companion scripts (such as on sac.maharashtracet.org)
 */
export function broadcastVaultFileSelection(file: QrUploadedFile) {
  if (broadcastBridge) {
    try {
      broadcastBridge.postMessage({
        type: 'VAULT_FILE_SELECTED',
        source: 'vmk_webapp',
        file: {
          id: file.id,
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: file.dataUrl,
          uploadedAt: file.uploadedAt,
          category: file.category,
        },
        timestamp: Date.now(),
      });
    } catch (e) {
      console.warn('Broadcast to bridge failed:', e);
    }
  }

  // Also postMessage to window.opener if opened as popup
  if (typeof window !== 'undefined' && window.opener && window.opener !== window) {
    try {
      window.opener.postMessage(
        {
          type: 'VAULT_FILE_SELECTED',
          source: 'vmk_webapp',
          file: {
            id: file.id,
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl: file.dataUrl,
            uploadedAt: file.uploadedAt,
            category: file.category,
          },
        },
        '*'
      );
    } catch (e) {
      console.warn('postMessage to opener failed:', e);
    }
  }

  // Also postMessage to window.parent if in iframe
  if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
    try {
      window.parent.postMessage(
        {
          type: 'VAULT_FILE_SELECTED',
          source: 'vmk_webapp',
          file: {
            id: file.id,
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl: file.dataUrl,
            uploadedAt: file.uploadedAt,
            category: file.category,
          },
        },
        '*'
      );
    } catch (e) {
      console.warn('postMessage to parent failed:', e);
    }
  }
}

/**
 * Records an audit log event for security and compliance
 */
export async function logVaultAttachmentAudit(
  log: Omit<VaultAttachmentAuditLog, 'id' | 'attachedAt'>
): Promise<VaultAttachmentAuditLog> {
  const newLog: VaultAttachmentAuditLog = {
    ...log,
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    attachedAt: new Date().toISOString(),
  };

  // 1. Save to local storage
  try {
    const existing = safeStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
    const list: VaultAttachmentAuditLog[] = existing ? JSON.parse(existing) : [];
    list.unshift(newLog);
    if (list.length > 50) list.pop();
    safeStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Could not save audit log locally:', e);
  }

  // 2. Save to Firestore if available
  try {
    const docRef = doc(db, 'vault_audit_logs', newLog.id);
    await setDoc(docRef, sanitizeForFirestore(newLog));
  } catch (e) {
    // ignore
  }

  // 3. Post to backend server if available
  try {
    await fetch('/api/vault/log-attachment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLog),
    });
  } catch {
    // ignore
  }

  return newLog;
}

export function getAuditLogs(): VaultAttachmentAuditLog[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Generates the production-ready Tampermonkey Userscript code configured with the current app origin
 */
export function generateUserscriptCode(appOrigin: string): string {
  return `// ==UserScript==
// @name         MHCET Portal - Vault File Picker Bridge
// @namespace    https://sac.maharashtracet.org/
// @version      1.0.0
// @description  Injects 'Select from Vault' button next to file upload inputs on the MHCET portal
// @author       VMK Washim Scrutiny Center
// @match        https://sac.maharashtracet.org/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  const VAULT_WEBAPP_URL = '${appOrigin}';
  const BRIDGE_CHANNEL = 'vmk_vault_portal_bridge';
  let activeTargetInput = null;

  console.log('[MHCET-Vault-Bridge] Active on sac.maharashtracet.org');

  // BroadcastChannel for cross-tab file sync
  let channel = null;
  try {
    channel = new BroadcastChannel(BRIDGE_CHANNEL);
    channel.onmessage = (event) => {
      if (event.data?.type === 'VAULT_FILE_SELECTED' && event.data.file) {
        attachFileToActiveInput(event.data.file);
      }
    };
  } catch(e) {
    console.warn('[MHCET-Vault-Bridge] BroadcastChannel error:', e);
  }

  // Listen for window.postMessage from popup or iframe
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'VAULT_FILE_SELECTED' && event.data.file) {
      attachFileToActiveInput(event.data.file);
    }
  });

  async function attachFileToActiveInput(fileData) {
    if (!activeTargetInput) {
      // Find the first visible file input on the page if none explicitly clicked
      activeTargetInput = document.querySelector('input[type="file"]:not([disabled])');
    }

    if (!activeTargetInput) {
      alert('Vault File Selected: "' + fileData.name + '"\\nPlease click on an upload field first.');
      return;
    }

    try {
      // Convert Data URL to Blob
      const res = await fetch(fileData.dataUrl);
      const blob = await res.blob();
      const file = new File([blob], fileData.name, { type: fileData.type || blob.type });

      const dt = new DataTransfer();
      dt.items.add(file);
      activeTargetInput.files = dt.files;

      // Dispatch native change and input events
      activeTargetInput.dispatchEvent(new Event('input', { bubbles: true }));
      activeTargetInput.dispatchEvent(new Event('change', { bubbles: true }));

      // Visual feedback badge
      showSuccessBadge(activeTargetInput, fileData.name);
    } catch(err) {
      console.error('[MHCET-Vault-Bridge] Error attaching file:', err);
      alert('Could not attach file: ' + err.message);
    }
  }

  function showSuccessBadge(inputEl, fileName) {
    let badge = inputEl.parentElement.querySelector('.vmk-success-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'vmk-success-badge';
      badge.style.cssText = 'margin-top:6px; padding:6px 12px; background:#e6f4ea; color:#137333; border:1px solid #ceead6; border-radius:6px; font-size:12px; font-weight:600; display:inline-flex; align-items:center; gap:6px;';
      inputEl.parentElement.appendChild(badge);
    }
    badge.innerHTML = '✅ <b>' + fileName + '</b> attached from Vault! Ready to submit.';
  }

  function injectVaultButton(inputEl) {
    if (inputEl.dataset.vaultBridgeInjected) return;
    inputEl.dataset.vaultBridgeInjected = 'true';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vmk-vault-picker-btn';
    btn.innerHTML = '📁 Select from Vault';
    btn.title = 'Select candidate document directly from VMK Software Vault';
    btn.style.cssText = 'margin: 4px 6px; padding: 6px 14px; background: #0056A6; color: #ffffff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.15); transition: background 0.2s;';

    btn.addEventListener('mouseenter', () => btn.style.background = '#003B73');
    btn.addEventListener('mouseleave', () => btn.style.background = '#0056A6');

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      activeTargetInput = inputEl;

      const accept = inputEl.getAttribute('accept') || '';
      const pickerUrl = VAULT_WEBAPP_URL + '/?vaultPicker=true&accept=' + encodeURIComponent(accept) + '&source=mhcet_portal';

      const width = 640;
      const height = 720;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      window.open(pickerUrl, 'VaultPickerWindow', 'width=' + width + ',height=' + height + ',top=' + top + ',left=' + left + ',resizable=yes,scrollbars=yes');
    });

    if (inputEl.nextSibling) {
      inputEl.parentNode.insertBefore(btn, inputEl.nextSibling);
    } else {
      inputEl.parentNode.appendChild(btn);
    }
  }

  function scanAndInject() {
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs.forEach(injectVaultButton);
  }

  // Scan immediately and on DOM mutations
  scanAndInject();
  const observer = new MutationObserver(() => scanAndInject());
  observer.observe(document.body, { childList: true, subtree: true });
})();
`;
}
