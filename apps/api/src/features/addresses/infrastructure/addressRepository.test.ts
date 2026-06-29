import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeAddressRepository } from './addressRepository'
import { AppError } from '../../../shared/errors'

function makePrisma() {
  const prisma = {
    address: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn((arg: unknown) =>
      typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as unknown[]),
    ),
  }
  return prisma as unknown as Parameters<typeof makeAddressRepository>[0] & typeof prisma
}

const row = {
  id: 'a1', fullName: 'Alice', line1: '1 St', line2: null,
  city: 'London', country: 'UK', postalCode: 'SW1', isDefault: true, createdAt: new Date('2026-01-01T00:00:00Z'),
}
const data = { fullName: 'Alice', line1: '1 St', city: 'London', country: 'UK', postalCode: 'SW1' }

let prisma: ReturnType<typeof makePrisma>
beforeEach(() => { prisma = makePrisma() })

describe('addressRepository.create', () => {
  it('первый адрес становится дефолтным (count === 0)', async () => {
    vi.mocked(prisma.address.count).mockResolvedValue(0)
    vi.mocked(prisma.address.create).mockResolvedValue(row as never)
    const repo = makeAddressRepository(prisma)
    await repo.create('u1', data)
    expect(prisma.address.create).toHaveBeenCalledWith({ data: { userId: 'u1', ...data, isDefault: true } })
  })

  it('второй адрес не дефолтный (count > 0)', async () => {
    vi.mocked(prisma.address.count).mockResolvedValue(2)
    vi.mocked(prisma.address.create).mockResolvedValue({ ...row, isDefault: false } as never)
    const repo = makeAddressRepository(prisma)
    await repo.create('u1', data)
    expect(prisma.address.create).toHaveBeenCalledWith({ data: { userId: 'u1', ...data, isDefault: false } })
  })
})

describe('addressRepository.update', () => {
  it('404, если адрес чужой', async () => {
    vi.mocked(prisma.address.findUnique).mockResolvedValue({ id: 'a1', userId: 'other' } as never)
    const repo = makeAddressRepository(prisma)
    await expect(repo.update('a1', 'u1', data)).rejects.toThrow(AppError)
    expect(prisma.address.update).not.toHaveBeenCalled()
  })
})

describe('addressRepository.setDefault', () => {
  it('404, если адрес чужой', async () => {
    vi.mocked(prisma.address.findUnique).mockResolvedValue({ id: 'a1', userId: 'other' } as never)
    const repo = makeAddressRepository(prisma)
    await expect(repo.setDefault('a1', 'u1')).rejects.toThrow(AppError)
  })

  it('снимает дефолт со всех и ставит на выбранный', async () => {
    vi.mocked(prisma.address.findUnique).mockResolvedValue({ id: 'a1', userId: 'u1' } as never)
    const repo = makeAddressRepository(prisma)
    await repo.setDefault('a1', 'u1')
    expect(prisma.address.updateMany).toHaveBeenCalledWith({ where: { userId: 'u1' }, data: { isDefault: false } })
    expect(prisma.address.update).toHaveBeenCalledWith({ where: { id: 'a1' }, data: { isDefault: true } })
  })
})

describe('addressRepository.delete', () => {
  it('после удаления дефолтного промоутит следующий адрес в дефолт', async () => {
    vi.mocked(prisma.address.findUnique).mockResolvedValue({ id: 'a1', userId: 'u1', isDefault: true } as never)
    vi.mocked(prisma.address.findFirst).mockResolvedValue({ id: 'a2' } as never)
    const repo = makeAddressRepository(prisma)
    await repo.delete('a1', 'u1')
    expect(prisma.address.delete).toHaveBeenCalledWith({ where: { id: 'a1' } })
    expect(prisma.address.update).toHaveBeenCalledWith({ where: { id: 'a2' }, data: { isDefault: true } })
  })

  it('не промоутит, если удалён не дефолтный', async () => {
    vi.mocked(prisma.address.findUnique).mockResolvedValue({ id: 'a1', userId: 'u1', isDefault: false } as never)
    const repo = makeAddressRepository(prisma)
    await repo.delete('a1', 'u1')
    expect(prisma.address.update).not.toHaveBeenCalled()
  })
})
