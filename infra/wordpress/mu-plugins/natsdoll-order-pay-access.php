<?php
// Покупатель приходит на страницу оплаты с natsdoll.com без сессии WooCommerce,
// поэтому WooCommerce требовал бы подтвердить email заказа. Пропуском служит секретный
// order key в ссылке (bearer-модель, как у любых pay-link). Снимаем требование email
// только для контекста order-pay; для остальных (order-received и т.п.) — не трогаем.
add_filter('woocommerce_order_email_verification_required', function ($required, $order, $context) {
    return $context === 'order-pay' ? false : $required;
}, 10, 3);
