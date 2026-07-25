<?php
header('Content-Type: application/javascript');


$local_key_file = __DIR__ . '/key.txt';
$api_key = '';

if (file_exists($local_key_file)) {
    $api_key = trim(file_get_contents($local_key_file));
}


if (empty($api_key)) {
    $api_key = getenv('GEMINI_API_KEY');
}


if (empty($api_key)) {
    $api_key = 'YOUR_GEMINI_API_KEY';
}

echo "const GEMINI_API_KEY = " . json_encode($api_key) . ";\n";
?>
