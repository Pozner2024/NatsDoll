<?php
// Заказы создаются через WooCommerce REST API (сервер-сервер), поэтому WooCommerce
// не проставляет им customer IP. Шлюз Authorize.Net «Склад ЮСА» требует payIp
// (IP плательщика) и иначе отклоняет карту с «The payIp field is required».
// На сабмите формы order-pay проставляем заказу IP реального покупателя, если он пуст.
add_action('woocommerce_before_pay_action', function ($order) {
    if (!$order->get_customer_ip_address()) {
        $order->set_customer_ip_address(WC_Geolocation::get_ip_address());
        $order->save();
    }
});
