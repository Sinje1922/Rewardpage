<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '../api/client'

type SubRow = {
  id: string
  status: string
  mission: { title: string; campaign: { id: string; title: string; status: string } }
}

type WinRow = {
  rank: number
  campaign: { id: string; title: string }
}

const { t } = useI18n()
const subs = ref<SubRow[]>([])
const wins = ref<WinRow[]>([])
const err = ref('')

onMounted(async () => {
  try {
    const [s, w] = await Promise.all([api.get<SubRow[]>('/me/submissions'), api.get<WinRow[]>('/me/wins')])
    subs.value = s.data
    wins.value = w.data
  } catch {
    err.value = t('common.errorLoad')
  }
})
</script>

<template>
  <div>
    <h1 class="page-title">{{ $t('nav.myActivity') }}</h1>
    <p v-if="err" class="err">{{ err }}</p>

    <h2 style="font-size: 1.1rem; color: var(--text-h)">{{ $t('activity.wins') }}</h2>
    <div v-for="w in wins" :key="w.campaign.id + '-' + w.rank" class="card">
      <RouterLink :to="`/campaigns/${w.campaign.id}`"><strong>{{ w.campaign.title }}</strong></RouterLink>
      <p style="margin: 0.35rem 0 0; font-size: 0.9rem">{{ $t('activity.winRank', { rank: w.rank }) }}</p>
    </div>
    <p v-if="!wins.length" style="color: var(--muted); margin-bottom: 1rem">{{ $t('activity.noWins') }}</p>

    <h2 style="font-size: 1.1rem; color: var(--text-h)">{{ $t('activity.submissions') }}</h2>
    <div v-for="s in subs" :key="s.id" class="card">
      <RouterLink :to="`/campaigns/${s.mission.campaign.id}`">
        <strong>{{ s.mission.campaign.title }}</strong>
      </RouterLink>
      <p style="margin: 0.35rem 0 0">{{ s.mission.title }}</p>
      <p style="margin: 0.25rem 0 0; font-size: 0.85rem; color: var(--muted)">{{ $t('activity.statusLabel', { status: s.status }) }}</p>
    </div>
  </div>
</template>
