<?php
add_action('wp_head', function () {
    if (!function_exists('is_wc_endpoint_url') || !is_wc_endpoint_url('order-pay')) {
        return;
    }
    echo '<link rel="preconnect" href="https://www.paypal.com">' . "\n";
    echo '<link rel="preconnect" href="https://www.paypalobjects.com">' . "\n";
}, 1);
