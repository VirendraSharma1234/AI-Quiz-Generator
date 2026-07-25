<?php
header('Content-Type: application/json');
require_once 'config.php';

// Retrieve and decode JSON input
$input = json_decode(file_get_contents("php://input"), true);

$email = isset($input['email']) ? trim($input['email']) : (isset($_POST['email']) ? trim($_POST['email']) : '');
$password = isset($input['password']) ? $input['password'] : (isset($_POST['password']) ? $_POST['password'] : '');

if (empty($email) || empty($password)) {
    echo json_encode(["success" => false, "error" => "Please enter your email and password."]);
    exit();
}

// Server-side validation: Email Format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(["success" => false, "error" => "Invalid email address format."]);
    exit();
}

// Server-side validation: Password Length
if (strlen($password) < 6) {
    echo json_encode(["success" => false, "error" => "Password must be at least 6 characters long."]);
    exit();
}

$emailLower = strtolower($email);

// Use prepared statement to select user
$stmt = $conn->prepare("SELECT id, name, password FROM users WHERE email = ?");
$stmt->bind_param("s", $emailLower);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["success" => false, "error" => "No account found with this email."]);
    $stmt->close();
    $conn->close();
    exit();
}

$user = $result->fetch_assoc();
$stmt->close();

// Verify password
if (password_verify($password, $user['password'])) {
    echo json_encode([
        "success" => true,
        "user" => [
            "id" => $user['id'],
            "name" => $user['name'],
            "email" => $emailLower
        ]
    ]);
} else {
    echo json_encode(["success" => false, "error" => "Incorrect password. Please try again."]);
}

$conn->close();
?>
