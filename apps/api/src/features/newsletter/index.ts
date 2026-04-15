export { makeNewsletterRepository } from './infrastructure/newsletterRepository'
export { makeSubscribe } from './application/subscribe'
export { makeNewsletterRouter } from './presentation/newsletterRouter'

// makeGetSubscribers и deleteById остаются внутри фичи — будут подключены
// к роутеру, как только появится auth middleware с проверкой роли ADMIN.
