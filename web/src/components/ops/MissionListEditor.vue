<script setup lang="ts">
import type { MissionRowState } from '../../utils/missionRow'
import { emptyMissionRow } from '../../utils/missionRow'

const rows = defineModel<MissionRowState[]>({ required: true })

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
</script>

<template>
  <div class="mission-list">
    <div v-for="(row, i) in rows" :key="row.key" class="mission-card card">
      <div class="mission-head">
        <span class="idx">미션 {{ i + 1 }}</span>
        <button type="button" class="btn btn-sm" :disabled="rows.length <= 1" @click="removeRow(i)">삭제</button>
      </div>
      <div class="field">
        <label>유형</label>
        <select
          :value="row.type"
          @change="updateRow(i, { type: ($event.target as HTMLSelectElement).value })"
        >
          <option value="LINK_VISIT">링크 방문</option>
          <option value="SURVEY">설문·코드</option>
          <option value="CODE">코드 입력</option>
          <option value="QUIZ">퀴즈</option>
          <option value="CHECKIN">체크인</option>
          <option value="FILE_UPLOAD">파일 업로드</option>
        </select>
      </div>
      <div class="field">
        <label>미션 제목</label>
        <input :value="row.title" placeholder="예: 공식 홈 방문하기" @input="updateRow(i, { title: ($event.target as HTMLInputElement).value })" />
      </div>
      <div class="field">
        <label>설명 (선택)</label>
        <textarea :value="row.description" rows="2" @input="updateRow(i, { description: ($event.target as HTMLTextAreaElement).value })" />
      </div>
      <div class="field">
        <label>표시 순서</label>
        <input
          type="number"
          :value="row.sortOrder"
          @input="updateRow(i, { sortOrder: Number(($event.target as HTMLInputElement).value) })"
        />
      </div>

      <div class="type-box">
        <template v-if="row.type === 'LINK_VISIT'">
          <div class="field">
            <label>링크 URL</label>
            <input :value="row.linkUrl" type="url" placeholder="https://..." @input="updateRow(i, { linkUrl: ($event.target as HTMLInputElement).value })" />
          </div>
          <div class="field">
            <label>최소 체류 (초)</label>
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
            <label>정답 코드</label>
            <input :value="row.correctCode" @input="updateRow(i, { correctCode: ($event.target as HTMLInputElement).value })" />
          </div>
        </template>

        <template v-else-if="row.type === 'SURVEY'">
          <div class="field">
            <label>질문 내용 (미션 카드에서 바로 응답)</label>
            <textarea :value="row.surveyQuestion" rows="2" placeholder="예: 우리 서비스를 사용해본 소감을 적어주세요." @input="updateRow(i, { surveyQuestion: ($event.target as HTMLTextAreaElement).value })" />
          </div>
          <div class="field">
            <label>설문/폼 링크 (추가 정보 제공용 - 선택)</label>
            <input :value="row.linkUrl" type="url" placeholder="https://..." @input="updateRow(i, { linkUrl: ($event.target as HTMLInputElement).value })" />
          </div>
          <div class="field">
            <label>제출 코드 (특정 정답이 필요한 경우에만 입력)</label>
            <input :value="row.correctCode" placeholder="비워두면 모든 답변이 통과됩니다" @input="updateRow(i, { correctCode: ($event.target as HTMLInputElement).value })" />
          </div>
          <div class="field">
            <label>하단 안내 문구</label>
            <textarea :value="row.surveyNote" rows="2" @input="updateRow(i, { surveyNote: ($event.target as HTMLTextAreaElement).value })" />
          </div>
        </template>

        <template v-else-if="row.type === 'QUIZ'">
          <div class="field">
            <label>질문</label>
            <input :value="row.quizQuestion" @input="updateRow(i, { quizQuestion: ($event.target as HTMLInputElement).value })" />
          </div>
          <div class="field">
            <label>보기 (정답에 라디오 선택)</label>
            <div v-for="(_, oi) in row.quizOptions" :key="oi" class="quiz-row">
              <input
                type="radio"
                :checked="row.quizCorrectIndex === oi"
                @change="updateRow(i, { quizCorrectIndex: oi })"
              />
              <input
                :value="row.quizOptions[oi]"
                :placeholder="'보기 ' + (oi + 1)"
                @input="
                  (e) => {
                    const v = (e.target as HTMLInputElement).value
                    const opts = [...row.quizOptions]
                    opts[oi] = v
                    updateRow(i, { quizOptions: opts })
                  }
                "
              />
              <button type="button" class="btn btn-sm" @click="removeQuizOption(i, oi)">삭제</button>
            </div>
            <button type="button" class="btn" style="width: 100%; margin-top: 0.25rem" @click="addQuizOption(i)">+ 보기 추가</button>
          </div>
        </template>

        <template v-else-if="row.type === 'FILE_UPLOAD'">
          <div class="field">
            <label>업로드 안내</label>
            <input :value="row.fileNote" @input="updateRow(i, { fileNote: ($event.target as HTMLInputElement).value })" />
          </div>
        </template>

        <template v-else-if="row.type === 'CHECKIN'">
          <p class="hint">참여자가 내용 확인에 동의하면 완료됩니다.</p>
        </template>
      </div>
    </div>

    <button type="button" class="btn" style="width: 100%" @click="addRow">+ 미션 추가</button>
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
</style>
