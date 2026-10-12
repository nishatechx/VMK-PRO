import imageToTextHandler from "./image-to-text";
import translateTextHandler from "./translate-text";
import cetCellNoticesHandler from "./cetcell-notices";
import healthHandler from "./health";
import aiDocumentDetectHandler from "./ai-document-detect";
import qrUploadHandler from "./qr-upload";
import qrFilesHandler from "./qr-files";
import qrVaultHandler from "./qr-vault";
import qrVerifyHandler from "./qr-verify";
import qrEventsHandler from "./qr-events";
import authLoginHandler from "./auth/login";
import usersHandler from "./users";
import usersSyncHandler from "./users/sync";
import usersLookupHandler from "./users/lookup";
import usersToggleStatusHandler from "./users/toggle-status";
import usersToggleApiKeyHandler from "./users/toggle-api-key";

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  const url = req.url || '';
  
  if (url.includes('auth/login')) {
    return authLoginHandler(req, res);
  }
  if (url.includes('users/sync')) {
    return usersSyncHandler(req, res);
  }
  if (url.includes('users/lookup')) {
    return usersLookupHandler(req, res);
  }
  if (url.includes('users/toggle-status')) {
    return usersToggleStatusHandler(req, res);
  }
  if (url.includes('users/toggle-api-key')) {
    return usersToggleApiKeyHandler(req, res);
  }
  if (url.includes('users')) {
    return usersHandler(req, res);
  }
  if (url.includes('image-to-text')) {
    return imageToTextHandler(req, res);
  }
  if (url.includes('ai-document-detect')) {
    return aiDocumentDetectHandler(req, res);
  }
  if (url.includes('translate-text')) {
    return translateTextHandler(req, res);
  }
  if (url.includes('cetcell-notices')) {
    return cetCellNoticesHandler(req, res);
  }
  if (url.includes('qr-upload')) {
    return qrUploadHandler(req, res);
  }
  if (url.includes('qr-files')) {
    return qrFilesHandler(req, res);
  }
  if (url.includes('qr-vault')) {
    return qrVaultHandler(req, res);
  }
  if (url.includes('qr-verify')) {
    return qrVerifyHandler(req, res);
  }
  if (url.includes('qr-events')) {
    return qrEventsHandler(req, res);
  }
  if (url.includes('health')) {
    return healthHandler(req, res);
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    message: 'FC Admission Portal API Gateway',
    status: 'online',
    timestamp: new Date().toISOString(),
  });
}
