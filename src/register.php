<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = trim($_POST["username"]);
    $password = trim($_POST["password"]);

    if (!$username || !$password) {
        echo "Please fill in all fields.";
        exit;
    }

    $data = "$username|" . password_hash($password, PASSWORD_DEFAULT) . "\n";

    // Save to file
    file_put_contents("users.txt", $data, FILE_APPEND);
    echo "Registration successful!";
}
?>
