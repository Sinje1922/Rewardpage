<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { MissionRowState } from '../../utils/missionRow'
import { emptyMissionRow } from '../../utils/missionRow'

const { t } = useI18n()
const rows = defineModel<MissionRowState[]>({ required: true })
// ... (rest of the script logic remains the same)
function updateRow(i: number, patch: Partial<MissionRowState>) {
  const next = rows.value.map((r, j) => (j === i ? { ...r, ...patch } : r))
  rows.value = next
}

function addRow() {
  rows.value = [...rows.value, emptyMissionRow(rows.value.length)]
}

function removeRow(i: number) {
  if (rows.value.length <= 1) return
  rows.value = rows.value.filter((_, j) => j !== i)
}

function addQuizOption(i: number) {
  const r = rows.value[i]
  if (!r) return
  updateRow(i, { quizOptions: [...r.quizOptions, ''] })
}

function removeQuizOption(mi: number, oi: number) {
  const r = rows.value[mi]
  if (!r || r.quizOptions.length <= 1) return
  const quizOptions = r.quizOptions.filter((_, j) => j !== oi)
  let quizCorrectIndex = r.quizCorrectIndex
  if (oi === r.quizCorrectIndex) quizCorrectIndex = 0
  else if (oi < r.quizCorrectIndex) quizCorrectIndex = r.quizCorrectIndex - 1
  updateRow(mi, { quizOptions, quizCorrectIndex })
}

function addSurveyQuestion(mi: number) {
  const r = rows.value[mi]
  if (!r) return
  const nextQs = [
    ...r.surveyQuestions,
    { id: crypto.randomUUID(), type: 'SUBJECTIVE' as const, question: '', options: [] }
  ]
  updateRow(mi, { surveyQuestions: nextQs })
}

function removeSurveyQuestion(mi: number, qi: number) {
  const r = rows.value[mi]
  if (!r) return
  updateRow(mi, { surveyQuestions: r.surveyQuestions.filter((_, j) => j !== qi) })
}

function addSurveyOption(mi: number, qi: number) {
  const r = rows.value[mi]
  if (!r) return
  const nextQs = [...r.surveyQuestions]
  nextQs[qi] = { ...nextQs[qi], options: [...nextQs[qi].options, ''] }
  updateRow(mi, { surveyQuestions: nextQs })
}

function removeSurveyOption(mi: number, qi: number, oi: number) {
  const r = rows.value[mi]
  if (!r) return
  const nextQs = [...r.surveyQuestions]
  nextQs[qi] = { ...nextQs[qi], options: nextQs[qi].options.filter((_, j) => j !== oi) }
  updateRow(mi, { surveyQuestions: nextQs })
}
</script>

<template>
  <div class="mission-list">
    <div v-for="(row, i) in rows" :key="row.key" class="mission-card card">
      <div class="mission-head">
        <span class="idx">{{ $t('ops.missionNum', { n: i + 1 }) }}</span>
        <button type="button" class="btn btn-sm" :disabled="rows.length <= 1" @click="removeRow(i)">{{ $t('ops.remove') }}</button>
      </div>
      <div class="field">
        <label>{{ $t('ops.type') || 'Type' }}</label>
        <select
          :value="row.type"
          @change="updateRow(i, { type: ($event.target as HTMLSelectElement).value })"
        >
          <option value="LINK_VISIT">{{ $t('ops.typeLink') }}</option>
          <option value="SURVEY">{{ $t('ops.typeSurvey') }}</option>
          <option value="CODE">{{ $t('ops.typeCode') }}</option>
          <option value="QUIZ">{{ $t('ops.typeQuiz') }}</option>
          <option value="CHECKIN">{{ $t('ops.typeCheckin') }}</option>
          <option value="FILE_UPLOAD">{{ $t('ops.typeFile') }}</option>
        </select>
      </div>
      <div class="field">
        <label>{{ $t('ops.missionTitle') }}</label>
        <input :value="row.title" :placeholder="t('ops.titlePlaceholder')" @input="updateRow(i, { title: ($event.target as HTMLInputElement).value })" />
      </div>
      <div class="field">
        <label>{{ $t('ops.description') }} ({{ $t('common.optional') || 'Optional' }})</label>
        <textarea :value="row.description" rows="2" @input="updateRow(i, { description: ($event.target as HTMLTextAreaElement).value })" />
      </div>
      <div class="field">
        <label>{{ $t('ops.sortOrder') || 'Sort Order' }}</label>
        <input
          type="number"
          :value="row.sortOrder"
          @input="updateRow(i, { sortOrder: Number(($event.target as HTMLInputElement).value) })"
        />
      </div>

      <div class="type-box">
        <template v-if="row.type === 'LINK_VISIT'">
          <div class="field">
            <label>{{ $t('ops.linkUrl') || 'Link URL' }}</label>
            <input :value="row.linkUrl" type="url" placeholder="https://..." @input="updateRow(i, { linkUrl: ($event.target as HTMLInputElement).value })" />
          </div>
          <div class="field">
            <label>{{ $t('ops.minDwellLabel') }}</label>
            <input
              type="number"
              min="0"
              :value="row.minDwellSeconds"
              @input="updateRow(i, { minDwellSeconds: Number(($event.target as HTMLInputElement).value) })"
            />
          </div>
        </template>

        <template v-else-if="row.type === 'CODE'">
          <div class="field">
            <label>{{ $t('ops.correctCodeLabel') }}</label>
            <input :value="row.correctCode" @input="updateRow(i, { correctCode: ($event.target as HTMLInputElement).value })" />
          </div>
        </template>

        <template v-else-if="row.type === 'SURVEY'">
          <div class="field">
            <label>{{ $t('ops.surveyQuestions') }}</label>
            <div v-for="(qs, qi) in row.surveyQuestions" :key="qs.id" class="survey-q-box">
              <div class="survey-q-head">
                <span class="q-idx">{{ $t('ops.questionNum', { n: qi + 1 }) }}</span>
                <div class="q-ctrls">
                  <select :value="qs.type" @change="(e) => {
                    const nextQs = [...row.surveyQuestions];
                    nextQs[qi] = { ...nextQs[qi], type: (e.target as HTMLSelectElement).value as any };
                    if (nextQs[qi].type === 'OBJECTIVE' && nextQs[qi].options.length === 0) {
                      nextQs[qi].options = ['Option 1', 'Option 2'];
                    }
                    updateRow(i, { surveyQuestions: nextQs });
                  }">
                    <option value="SUBJECTIVE">{{ $t('ops.typeSubjective') }}</option>
                    <option value="OBJECTIVE">{{ $t('ops.typeObjective') }}</option>
                  </select>
                  <button type="button" class="btn btn-sm" @click="removeSurveyQuestion(i, qi)">{{ $t('ops.remove') }}</button>
                </div>
              </div>
              
              <input 
                :value="qs.question" 
                :placeholder="t('ops.questionPlaceholder')" 
                @input="(e) => {
                  const nextQs = [...row.surveyQuestions];
                  nextQs[qi] = { ...nextQs[qi], question: (e.target as HTMLInputElement).value };
                  updateRow(i, { surveyQuestions: nextQs });
                }"
              />

              <div v-if="qs.type === 'OBJECTIVE'" class="survey-opt-list">
                <div v-for="(_, oi) in qs.options" :key="oi" class="survey-opt-row">
                  <input 
                    :value="qs.options[oi]" 
                    :placeholder="t('ops.optionPlaceholder', { n: oi + 1 })"
                    @input="(e) => {
                      const nextQs = [...row.surveyQuestions];
                      const nextOpts = [...nextQs[qi].options];
                      nextOpts[oi] = (e.target as HTMLInputElement).value;
                      nextQs[qi] = { ...nextQs[qi], options: nextOpts };
                      updateRow(i, { surveyQuestions: nextQs });
                    }"
                  />
                  <button type="button" class="btn btn-sm" @click="removeSurveyOption(i, qi, oi)">x</button>
                </div>
                <button type="button" class="btn btn-sm" @click="addSurveyOption(i, qi)">{{ $t('ops.addOption') }}</button>
              </div>
            </div>
            <button type="button" class="btn btn-sm" style="width: 100%; margin-top: 0.5rem" @click="addSurveyQuestion(i)">{{ $t('ops.addQuestion') }}</button>
          </div>

          <div class="field" style="margin-top: 1rem">
            <label>{{ $t('ops.surveyCommonNote') }}</label>
            <textarea :value="row.surveyNote" rows="2" :placeholder="t('ops.surveyNotePlaceholder')" @input="updateRow(i, { surveyNote: ($event.target as HTMLTextAreaElement).value })" />
          </div>
          <div class="field">
            <label>{{ $t('ops.extraLink') }}</label>
            <input :value="row.linkUrl" type="url" placeholder="https://..." @input="updateRow(i, { linkUrl: ($event.target as HTMLInputElement).value })" />
          </div>
        </template>

        <template v-else-if="row.type === 'QUIZ'">
          <div class="field">
            <label>{{ $t('ops.quizQuestion') || 'Question' }}</label>
            <input :value="row.quizQuestion" @input="updateRow(i, { quizQuestion: ($event.target as HTMLInputElement).value })" />
          </div>
          <div class="field">
            <label>{{ $t('ops.quizRadioHint') }}</label>
            <div v-for="(_, oi) in row.quizOptions" :key="oi" class="quiz-row">
              <input
                type="radio"
                :checked="row.quizCorrectIndex === oi"
                @change="updateRow(i, { quizCorrectIndex: oi })"
              />
              <input
                :value="row.quizOptions[oi]"
                :placeholder="t('ops.optionPlaceholder', { n: oi + 1 })"
                @input="
                  (e) => {
                    const v = (e.target as HTMLInputElement).value
                    const opts = [...row.quizOptions]
                    opts[oi] = v
                    updateRow(i, { quizOptions: opts })
                  }
                "
              />
              <button type="button" class="btn btn-sm" @click="removeQuizOption(i, oi)">{{ $t('ops.remove') }}</button>
            </div>
            <button type="button" class="btn" style="width: 100%; margin-top: 0.25rem" @click="addQuizOption(i)">{{ $t('ops.addOption') }}</button>
          </div>
        </template>

        <template v-else-if="row.type === 'FILE_UPLOAD'">
          <div class="field">
            <label>{{ $t('ops.fileNoteLabel') }}</label>
            <input :value="row.fileNote" @input="updateRow(i, { fileNote: ($event.target as HTMLInputElement).value })" />
          </div>
        </template>

        <template v-else-if="row.type === 'CHECKIN'">
          <p class="hint">{{ $t('ops.checkinHint') }}</p>
        </template>
      </div>
    </div>

    <button type="button" class="btn" style="width: 100%" @click="addRow">{{ $t('ops.addMissionBtn') }}</button>
  </div>
</template>

<style scoped>
.mission-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.mission-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.idx {
  font-weight: 800;
  color: var(--text-h);
}
.btn-sm {
  padding: 0.25rem 0.6rem;
  font-size: 0.85rem;
}
.type-box {
  margin-top: 0.75rem;
  padding: 0.85rem;
  border-radius: var(--radius-sm);
  border: 1px dashed var(--border);
  background: color-mix(in srgb, var(--panel) 95%, var(--mint-soft));
}
.quiz-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.4rem;
}
.quiz-row input[type='text'] {
  flex: 1;
}
.hint {
  margin: 0;
  font-size: 0.9rem;
  color: var(--muted);
}
.survey-q-box {
  background: color-mix(in srgb, var(--bg-deep) 90%, var(--panel));
  padding: 0.75rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  margin-bottom: 0.75rem;
}
.survey-q-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.q-idx {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--muted);
}
.q-ctrls {
  display: flex;
  gap: 0.4rem;
}
.q-ctrls select {
  padding: 0.2rem 0.4rem;
  font-size: 0.8rem;
}
.survey-opt-list {
  margin-top: 0.5rem;
  padding-left: 0.5rem;
  border-left: 2px solid var(--border);
}
.survey-opt-row {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  margin-bottom: 0.25rem;
}
.survey-opt-row input {
  flex: 1;
  padding: 0.25rem 0.5rem;
  font-size: 0.85rem;
}
</style>
