<?php
header('Content-Type: application/json');
require_once 'config.php';


$sql = "SELECT id, name, email, password, created_at FROM users ORDER BY id ASC";
$result = $conn->query($sql);

if (!$result) {
    echo json_encode(["success" => false, "error" => "Database query failed: " . $conn->error]);
    $conn->close();
    exit();
}

$users = [];
while ($row = $result->fetch_assoc()) {
    $users[] = [
        "id" => $row['id'],
        "name" => $row['name'],
        "email" => $row['email'],
        "password" => $row['password'], 
        "created_at" => $row['created_at']
    ];
}

echo json_encode(["success" => true, "users" => $users]);

$conn->close();
?>
