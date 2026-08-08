// API USAGE FOR CHAT-ASSISTANT:
// URL: http://localhost/gamecrm/api.php (Replace 'localhost' with your live domain)
//
// --- Endpoints (POST with JSON payload) ---
// 1. Login: { "action": "login", "email": "user_email_or_mobile", "password": "user_password" }
// 2. Read Users: { "action": "read_users", "id": 1 } (id is optional, omit to get all)
// 3. Create User: { "action": "create_user", "name": "Jane", "email": "jane@test.com", "password": "123", "mob": "9876543210" }
// 4. Update User: { "action": "update_user", "id": 1, "name": "Jane Doe" }
// 5. Delete User: { "action": "delete_user", "id": 1 }
// 6. Get by Agency: { "action": "get_by_agency_id", "agency_id": "1" } (Works with numeric id or 'AGENCY-XX')
// 
// Note: Only non-'USER' roles (e.g. AGENCY) can login via the login action.
// 
// Expected Responses:
// 200/201 OK: { "success": true, "message": "...", "data": [...] }
// 400 Bad Request: { "success": false, "message": "Incomplete data / Missing fields." }
// 401 Unauthorized: { "success": false, "message": "Invalid credentials." }
// 403 Forbidden: { "success": false, "message": "Account is suspended or inactive." }
// 404 Not Found: { "success": false, "message": "Action not found or invalid request." }
 500 Server Error: { "success": false, "message": "Database/Execution error." }