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
    let rangeId = null;
    let empId = null;
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
            rangeId = result.range_id;
            empId = result.emp_id;
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
      range_id: rangeId,
      emp_id: empId,
      message
    });
  } catch (err) {
    console.error('[RechargeController] Error in generateQrCode:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function submitRecharge(req, res) {
  try {
    console.log("inside submit recharge fn")
    const { userId, qrId, rangeId, amount, empId, bookId, transactionId, image } = req.body;

    if (!userId || !amount || !transactionId || !image) {
      return res.status(400).json({ error: 'userId, amount, transactionId, and image are required' });
    }

    // Lookup user to resolve their numeric user ID (id)
    const user = await User.findById(userId);
    const resolvedUserId = (user && user.id) ? user.id : userId;

    const payload = {
      action: 'recharge_by_user',
      user_id: resolvedUserId,
      qr_id: qrId ? Number(qrId) : null,
      range_id: rangeId ? Number(rangeId) : null,
      amount: Number(amount),
      emp_id: empId ? Number(empId) : null,
      book_id: bookId ? Number(bookId) : null,
      transaction_id: transactionId,
      image: image // Base64 string
    };

    console.log(`[RechargeController] Submitting recharge to PHP API at ${config.phpApiUrl}:`, {
      ...payload,
      image: payload.image ? `${payload.image.substring(0, 30)}...` : null
    });

    const response = await fetch(config.phpApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`PHP API returned status ${response.status}`);
    }

    const result = await response.json();
    return res.json(result);
  } catch (err) {
    console.log("inside submit recharge fn")
    console.error('[RechargeController] Error in submitRecharge:', err);
    return res.status(500).json({ error: err.message });
  }
}
