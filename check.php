<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight CORS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include database connection
require_once 'ptadmin/partials/_dbconnect.php';

// Get posted JSON data
$data = json_decode(file_get_contents("php://input"));

// Determine the action. If no action is provided but login credentials are, default to 'login'
$action = !empty($data->action) ? $data->action : '';
if(empty($action) && (!empty($data->email) || !empty($data->mob) || !empty($data->userId)) && !empty($data->password)){
    $action = 'login';
}

if ($action === 'login') {
    // Get the login identifier (could be email, mob, or userId from the chat-assistant)
    $login_id = '';
    if (!empty($data->email)) $login_id = $data->email;
    elseif (!empty($data->mob)) $login_id = $data->mob;
    elseif (!empty($data->userId)) $login_id = $data->userId;
    
    if (!empty($login_id) && !empty($data->password)) {
        $login_id = mysqli_real_escape_string($conn, $login_id);
        $password = mysqli_real_escape_string($conn, $data->password);
        
        // Check user in database (Matching email OR mob)
        $query = "SELECT id, name, email, mob, type, show_status, img FROM users WHERE (email = '$login_id' OR mob = '$login_id') AND password = '$password' AND type != 'USER' LIMIT 1";
        $result = mysqli_query($conn, $query);
        
        if (mysqli_num_rows($result) > 0) {
            $user = mysqli_fetch_assoc($result);
            
            // Ensure account is active
            if ($user['show_status'] === 'ACTIVE') {
                http_response_code(200);
                echo json_encode([
                    "success" => true,
                    "message" => "Login successful",
                    "user" => [
                        "id" => $user['id'],
                        "name" => $user['name'],
                        "email" => $user['email'],
                        "phone" => $user['mob'],
                        "role" => $user['type'],
                        "avatar" => (!empty($user['img'])) ? $m_url.ADD_PHOTO_SITE_PATH.$user['img'] : null
                    ]
                ]);
            } else {
                http_response_code(403);
                echo json_encode([
                    "success" => false,
                    "message" => "Account is suspended or inactive."
                ]);
            }
        } else {
            http_response_code(401);
            echo json_encode([
                "success" => false,
                "message" => "Invalid email/mobile or password."
            ]);
        }
    } else {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Incomplete data. Please provide email/mobile and password."
        ]);
    }
} elseif ($action === 'read_users') {
    // Secure Read (SELECT) - Fetch all users or a specific user by ID
    $id = !empty($data->id) ? (int)$data->id : null;
    
    if ($id) {
        $stmt = $conn->prepare("SELECT id, name, email, mob, type, show_status FROM users WHERE id = ?");
        $stmt->bind_param("i", $id);
    } else {
        $stmt = $conn->prepare("SELECT id, name, email, mob, type, show_status FROM users");
    }
    
    if ($stmt->execute()) {
        $result = $stmt->get_result();
        $users = [];
        while ($row = $result->fetch_assoc()) {
            $users[] = $row;
        }
        
        http_response_code(200);
        echo json_encode(["success" => true, "data" => $users]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Database error."]);
    }
    $stmt->close();

} elseif ($action === 'create_user') {
    // Secure Create (INSERT)
    $name = !empty($data->name) ? trim($data->name) : '';
    $email = !empty($data->email) ? trim($data->email) : '';
    $mob = !empty($data->mob) ? trim($data->mob) : '';
    $password = !empty($data->password) ? $data->password : '';
    
    if ($name && $email && $password) {
        // Warning: In a real app, ALWAYS hash passwords (e.g., password_hash). 
        // This example uses plain text to match your existing login query logic.
        $stmt = $conn->prepare("INSERT INTO users (name, email, mob, password, type, show_status) VALUES (?, ?, ?, ?, 'USER', 'ACTIVE')");
        $stmt->bind_param("ssss", $name, $email, $mob, $password);
        
        if ($stmt->execute()) {
            http_response_code(201);
            echo json_encode(["success" => true, "message" => "User created successfully.", "id" => $conn->insert_id]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to create user."]);
        }
        $stmt->close();
    } else {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Name, email, and password are required."]);
    }

} elseif ($action === 'update_user') {
    // Secure Update (UPDATE)
    $id = !empty($data->id) ? (int)$data->id : 0;
    $name = !empty($data->name) ? trim($data->name) : null;
    
    if ($id && $name !== null) {
        $stmt = $conn->prepare("UPDATE users SET name = ? WHERE id = ?");
        $stmt->bind_param("si", $name, $id);
        
        if ($stmt->execute()) {
            http_response_code(200);
            echo json_encode(["success" => true, "message" => "User updated successfully."]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to update user."]);
        }
        $stmt->close();
    } else {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "User ID and new name are required."]);
    }

} elseif ($action === 'delete_user') {
    // Secure Delete (DELETE)
    $id = !empty($data->id) ? (int)$data->id : 0;
    
    if ($id) {
        $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
        $stmt->bind_param("i", $id);
        
        if ($stmt->execute()) {
            http_response_code(200);
            echo json_encode(["success" => true, "message" => "User deleted successfully."]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to delete user."]);
        }
        $stmt->close();
    } else {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "User ID is required."]);
    }

} else {
    // Fallback for unknown actions
    http_response_code(404);
    echo json_encode([
        "success" => false,
        "message" => "Action not found or invalid request."
    ]);
}
// API USAGE FOR CHAT-ASSISTANT:
// URL: http://localhost/gamecrm/api.php (Replace 'localhost' with your live domain)
// Endpoint: POST to this file with JSON payload: { "action": "login", "email": "user_email_or_mobile", "password": "user_password" }
// Note: Only non-'USER' roles (e.g. AGENCY) can login.
// 
// Expected Responses:
// 200 OK: { "success": true, "message": "Login successful", "user": { ... } }
// 400 Bad Request: { "success": false, "message": "Incomplete data. Please provide email/mobile and password." }
// 401 Unauthorized: { "success": false, "message": "Invalid email/mobile or password." }
// 403 Forbidden: { "success": false, "message": "Account is suspended or inactive." }
// 404 Not Found: { "success": false, "message": "Action not found or invalid request." }

?>