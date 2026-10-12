import imageToTextHandler from "../serverless-handlers/image-to-text";
import translateTextHandler from "../serverless-handlers/translate-text";
import cetCellNoticesHandler from "../serverless-handlers/cetcell-notices";
import healthHandler from "../serverless-handlers/health";
import aiDocumentDetectHandler from "../serverless-handlers/ai-document-detect";
import qrUploadHandler from "../serverless-handlers/qr-upload";
import qrFilesHandler from "../serverless-handlers/qr-files";
import qrVaultHandler from "../serverless-handlers/qr-vault";
import qrVerifyHandler from "../serverless-handlers/qr-verify";
import qrEventsHandler from "../serverless-handlers/qr-events";
import authLoginHandler from "../serverless-handlers/auth/login";
import usersHandler from "../serverless-handlers/users";
import usersSyncHandler from "../serverless-handlers/users/sync";
import usersLookupHandler from "../serverless-handlers/users/lookup";
import usersToggleStatusHandler from "../serverless-handlers/users/toggle-status";
import usersToggleApiKeyHandler from "../serverless-handlers/users/toggle-api-key";
import userIdHandler from "../serverless-handlers/users/[id]";
import vaultLogAttachmentHandler from "../serverless-handlers/vault/log-attachment";

export const config = {
  maxDuration: 60,
};

/**
 * Consolidated Vercel Serverless Function Catch-All Router.
 * Replaces separate serverless functions with a single deployable endpoint
 * keeping Vercel Hobby tier usage strictly at 1 Serverless Function.
 */
export default async function handler(req: any, res: any) {
  // Normalize URL and path
  const reqUrl = req.url || '';
  const parsedUrl = new URL(reqUrl, `http://${req.headers?.host || 'localhost'}`);
  const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/';
  req.query = req.query || {};

  // Standard Cross-Origin Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-gemini-api-key'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. Health check: /api/health or /health
    if (pathname === '/api/health' || pathname === '/health') {
      return await healthHandler(req, res);
    }

    // 2. Auth routes: /api/auth/login
    if (pathname === '/api/auth/login') {
      return await authLoginHandler(req, res);
    }

    // 3. User Lookup routes:
    //    /api/users/lookup/:username OR /api/users/lookup?username=...
    if (pathname.startsWith('/api/users/lookup')) {
      const sub = pathname.replace('/api/users/lookup', '').replace(/^\/+/, '');
      if (sub) {
        req.query.username = decodeURIComponent(sub);
      }
      return await usersLookupHandler(req, res);
    }

    // 4. User sub-actions:
    if (pathname === '/api/users/sync') {
      return await usersSyncHandler(req, res);
    }
    if (pathname === '/api/users/toggle-status') {
      return await usersToggleStatusHandler(req, res);
    }
    if (pathname === '/api/users/toggle-api-key') {
      return await usersToggleApiKeyHandler(req, res);
    }

    // 5. User dynamic / single user: /api/users/:id
    if (pathname.startsWith('/api/users/') && pathname !== '/api/users') {
      const sub = pathname.replace('/api/users/', '').replace(/^\/+/, '');
      if (sub) {
        req.query.id = decodeURIComponent(sub);
      }
      return await userIdHandler(req, res);
    }

    // 6. Base /api/users route (GET all users, POST create/update user, DELETE user)
    if (pathname === '/api/users') {
      return await usersHandler(req, res);
    }

    // 7. AI & Gemini routes:
    if (pathname === '/api/image-to-text') {
      return await imageToTextHandler(req, res);
    }
    if (pathname === '/api/ai-document-detect') {
      return await aiDocumentDetectHandler(req, res);
    }
    if (pathname === '/api/translate-text') {
      return await translateTextHandler(req, res);
    }

    // 8. CET Cell notices:
    if (pathname === '/api/cetcell-notices') {
      return await cetCellNoticesHandler(req, res);
    }

    // 9. QR File Upload, Live Events, Vault, Verification:
    if (pathname === '/api/qr-upload') {
      return await qrUploadHandler(req, res);
    }
    if (pathname === '/api/qr-files') {
      return await qrFilesHandler(req, res);
    }
    if (pathname === '/api/qr-vault') {
      return await qrVaultHandler(req, res);
    }
    if (pathname === '/api/qr-verify') {
      return await qrVerifyHandler(req, res);
    }
    if (pathname === '/api/qr-events') {
      return await qrEventsHandler(req, res);
    }

    // 10. Vault Log Attachment:
    if (pathname === '/api/vault/log-attachment' || pathname.startsWith('/api/vault')) {
      return await vaultLogAttachmentHandler(req, res);
    }

    // Fallback info for undefined API path
    return res.status(200).json({
      message: 'FC Admission Portal Consolidated API Gateway',
      status: 'online',
      path: pathname,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(`[API GATEWAY ERROR] ${pathname}:`, error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Internal Server Error in API Gateway',
    });
  }
}
