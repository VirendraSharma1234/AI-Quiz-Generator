<?php
header('Content-Type: application/javascript');

// 1. Check if a local gitignored file 'key.txt' exists and load from it
$local_key_file = __DIR__ . '/key.txt';
$api_key = '';

if (file_exists($local_key_file)) {
    $api_key = trim(file_get_contents($local_key_file));
}

// 2. Otherwise load from Environment Variable (for Cloud Deployment)
if (empty($api_key)) {
    $api_key = getenv('GEMINI_API_KEY');
}

// 3. Fallback to placeholder
if (empty($api_key)) {
    $api_key = 'YOUR_GEMINI_API_KEY';
}

echo "const GEMINI_API_KEY = " . json_encode($api_key) . ";\n";
?>
