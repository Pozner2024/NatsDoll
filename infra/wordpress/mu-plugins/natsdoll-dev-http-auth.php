<?php
if (($_SERVER['HTTP_HOST'] ?? '') === 'localhost:8080'
    && str_starts_with($_SERVER['REQUEST_URI'] ?? '', '/wp-json/wc/')) {
    $_SERVER['HTTPS'] = 'on';
}

add_filter('http_request_host_is_external', function ($external, $host) {
    return $host === 'host.docker.internal' ? true : $external;
}, 10, 2);

add_filter('http_allowed_safe_ports', function ($ports) {
    return array_merge($ports, [3000]);
});
