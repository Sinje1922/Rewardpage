<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api, getFileUrl } from '../../api/client'
import { uploadCompanyLogo } from '../../api/upload'
import MissionListEditor from '../../components/ops/MissionListEditor.vue'
import { emptyMissionRow, rowToPayload, validateRows, type MissionRowState } from '../../utils/missionRow'

const { t } = useI18n()
const router = useRouter()
const companyName = ref('')
const companyLogoUrl = ref('')
const title = ref('')
const description = ref('')
const winnerCount = ref(1)
const lotteryMode = ref<'SIMPLE' | 'WEIGHTED'>('SIMPLE')
const autoApprove = ref(true)
const totalRewardPoints = ref(0)
const startsAt = ref('')
const endsAt = ref('')
const missionRows = ref<MissionRowState[]>([emptyMissionRow(0)])
const err = ref('')

const logoUploading = ref(false)
const logoFileInput = ref<HTMLInputElement | null>(null)

async function onLogoFile(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  err.value = ''
  logoUploading.value = true
  try {
    companyLogoUrl.value = await uploadCompanyLogo(file)
  } catch {
    err.value = t('ops.logoUploadFail')
  } finally {
    logoUploading.value = false
    input.value = ''
  }
}

function clearLogo() {
  companyLogoUrl.value = ''
}

async function save() {
  err.value = ''
  const v = validateRows(missionRows.value)
  if (v) {
    err.value = v
    return
  }
  if (!title.value.trim()) {
    err.value = t('ops.titleRequired')
    return
  }
  const missions = missionRows.value.map((r, i) => rowToPayload(r, i))
  try {
    const { data } = await api.post<{ id: string }>('/campaigns', {
      title: title.value.trim(),
      description: description.value,
      companyName: companyName.value.trim(),
      companyLogoUrl: companyLogoUrl.value.trim(),
      winnerCount: winnerCount.value,
      lotteryMode: lotteryMode.value,
      autoApprove: autoApprove.value,
      totalRewardPoints: totalRewardPoints.value,
      startsAt: startsAt.value ? new Date(startsAt.value).toISOString() : null,
      endsAt: endsAt.value ? new Date(endsAt.value).toISOString() : null,
      missions,
    })
    await router.replace(`/ops/campaigns/${data.id}`)
  } catch {
    err.value = t('ops.saveFail')
  }
}
</script>

<template>
  <div>
    <h1 class="page-title">{{ $t('ops.createTitle') }}</h1>
    <p style="color: var(--muted); margin: 0 0 1rem; max-width: 40rem">
      {{ $t('ops.createLead') }}
    </p>

    <form class="stack" @submit.prevent="save">
      <section class="card">
        <h2 class="section-title">{{ $t('ops.clientSection') }}</h2>
        <div class="field">
          <label>{{ $t('ops.companyName') }}</label>
          <input v-model="companyName" :placeholder="t('ops.companyNameHint') || '○○ Co., Ltd.'" />
        </div>
        <div class="field">
          <label>{{ $t('ops.companyLogo') }}</label>
          <div class="logo-row">
            <img v-if="companyLogoUrl" :src="getFileUrl(companyLogoUrl)" alt="" class="logo-preview" />
            <div class="logo-actions">
              <input
                ref="logoFileInput"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                class="sr-only"
                @change="onLogoFile"
              />
              <button type="button" class="btn" :disabled="logoUploading" @click="logoFileInput?.click()">
                {{ logoUploading ? $t('ops.uploading') : $t('ops.selectFile') }}
              </button>
              <button v-if="companyLogoUrl" type="button" class="btn" @click="clearLogo">{{ $t('ops.remove') }}</button>
            </div>
          </div>
          <p class="hint">{{ $t('ops.logoHint') }}</p>
        </div>
        <div class="field">
          <label>{{ $t('ops.logoUrl') }}</label>
          <input v-model="companyLogoUrl" type="text" placeholder="https://… or /uploads/…" />
        </div>
      </section>

      <section class="card">
        <h2 class="section-title">{{ $t('ops.campaignSection') }}</h2>
        <div class="field">
          <label>{{ $t('ops.campaignTitle') }}</label>
          <input v-model="title" required />
        </div>
        <div class="field">
          <label>{{ $t('ops.description') }}</label>
          <textarea v-model="description" rows="3" />
        </div>
        <div class="field">
          <label>{{ $t('ops.winnerCount') }}</label>
          <input v-model.number="winnerCount" type="number" min="1" required />
        </div>
        <div class="field">
          <label>{{ $t('ops.lotteryMode') }}</label>
          <select v-model="lotteryMode">
            <option value="SIMPLE">{{ $t('ops.lotterySimple') }}</option>
            <option value="WEIGHTED">{{ $t('ops.lotteryWeighted') }}</option>
          </select>
        </div>
        <label style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 1rem">
          <input v-model="autoApprove" type="checkbox" />
          {{ $t('ops.autoApprove') }}
        </label>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem">
          <div class="field">
            <label>{{ $t('ops.startsAt') }}</label>
            <input v-model="startsAt" type="datetime-local" />
          </div>
          <div class="field">
            <label>{{ $t('ops.endsAt') }}</label>
            <input v-model="endsAt" type="datetime-local" />
          </div>
        </div>

        <div class="field reward-box">
          <label>{{ $t('ops.totalReward') }}</label>
          <input v-model.number="totalRewardPoints" type="number" min="0" step="100" placeholder="1000" />
          <p v-if="winnerCount > 0" class="reward-hint">
            {{ $t('ops.rewardHint', { points: Math.floor(totalRewardPoints / winnerCount) }) }}
          </p>
        </div>
      </section>

      <section class="card">
        <h2 class="section-title">{{ $t('ops.missionSection') }}</h2>
        <MissionListEditor v-model="missionRows" />
      </section>

      <p v-if="err" class="err">{{ err }}</p>
      <button class="btn primary" type="submit">{{ $t('ops.saveBtn') }}</button>
    </form>
  </div>
</template>

<style scoped>
.stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 40rem;
}
.section-title {
  font-size: 1.05rem;
  margin: 0 0 0.75rem;
  color: var(--text-h);
}
.reward-box {
  padding: 1rem;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  border: 1px dashed var(--accent-border);
}
.reward-hint {
  margin: 0.35rem 0 0;
  font-size: 0.9rem;
}
.logo-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.logo-preview {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  object-fit: cover;
  border: 1px solid var(--border);
}
.logo-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
.hint {
  margin: 0.35rem 0 0;
  font-size: 0.82rem;
  color: var(--muted);
}
</style>

