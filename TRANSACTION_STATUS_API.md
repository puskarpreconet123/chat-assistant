# 📘 Transaction Status Update API Documentation

This API endpoint is called by the **PHP backend** to send real-time status updates (Recharge / Withdraw approvals or rejections) to the **Node.js Chat Server**.

---

## 📌 Endpoint Overview

* **URL Path**: `/api/v1/transaction/status-update`
* **HTTP Method**: `POST`
* **Content-Type**: `application/json`
* **Authentication**: Requires Fixed/Bypass API Token in the `Authorization` header.

### Required HTTP Headers
```http
Content-Type: application/json
Authorization: Bearer <YOUR_FIXED_BYPASS_TOKEN>
```

---

## 📋 Payload Field Specifications

Below is the complete dictionary of all supported JSON body payload parameters:

| Parameter Name | Data Type | Required? | Default Fallback | Description & Accepted Values | Example |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **`recipient_id`** *(or `recipientId`, `userId`)* | `String` | **REQUIRED** | None | Unique Identifier of the player/user receiving the notification. Accepts User `_id`, numeric user `id`, or `emailId`. | `"player_12345"` |
| **`sender_id`** *(or `senderId`)* | `String` | **Optional** | `"admin"` | ID or Email of the Admin/Agent performing the approval. Used for message attribution and conversation matching. | `"admin@system.com"` |
| **`type`** | `String` | **Optional** | `"recharge"` | Transaction type. Allowed values: `"recharge"`, `"withdraw"`. | `"recharge"` |
| **`status`** | `String` | **Optional** | `"approved"` | Transaction outcome. Allowed values: `"approved"`, `"rejected"`. | `"approved"` |
| **`amount`** | `Number` \| `String` | **Optional** | `null` | The monetary amount involved in the transaction. | `500` |
| **`transaction_id`** *(or `transactionId`)* | `String` | **Optional** | `null` | Reference UTR number, bank transfer ID, or transaction hash. | `"TXN987654321"` |
| **`reason`** *(or `remarks`)* | `String` | **Optional** | `null` | Reason or remarks for approval or rejection. | `"Invalid UTR reference"` |
| **`book_name`** *(or `bookName`, `book_id`, `bookId`)* | `String` \| `Number` | **Optional** | `null` | Name or numeric ID of the game/book linked to the transaction. | `"Diamond Book"` |
| **`custom_message`** | `String` | **Optional** | Auto-generated template | Custom text override. If supplied, bypasses the auto-generated template and displays this exact text in chat. | `"Your bonus has been credited!"` |

---

## 🔍 Detailed Field Breakdown

### 1. `recipient_id` (REQUIRED)
- **Type**: `String`
- **Is Optional?**: ❌ **No (Required)**
- **Behavior**: The server resolves this identifier to locate the user's MongoDB record and identify their active chat session. You can pass either the numeric database ID (`123`), string ID (`"user_123"`), or user email (`"user@example.com"`).

### 2. `sender_id` (OPTIONAL)
- **Type**: `String`
- **Is Optional?**: ✅ **Yes**
- **Default**: `"admin"`
- **Behavior**: Identifies who initiated the status change on the PHP panel. If omitted, the message will default to being sent from system `'admin'`.

### 3. `type` (OPTIONAL)
- **Type**: `String`
- **Is Optional?**: ✅ **Yes**
- **Default**: `"recharge"`
- **Accepted Values**: `"recharge"`, `"withdraw"`
- **Behavior**: Determines the label used in the auto-generated chat message text (*"Recharge"* vs *"Withdrawal"*).

### 4. `status` (OPTIONAL)
- **Type**: `String`
- **Is Optional?**: ✅ **Yes**
- **Default**: `"approved"`
- **Accepted Values**: `"approved"`, `"rejected"`
- **Behavior**: Controls the status emoji and text.
  - `"approved"` ➔ Adds `✅` and marks request as `APPROVED`.
  - `"rejected"` ➔ Adds `❌` and marks request as `REJECTED`.

### 5. `amount` (OPTIONAL)
- **Type**: `Number` or `String`
- **Is Optional?**: ✅ **Yes**
- **Behavior**: Formatted into the text message as `Amount: ₹<amount>`.

### 6. `transaction_id` (OPTIONAL)
- **Type**: `String`
- **Is Optional?**: ✅ **Yes**
- **Behavior**: Included in the text message as `Txn ID: <transaction_id>`.

### 7. `reason` (OPTIONAL)
- **Type**: `String`
- **Is Optional?**: ✅ **Yes**
- **Behavior**: Attached to rejected or approved messages as `Reason: <reason>`. You can use key `reason` or `remarks`.

### 8. `book_name` (OPTIONAL)
- **Type**: `String` or `Number`
- **Is Optional?**: ✅ **Yes**
- **Behavior**: Included in the text message as `Book: <book_name>`. You can pass `book_name` or `book_id`.

### 9. `custom_message` (OPTIONAL)
- **Type**: `String`
- **Is Optional?**: ✅ **Yes**
- **Behavior**: Overrides all auto-formatting. When present, the server uses this exact string as the chat message text.

---

## 🧪 Sample Request Payloads

### Sample 1: Approved Recharge (Standard)
```json
{
  "sender_id": "admin_agent@system.com",
  "recipient_id": "player_99182",
  "type": "recharge",
  "status": "approved",
  "amount": 1000,
  "transaction_id": "UTR8827103948",
  "book_name": "Royal Cricket Book"
}
```
**Chat Message Text Generated:**
```
✅ Your Recharge request has been APPROVED.
Amount: ₹1000 | Txn ID: UTR8827103948 | Book: Royal Cricket Book
```

---

### Sample 2: Rejected Recharge
```json
{
  "sender_id": "admin_agent@system.com",
  "recipient_id": "player_99182",
  "type": "recharge",
  "status": "rejected",
  "amount": 1000,
  "transaction_id": "UTR8827103948",
  "reason": "Payment signature mismatch or expired QR"
}
```
**Chat Message Text Generated:**
```
❌ Your Recharge request has been REJECTED.
Amount: ₹1000 | Txn ID: UTR8827103948 | Reason: Payment signature mismatch or expired QR
```

---

### Sample 3: Approved Withdrawal
```json
{
  "sender_id": "finance_admin@system.com",
  "recipient_id": "player_99182",
  "type": "withdraw",
  "status": "approved",
  "amount": 2500,
  "transaction_id": "WDR9918273"
}
```
**Chat Message Text Generated:**
```
✅ Your Withdrawal request has been APPROVED.
Amount: ₹2500 | Txn ID: WDR9918273
```

---

### Sample 4: Rejected Withdrawal
```json
{
  "sender_id": "finance_admin@system.com",
  "recipient_id": "player_99182",
  "type": "withdraw",
  "status": "rejected",
  "amount": 2500,
  "reason": "Bank account IFSC code invalid"
}
```
**Chat Message Text Generated:**
```
❌ Your Withdrawal request has been REJECTED.
Amount: ₹2500 | Reason: Bank account IFSC code invalid
```

---

### Sample 5: Custom Message Override
```json
{
  "sender_id": "system_admin",
  "recipient_id": "player_99182",
  "custom_message": "🎉 Welcome bonus of ₹500 credited to your account balance!"
}
```
**Chat Message Text Generated:**
```
🎉 Welcome bonus of ₹500 credited to your account balance!
```

---

## 📤 Server Responses

### Success (`200 OK`)
```json
{
  "success": true,
  "message": "Transaction status update processed successfully",
  "messageId": "c4d32a10-8b1e-4589-a212-0f0e34771e11",
  "conversationId": "conv_admin_agent@system.com_player_99182",
  "text": "✅ Your Recharge request has been APPROVED.\nAmount: ₹1000 | Txn ID: UTR8827103948 | Book: Royal Cricket Book"
}
```

### Missing Required Parameter (`400 Bad Request`)
```json
{
  "error": "recipient_id (or userId) is required"
}
```

### Missing / Invalid Token (`401 Unauthorized`)
```json
{
  "error": "Authorization header with Bearer token required"
}
```
