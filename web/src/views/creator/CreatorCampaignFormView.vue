<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api, getFileUrl } from '../../api/client'
import { uploadCompanyLogo } from '../../api/upload'
import MissionListEditor from '../../components/ops/MissionListEditor.vue'
import RichEditor from '../../components/common/RichEditor.vue'
import { emptyMissionRow, rowToPayload, validateRows, type MissionRowState } from '../../utils/missionRow'

const { t } = useI18n()
const router = useRouter()
const currentStep = ref(1)

const companyName = ref('')
const companyLogoUrl = ref('')
const title = ref('')
const description = ref('')
const winnerCount = ref(1)
const lotteryMode = ref<'SIMPLE' | 'WEIGHTED'>('SIMPLE')
const autoApprove = ref(true)
const rewards = ref<{ amount: number; currency: string }[]>([{ amount: 0, currency: 'POINT' }])
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

function addReward() {
  rewards.value.push({ amount: 0, currency: 'POINT' })
}

function removeReward(index: number) {
  if (rewards.value.length > 1) {
    rewards.value.splice(index, 1)
  }
}

const isStep1Valid = computed(() => !!title.value.trim())
const isStep2Valid = computed(() => winnerCount.value > 0 && rewards.value.some(r => r.amount > 0))
const isStep3Valid = computed(() => missionRows.value.length > 0)

const isAllValid = computed(() => isStep1Valid.value && isStep2Valid.value && isStep3Valid.value)

function goToStep(step: number) {
  err.value = ''
  currentStep.value = step
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function nextStep() {
  err.value = ''
  if (currentStep.value === 1) {
    if (!title.value.trim()) {
      err.value = t('ops.titleRequired')
      return
    }
  }
  if (currentStep.value < 3) {
    currentStep.value++
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

async function save() {
  err.value = ''
  
  if (!isStep1Valid.value) {
    err.value = t('ops.titleRequired')
    currentStep.value = 1
    return
  }
  if (!isStep2Valid.value) {
    err.value = t('error.logisticsRequired') || 'Please complete Step 2 (Winner count and rewards)'
    currentStep.value = 2
    return
  }
  if (!isStep3Valid.value) {
    err.value = t('error.missionsRequired') || 'Please add at least one mission'
    currentStep.value = 3
    return
  }

  const v = validateRows(missionRows.value)
  if (v) {
    err.value = v
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
      totalRewardPoints: rewards.value[0]?.amount || 0, // Legacy fallback
      rewardCurrency: rewards.value[0]?.currency || "POINT", // Legacy fallback
      rewardsConfig: rewards.value,
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
  <div class="creator-form-page">
    <h1 class="page-title">{{ $t('ops.createTitle') }}</h1>
    
    <!-- Step Indicator -->
    <div class="step-indicator">
      <div 
        v-for="step in 3" 
        :key="step" 
        class="step-item" 
        :class="{ 
          active: currentStep === step, 
          completed: (step === 1 && isStep1Valid) || (step === 2 && isStep2Valid) || (step === 3 && isStep3Valid)
        }"
        @click="goToStep(step)"
      >
        <div class="step-num">
          <template v-if="step === 1 && isStep1Valid">✓</template>
          <template v-else-if="step === 2 && isStep2Valid">✓</template>
          <template v-else-if="step === 3 && isStep3Valid">✓</template>
          <template v-else>{{ step }}</template>
        </div>
        <span class="step-label">
          {{ step === 1 ? $t('ops.step1') || 'Basic' : step === 2 ? $t('ops.step2') || 'Logistics' : $t('ops.step3') || 'Missions' }}
        </span>
      </div>
    </div>

    <form class="stack" @submit.prevent="save">
      <!-- Step 1: Client & Campaign Info -->
      <div v-if="currentStep === 1" class="step-content">
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
        </section>

        <section class="card">
          <h2 class="section-title">{{ $t('ops.campaignSection') }}</h2>
          <div class="field">
            <label>{{ $t('ops.campaignTitle') }}</label>
            <input v-model="title" required />
          </div>
          <div class="field">
            <label>{{ $t('ops.description') }}</label>
            <RichEditor v-model="description" :placeholder="t('ops.descPlaceholder')" />
          </div>
        </section>
      </div>

      <!-- Step 2: Logistics & Rewards -->
      <div v-if="currentStep === 2" class="step-content">
        <section class="card">
          <h2 class="section-title">{{ $t('ops.logisticsSection') || 'Logistics' }}</h2>
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
          <label style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 1.5rem">
            <input v-model="autoApprove" type="checkbox" />
            {{ $t('ops.autoApprove') }}
          </label>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem">
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
            <div v-for="(r, idx) in rewards" :key="idx" style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem">
              <input v-model.number="r.amount" type="number" min="0" step="1" placeholder="1000" style="flex: 1" />
              <select v-model="r.currency" style="width: 120px">
                <option value="POINT">{{ $t('common.point') || 'POINT' }}</option>
                <option value="USDT">USDT</option>
                <option value="BRL">BRL ({{ $t('common.brl') || 'Real' }})</option>
                <option value="METAQ">METAQ ({{ $t('common.metaq') || 'Coin' }})</option>
              </select>
              <button v-if="rewards.length > 1" type="button" class="btn outline" @click="removeReward(idx)">✕</button>
            </div>
            <button type="button" class="btn btn-sm" style="margin-bottom: 1rem" @click="addReward">+ {{ $t('ops.addReward') || 'Add Reward' }}</button>
            
            <div v-if="winnerCount > 0" class="reward-hint">
              <p v-for="(r, idx) in rewards" :key="idx">
                • {{ r.currency }}: {{ Math.floor(r.amount / winnerCount).toLocaleString() }} / {{ $t('common.person') || 'person' }}
              </p>
            </div>
          </div>
        </section>
      </div>

      <!-- Step 3: Missions -->
      <div v-if="currentStep === 3" class="step-content">
        <section class="card">
          <h2 class="section-title">{{ $t('ops.missionSection') }}</h2>
          <MissionListEditor v-model="missionRows" />
        </section>
      </div>

      <!-- Form Footer -->
      <p v-if="err" class="err">{{ err }}</p>
      <div class="form-footer">
        <button v-if="currentStep > 1" type="button" class="btn outline" @click="prevStep">
          {{ $t('common.prev') || 'Previous' }}
        </button>
        <div style="flex: 1"></div>
        <button v-if="currentStep < 3" type="button" class="btn primary" @click="nextStep">
          {{ $t('common.next') || 'Next' }}
        </button>
        <button v-if="currentStep === 3" class="btn primary" type="submit">
          {{ $t('ops.saveBtn') }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.creator-form-page {
  padding-bottom: 5rem;
}
.stack {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 1000px;
  margin: 0 auto;
}

/* Step Indicator */
.step-indicator {
  display: flex;
  justify-content: center;
  gap: 3rem;
  margin-bottom: 3rem;
  position: relative;
}
.step-indicator::before {
  content: '';
  position: absolute;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 2px;
  background: var(--border);
  z-index: 0;
}
.step-item {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: var(--muted);
  transition: all 0.3s ease;
  cursor: pointer;
}
.step-item:hover {
  transform: translateY(-2px);
}
.step-item:hover .step-num {
  border-color: var(--accent);
  box-shadow: 0 5px 15px var(--accent-soft);
}
.step-num {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--panel);
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}
.step-label {
  font-size: 0.85rem;
  font-weight: 700;
  white-space: nowrap;
}
.step-item.active {
  color: var(--accent);
}
.step-item.active .step-num {
  border-color: var(--accent);
  background: var(--accent);
  color: white;
  box-shadow: 0 0 15px var(--accent-soft);
}
.step-item.completed {
  color: var(--text-h);
}
.step-item.completed .step-num {
  border-color: var(--accent);
  background: var(--panel);
  color: var(--accent);
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.section-title {
  font-size: 1.15rem;
  margin: 0 0 1.25rem;
  color: var(--text-h);
  font-weight: 800;
}

.form-footer {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-top: 1rem;
  margin-top: 1rem;
  border-top: 1px solid var(--border);
}

.reward-box {
  padding: 1.25rem;
  border-radius: 1rem;
  background: var(--accent-soft);
  border: 1px dashed var(--accent-border);
}
.reward-hint {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--accent-border);
  font-size: 0.9rem;
  color: var(--accent);
  font-weight: 600;
}
.logo-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}
.logo-preview {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  object-fit: cover;
  border: 1px solid var(--border);
  background: var(--bg-deep);
}
.logo-actions {
  display: flex;
  gap: 0.75rem;
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
  font-size: 0.85rem;
  color: var(--muted);
  line-height: 1.4;
}
</style>

