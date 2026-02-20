<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = trim($_POST["username"]);
    $password = trim($_POST["password"]);

    $users = file("users.txt", FILE_IGNORE_NEW_LINES);

    foreach ($users as $user) {
        list($storedUser, $storedHash) = explode("|", $user);

        if ($storedUser === $username && password_verify($password, $storedHash)) {
            echo "success"; // exact word "success" to trigger redirect in JS
            exit;
        }
    }

    echo "Invalid username or password.";
}
?>
