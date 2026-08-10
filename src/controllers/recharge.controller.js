import { config } from '../config/env.js';
import { User } from '../models/User.js';

export async function generateQrCode(req, res) {
  try {
    const { userId, bookId = 324, amount } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ error: 'userId and amount are required' });
    }

    // Lookup user to resolve their numeric agency ID
    const user = await User.findById(userId);
    let agencyIdNum = 23;
    if (user) {
      const rawAgencyId = user.agency_id || user.agency_unq_id || '';
      if (rawAgencyId) {
        let numericPart = rawAgencyId;
        if (rawAgencyId.includes('-')) {
          const parts = rawAgencyId.split('-');
          numericPart = parts[parts.length - 1];
        }
        const parsed = parseInt(numericPart, 10);
        if (!isNaN(parsed)) {
          agencyIdNum = parsed;
        }
      }
    }

    const payload = {
      action: 'get_qr_code',
      book_id: Number(bookId),
      agency_id: agencyIdNum,
      amount: Number(amount)
    };

    console.log(`[RechargeController] Contacting PHP API at ${config.phpApiUrl} for QR generation:`, payload);

    let qrUrl = null;
    let qrId = null;
    let qrAvailable = false;
    let message = 'QR code generated successfully';

    try {
      const response = await fetch(config.phpApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        if (result && result.success) {
          if (result.qr_available) {
            qrUrl = result.qr_image_url;
            qrId = result.qr_id;
            qrAvailable = true;
            message = result.message || message;
          } else {
            // Cash transaction only
            return res.json({
              success: true,
              qr_available: false,
              qr_id: null,
              message: result.message || 'Only Cash Transaction Available.'
            });
          }
        }
      }
    } catch (apiErr) {
      console.warn('[RechargeController] PHP API connection failed, falling back to mock QR code:', apiErr.message);
    }

    if (!qrUrl) {
      return res.json({
        success: false,
        qr_available: false,
        message: 'Having trouble generating QR code. Please try again later.'
      });
    }

    return res.json({
      success: true,
      qr_available: qrAvailable,
      qr_url: qrUrl,
      qr_id: qrId,
      message
    });
  } catch (err) {
    console.error('[RechargeController] Error in generateQrCode:', err);
    return res.status(500).json({ error: err.message });
  }
}
