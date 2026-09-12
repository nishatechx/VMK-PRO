import imageToTextHandler from "./image-to-text";
import translateTextHandler from "./translate-text";
import cetCellNoticesHandler from "./cetcell-notices";
import healthHandler from "./health";

export default async function handler(req: any, res: any) {
  const url = req.url || '';
  
  if (url.includes('image-to-text')) {
    return imageToTextHandler(req, res);
  }
  if (url.includes('translate-text')) {
    return translateTextHandler(req, res);
  }
  if (url.includes('cetcell-notices')) {
    return cetCellNoticesHandler(req, res);
  }
  if (url.includes('health')) {
    return healthHandler(req, res);
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json({
    message: 'FC Admission Portal API Gateway',
    status: 'online',
    endpoints: [
      '/api/image-to-text',
      '/api/translate-text',
      '/api/cetcell-notices',
      '/api/health',
    ],
  });
}
