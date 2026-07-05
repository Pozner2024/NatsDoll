<?php
add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style(
        'natsdoll-fonts',
        'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Corinthia:wght@700&display=swap',
        [],
        null
    );

    wp_register_style('natsdoll-branding', false);
    wp_enqueue_style('natsdoll-branding');
    wp_add_inline_style('natsdoll-branding', <<<CSS
:root {
  --nd-bg: #fdf6ef;
  --nd-text: #2c1810;
  --nd-accent: #8b5e52;
  --nd-accent-hover: #4a2e26;
  --nd-muted: #5a3d35;
  --nd-border: #ecddd5;
}

body {
  background: var(--nd-bg) !important;
  color: var(--nd-text) !important;
  font-family: 'Playfair Display', Georgia, serif !important;
}

.wp-block-site-title,
.wp-block-site-title a {
  font-family: 'Corinthia', cursive !important;
  font-size: 3.2rem !important;
  font-weight: 700 !important;
  line-height: 1.1 !important;
  color: var(--nd-text) !important;
  text-decoration: none !important;
}

.wp-block-woocommerce-mini-cart,
.wc-block-mini-cart,
.wp-block-woocommerce-cart-link,
.wp-block-navigation,
.wp-block-page-list,
header .wc-block-mini-cart__button {
  display: none !important;
}

main .woocommerce,
.wc-block-checkout,
.woocommerce-order-pay #order_review {
  max-width: 560px;
  margin-left: auto;
  margin-right: auto;
}

.woocommerce table.shop_table,
.woocommerce .order_details,
table.shop_table {
  border: 1px solid var(--nd-border) !important;
  border-radius: 12px !important;
  overflow: hidden;
  background: #fff;
}

.woocommerce table.shop_table th {
  color: var(--nd-muted) !important;
  font-weight: 600 !important;
}

.woocommerce table.shop_table td,
.woocommerce table.shop_table th,
.woocommerce table.shop_table tr {
  border-color: var(--nd-border) !important;
}

.woocommerce table.shop_table .order-total .amount,
.woocommerce table.shop_table .order-total td {
  color: var(--nd-accent) !important;
  font-weight: 700 !important;
  font-size: 1.15rem;
}

a {
  color: var(--nd-accent);
}

a:hover {
  color: var(--nd-accent-hover);
}

.wp-element-button,
.woocommerce button.button,
.woocommerce #place_order,
.woocommerce button.button.alt,
button.wp-element-button {
  background: var(--nd-accent) !important;
  background-image: none !important;
  border: none !important;
  color: #fff !important;
  border-radius: 10px !important;
  font-family: 'Playfair Display', serif !important;
  letter-spacing: 0.02rem;
  padding: 0.8em 1.6em !important;
}

.wp-element-button:hover,
.woocommerce button.button:hover,
.woocommerce #place_order:hover,
.woocommerce button.button.alt:hover {
  background: var(--nd-accent-hover) !important;
}

.wc-block-store-notices,
.wc-block-store-notices.alignwide,
.woocommerce-order-pay .wc-block-store-notices {
  max-width: 560px !important;
  margin: 1.5rem auto !important;
}

.woocommerce-info,
.woocommerce-message,
.woocommerce-error,
.wc-block-components-notice-banner,
.wc-block-components-notice-banner.is-error {
  background: #fff !important;
  border: 1px solid var(--nd-border) !important;
  border-left: 4px solid var(--nd-accent) !important;
  border-radius: 10px !important;
  color: var(--nd-text) !important;
}

.woocommerce-info::before,
.woocommerce-error::before,
.woocommerce-message::before {
  color: var(--nd-accent) !important;
}

.wc-block-components-notice-banner svg {
  fill: var(--nd-accent) !important;
}

ul.wc_payment_methods,
.woocommerce-checkout-payment,
#payment {
  border: 1px solid var(--nd-border) !important;
  background: #fff !important;
  border-radius: 12px !important;
}

.woocommerce-order-pay .order_details tfoot .total .amount {
  color: var(--nd-accent) !important;
}

@media (min-width: 782px) {
  .woocommerce-order-pay .woocommerce {
    max-width: min(1840px, 94vw) !important;
  }

  .woocommerce-order-pay #order_review {
    display: flex;
    align-items: flex-start;
    gap: 2rem;
    max-width: none !important;
  }

  .woocommerce-order-pay #order_review > table.shop_table {
    flex: 1 1 55%;
    margin: 0 !important;
  }

  .woocommerce-order-pay #order_review > #payment {
    flex: 1 1 45%;
    margin-top: 0 !important;
  }
}
CSS
    );
});
