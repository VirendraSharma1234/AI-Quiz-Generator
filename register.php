<?php
header('Content-Type: application/json');
require_once 'config.php';

// Retrieve and decode JSON input
$input = json_decode(file_get_contents("php://input"), true);

$name = isset($input['name']) ? trim($input['name']) : (isset($_POST['name']) ? trim($_POST['name']) : '');
$email = isset($input['email']) ? trim($input['email']) : (isset($_POST['email']) ? trim($_POST['email']) : '');
$password = isset($input['password']) ? $input['password'] : (isset($_POST['password']) ? $_POST['password'] : '');

if (empty($name) || empty($email) || empty($password)) {
    echo json_encode(["success" => false, "error" => "Please fill in name, email, and password."]);
    exit();
}

$emailLower = strtolower($email);

// Use prepared statement to check if email already exists
$checkStmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
$checkStmt->bind_param("s", $emailLower);
$checkStmt->execute();
$checkStmt->store_result();

if ($checkStmt->num_rows > 0) {
    echo json_encode(["success" => false, "error" => "An account with this email already exists."]);
    $checkStmt->close();
    $conn->close();
    exit();
}
$checkStmt->close();

// Hash password
$hashedPassword = password_hash($password, PASSWORD_BCRYPT);

// Use prepared statement to insert new user
$insertStmt = $conn->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
$insertStmt->bind_param("sss", $name, $emailLower, $hashedPassword);

if ($insertStmt->execute()) {
    $userId = $insertStmt->insert_id;
    echo json_encode([
        "success" => true,
        "user" => [
            "id" => $userId,
            "name" => $name,
            "email" => $emailLower
        ]
    ]);
} else {
    echo json_encode(["success" => false, "error" => "Failed to register user: " . $insertStmt->error]);
}

$insertStmt->close();
$conn->close();
?>
