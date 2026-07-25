<?php
// Database connection configuration (supports Environment Variables for Cloud Deployment)
$host = getenv('DB_HOST') ?: "127.0.0.1";
$username = getenv('DB_USER') ?: "root";
$password = getenv('DB_PASS') !== false ? getenv('DB_PASS') : "";
$dbname = getenv('DB_NAME') ?: "quiz_db";
$port = getenv('DB_PORT') ?: "3306";

// 1. Connect to MySQL Server (without selecting DB first)
$conn = new mysqli($host, $username, $password, null, $port);

// Check connection
if ($conn->connect_error) {
    header('Content-Type: application/json');
    echo json_encode(["success" => false, "error" => "MySQL Connection failed: " . $conn->connect_error]);
    exit();
}

// 2. Create database if it does not exist
$sql = "CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
if (!$conn->query($sql)) {
    header('Content-Type: application/json');
    echo json_encode(["success" => false, "error" => "Database creation failed: " . $conn->error]);
    exit();
}

// 3. Select the database
if (!$conn->select_db($dbname)) {
    header('Content-Type: application/json');
    echo json_encode(["success" => false, "error" => "Database selection failed: " . $conn->error]);
    exit();
}

// 4. Create users table if it does not exist
$tableSql = "CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

if (!$conn->query($tableSql)) {
    header('Content-Type: application/json');
    echo json_encode(["success" => false, "error" => "Users table creation failed: " . $conn->error]);
    exit();
}
?>
