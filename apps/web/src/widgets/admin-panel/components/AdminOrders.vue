<template>
  <div class="admin-orders">
    <AdminTopbar
      title="Orders"
      subtitle="All customer orders"
    />

    <div
      v-if="ordersError"
      class="admin-orders__error"
    >
      {{ ordersError }}
      <button @click="ordersRefresh">
        Retry
      </button>
    </div>

    <div
      v-else
      class="admin-orders__body"
      :class="{ 'admin-orders__body--detail-open': !!selectedOrderId && isMobile }"
    >
      <div class="admin-orders__sidebar">
        <div
          v-if="ordersLoading && orders.length === 0"
          class="admin-orders__loading"
        >
          Loading…
        </div>
        <OrderList
          v-else
          :orders="orders"
          :selected-id="selectedOrderId"
          :total-pages="totalPages"
          :filters="filters"
          @select="handleSelect"
          @filter-change="setFilter"
          @page-change="(page) => setFilter({ page })"
        />
      </div>

      <div class="admin-orders__main">
        <div
          v-if="detailError"
          class="admin-orders__error"
        >
          {{ detailError }}
        </div>
        <div
          v-else-if="detailLoading"
          class="admin-orders__loading"
        >
          Loading…
        </div>
        <OrderDetail
          v-else
          ref="detailRef"
          :order="currentOrder"
          :saving="saving"
          @save="handleSave"
          @back="selectedOrderId = null"
          @message-buyer="handleMessageBuyer"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminTopbar from './AdminTopbar.vue'
import OrderList from './OrderList.vue'
import OrderDetail from './OrderDetail.vue'
import {
  useAdminOrders,
  useAdminOrderDetail,
  updateAdminOrder,
} from '../adminOrdersApi'
import type { UpdateOrderInput } from '../adminOrdersApi'

const MOBILE_BREAKPOINT = 768

const router = useRouter()
const selectedOrderId = ref<string | null>(null)
const saving = ref(false)
const isMobile = ref(window.innerWidth < MOBILE_BREAKPOINT)
const detailRef = ref<InstanceType<typeof OrderDetail> | null>(null)

const {
  data,
  isLoading: ordersLoading,
  error: ordersError,
  filters,
  setFilter,
  refresh: ordersRefresh,
} = useAdminOrders()

const { order: currentOrder, isLoading: detailLoading, error: detailError, reload: reloadDetail } = useAdminOrderDetail(selectedOrderId)

const orders = computed(() => data.value?.items ?? [])
const totalPages = computed(() => data.value?.totalPages ?? 1)

function handleSelect(id: string) {
  selectedOrderId.value = id
}

async function handleSave(payload: UpdateOrderInput) {
  if (!selectedOrderId.value) return
  saving.value = true
  try {
    await updateAdminOrder(selectedOrderId.value, payload)
    await reloadDetail()
    await ordersRefresh()
  } catch (e) {
    detailRef.value?.setError(e instanceof Error ? e.message : 'Failed to save')
  } finally {
    saving.value = false
  }
}

function handleMessageBuyer(userId: string) {
  router.push({ path: '/admin/messages', query: { userId } })
}

function handleResize() {
  isMobile.value = window.innerWidth < MOBILE_BREAKPOINT
}

onMounted(() => {
  ordersRefresh()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.admin-orders {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;

  &__error {
    padding: 1.5rem;
    color: var(--color-error);
    font-size: 0.9rem;

    button {
      margin-left: 0.75rem;
      background: none;
      border: 1px solid var(--color-error);
      color: var(--color-error);
      border-radius: 4px;
      padding: 0.2rem 0.6rem;
      font-size: 0.8rem;
    }
  }

  &__body {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  &__sidebar {
    width: 100%;
    border-right: 1px solid var(--color-border);
    overflow-y: auto;
    flex-shrink: 0;

    @include tablet {
      width: 280px;
    }
  }

  &__main {
    flex: 1;
    display: none;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    overflow-y: auto;

    @include tablet {
      display: flex;
    }
  }

  &__body--detail-open {
    .admin-orders__sidebar {
      display: none;
    }

    .admin-orders__main {
      display: flex;
      width: 100%;
    }
  }

  &__loading {
    padding: 2rem 1rem;
    text-align: center;
    font-size: 0.9rem;
    color: var(--color-text-muted);
    font-style: italic;
  }
}
</style>
