import { describe, it, expect, beforeEach } from 'vitest'
import { encryptSecret, decryptSecret } from './secretCrypto'

describe('secretCrypto', () => {
  beforeEach(() => {
    process.env.PAYMENT_ENCRYPTION_KEY = '0'.repeat(64)
  })

  it('round-trips a secret', () => {
    const enc = encryptSecret('my-paypal-secret')
    expect(enc).not.toBe('my-paypal-secret')
    expect(decryptSecret(enc)).toBe('my-paypal-secret')
  })

  it('produces different ciphertext each call (random IV)', () => {
    expect(encryptSecret('x')).not.toBe(encryptSecret('x'))
  })

  it('throws when key is missing', () => {
    delete process.env.PAYMENT_ENCRYPTION_KEY
    expect(() => encryptSecret('x')).toThrow()
  })
})
