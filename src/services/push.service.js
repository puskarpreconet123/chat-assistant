/**
 * Push Notification Service (FCM / APNs)
 */
export async function sendPushNotification({
  recipientId,
  senderId,
  conversationId,
  text,
  type = 'text',
  audio = null,
  image = null
}) {
  const notificationTitle = `New ${type === 'voice' ? 'voice note' : type === 'image' ? 'photo' : 'message'}`;
  
  // Format notification body using audio duration if type === 'voice'
  const durationText = audio && audio.duration ? ` (${audio.duration}s)` : '';
  const notificationBody = type === 'voice' 
    ? `🎙️ Sent a voice note${durationText}` 
    : type === 'image' 
      ? `📷 Sent a photo` 
      : text;

  // Custom data payload for FCM/APNs background handler
  const dataPayload = {
    conversationId,
    senderId,
    type,
    ...(type === 'voice' && audio ? { audioKey: audio.key, duration: audio.duration, mimeType: audio.mimeType } : {}),
    ...(type === 'image' && image ? { imageKey: image.key, mimeType: image.mimeType } : {})
  };

  console.log(`[PushService] Dispatching push notification to offline recipient: ${recipientId}`, {
    recipientId,
    senderId,
    conversationId,
    title: notificationTitle,
    body: notificationBody,
    data: dataPayload,
    timestamp: new Date().toISOString()
  });

  // Simulated FCM/APNs API dispatch
  return {
    success: true,
    recipientId,
    messageId: `push-${Date.now()}`
  };
}
