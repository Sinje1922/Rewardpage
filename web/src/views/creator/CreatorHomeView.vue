<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '../../api/client'

type Campaign = { id: string; title: string; status: string; missions?: { id: string }[] }

const { t } = useI18n()
const list = ref<Campaign[]>([])
const err = ref('')

onMounted(async () => {
  try {
    const { data } = await api.get<Campaign[]>('/campaigns')
    list.value = data
  } catch {
    err.value = t('common.errorLoad')
  }
})
</script>

<template>
  <div>
    <h1 class="page-title">{{ $t('ops.console') }}</h1>
    <p style="color: var(--muted); margin: 0 0 0.75rem; font-size: 0.95rem">
      {{ $t('ops.creatorOnly') }}
    </p>
    <RouterLink class="btn primary" to="/ops/campaigns/new">{{ $t('ops.newCampaign') }}</RouterLink>
    <p v-if="err" class="err" style="margin-top: 1rem">{{ err }}</p>
    <div v-for="c in list" :key="c.id" class="card" style="margin-top: 0.75rem">
      <RouterLink :to="`/ops/campaigns/${c.id}`">
        <strong style="color: var(--text-h)">{{ c.title }}</strong>
      </RouterLink>
      <p style="margin: 0.35rem 0 0; font-size: 0.9rem; color: var(--muted)">
        {{ $t('ops.statusMissions', { status: c.status, count: c.missions?.length ?? 0 }) }}
      </p>
    </div>
  </div>
</template>
