<?php
if (($_SERVER['HTTP_HOST'] ?? '') === 'localhost:8080'
    && str_starts_with($_SERVER['REQUEST_URI'] ?? '', '/wp-json/wc/')) {
    $_SERVER['HTTPS'] = 'on';
}
