<?php
add_action('template_redirect', function () {
    if (!function_exists('is_wc_endpoint_url') || !is_wc_endpoint_url('order-received')) {
        return;
    }
    $order_id = absint(get_query_var('order-received'));
    if (!$order_id) {
        return;
    }
    $order = wc_get_order($order_id);
    if (!$order) {
        return;
    }
    $key = isset($_GET['key']) ? wc_clean(wp_unslash($_GET['key'])) : '';
    if (!$key || !hash_equals($order->get_order_key(), $key)) {
        return;
    }
    $url = $order->get_meta('natsdoll_return_url');
    if (!$url) {
        return;
    }
    wp_redirect(add_query_arg('paid', '1', $url), 303);
    exit;
});
