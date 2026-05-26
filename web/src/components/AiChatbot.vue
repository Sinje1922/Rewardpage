<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { api } from '../api/client'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { t, locale } = useI18n()

interface Message {
  id: string
  sender: 'user' | 'bot'
  text: string
  timestamp: Date
}

const messages = ref<Message[]>([])
const inputText = ref('')
const isLoading = ref(false)
const chatBodyRef = ref<HTMLElement | null>(null)

// 챗봇 열릴 때 초기 인사말 설정 및 대화 기록 로드
watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    if (messages.value.length === 0) {
      isLoading.value = true
      try {
        const response = await api.get('/chat/history')
        const history = response.data || []
        if (history.length > 0) {
          messages.value = history.map((item: any) => ({
            id: item.id || 'history-' + Math.random(),
            sender: item.sender,
            text: item.text,
            timestamp: item.createdAt ? new Date(item.createdAt) : new Date()
          }))
        } else {
          // 대화 기록이 없으면 환영 메시지 추가
          messages.value = [{
            id: 'welcome',
            sender: 'bot',
            text: t('chatbot.welcomeMsg'),
            timestamp: new Date()
          }]
        }
      } catch (error) {
        console.error('Failed to load chat history:', error)
        // 로딩 에러 시 기본 환영 메시지로 대응
        messages.value = [{
          id: 'welcome',
          sender: 'bot',
          text: t('chatbot.welcomeMsg'),
          timestamp: new Date()
        }]
      } finally {
        isLoading.value = false
        scrollToBottom()
      }
    } else {
      scrollToBottom()
    }
  }
})

// 부드러운 하단 스크롤 동기화
const scrollToBottom = () => {
  nextTick(() => {
    if (chatBodyRef.value) {
      chatBodyRef.value.scrollTo({
        top: chatBodyRef.value.scrollHeight,
        behavior: 'smooth'
      })
    }
  })
}

// 메시지 전송 로직
const sendMessage = async (textToSend: string) => {
  const text = textToSend.trim()
  if (!text || isLoading.value) return

  // 1. 유저 메시지 추가
  const userMsgId = 'user-' + Date.now()
  messages.value.push({
    id: userMsgId,
    sender: 'user',
    text,
    timestamp: new Date()
  })
  inputText.value = ''
  scrollToBottom()

  // 2. 로딩 상태 활성화 (Typing Indicator 표시)
  isLoading.value = true

  try {
    // 3. 백엔드 API 통신
    const response = await api.post('/chat', {
      message: text,
      locale: locale.value
    })

    const reply = response.data?.reply || t('common.errorLoad')

    // 4. 봇 응답 추가
    messages.value.push({
      id: 'bot-' + Date.now(),
      sender: 'bot',
      text: reply,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Failed to get chatbot response:', error)
    messages.value.push({
      id: 'error-' + Date.now(),
      sender: 'bot',
      text: t('common.errorLoad'),
      timestamp: new Date()
    })
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

// 퀵 칩 선택 처리
const handleQuickChip = (chipType: 'platform' | 'rewards' | 'raffle' | 'withdrawal') => {
  let queryText = ''
  switch (chipType) {
    case 'platform':
      queryText = t('chatbot.chipPlatform')
      break
    case 'rewards':
      queryText = t('chatbot.chipRewards')
      break
    case 'raffle':
      queryText = t('chatbot.chipRaffle')
      break
    case 'withdrawal':
      queryText = t('chatbot.chipWithdrawal')
      break
  }
  sendMessage(queryText)
}
</script>

<template>
  <div>
    <!-- Backdrop overlay to close when click outside -->
    <transition name="fade">
      <div v-if="isOpen" class="chat-backdrop" @click="emit('close')" />
    </transition>

    <!-- Side Chat Drawer -->
    <transition name="slide-drawer">
      <div v-if="isOpen" class="chat-drawer">
        <!-- Header -->
        <div class="drawer-header">
          <div class="header-brand">
            <span class="bot-icon">🤖</span>
            <h3>{{ t('chatbot.title') }}</h3>
          </div>
          <button class="close-btn" @click="emit('close')" aria-label="Close Chat">
            <span class="close-icon">&times;</span>
          </button>
        </div>

        <!-- Chat Main Area -->
        <div ref="chatBodyRef" class="drawer-body">
          <div class="message-list">
            <div 
              v-for="msg in messages" 
              :key="msg.id" 
              :class="['message-wrapper', msg.sender]"
            >
              <div class="avatar-circle" v-if="msg.sender === 'bot'">🤖</div>
              <div class="message-bubble-container">
                <div class="message-bubble" v-html="msg.text.replace(/\n/g, '<br />')"></div>
                <span class="message-time">
                  {{ msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
                </span>
              </div>
            </div>

            <!-- Typing Indicator (Thinking Motion) -->
            <div v-if="isLoading" class="message-wrapper bot">
              <div class="avatar-circle">🤖</div>
              <div class="message-bubble-container">
                <div class="message-bubble thinking-bubble">
                  <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Recommendation Chips (Always at the bottom of messages or inside greet) -->
          <div class="quick-chips-container" v-if="!isLoading">
            <button class="quick-chip" @click="handleQuickChip('platform')">
              {{ t('chatbot.chipPlatform') }}
            </button>
            <button class="quick-chip" @click="handleQuickChip('rewards')">
              {{ t('chatbot.chipRewards') }}
            </button>
            <button class="quick-chip" @click="handleQuickChip('raffle')">
              {{ t('chatbot.chipRaffle') }}
            </button>
            <button class="quick-chip" @click="handleQuickChip('withdrawal')">
              {{ t('chatbot.chipWithdrawal') }}
            </button>
          </div>
        </div>

        <!-- Footer / Input Form -->
        <div class="drawer-footer">
          <form @submit.prevent="sendMessage(inputText)" class="input-form">
            <input 
              v-model="inputText"
              type="text" 
              :placeholder="t('chatbot.inputPlaceholder')"
              :disabled="isLoading"
              maxlength="300"
              class="chat-input"
            />
            <button type="submit" class="send-btn" :disabled="!inputText.trim() || isLoading">
              <span class="send-icon">✈️</span>
            </button>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* Backdrop Overlay */
.chat-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.2);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 2000;
  transition: opacity 0.3s ease;
}

/* Chat Drawer: Glassmorphism from Right */
.chat-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 420px;
  max-width: 100vw;
  height: 100vh;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border-left: 1px solid rgba(226, 232, 240, 0.4);
  box-shadow: -10px 0 40px rgba(0, 0, 0, 0.05);
  z-index: 2001;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

:root.dark .chat-drawer {
  background: rgba(15, 23, 42, 0.75);
  border-left: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: -10px 0 40px rgba(0, 0, 0, 0.3);
}

/* Header Design */
.drawer-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

:root.dark .drawer-header {
  border-bottom-color: rgba(255, 255, 255, 0.05);
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.bot-icon {
  font-size: 1.5rem;
  animation: bounce 3s ease-in-out infinite;
}

.drawer-header h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 850;
  color: var(--text-h);
  letter-spacing: -0.02em;
}

.close-btn {
  background: transparent;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, transform 0.2s;
  color: var(--text-h);
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  transform: scale(1.05) rotate(90deg);
}

:root.dark .close-btn:hover {
  background: rgba(255, 255, 255, 0.05);
}

.close-icon {
  font-size: 1.5rem;
  font-weight: 400;
  line-height: 1;
}

/* Chat Body (Messages) */
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  box-sizing: border-box;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.message-wrapper {
  display: flex;
  gap: 0.75rem;
  max-width: 85%;
  align-self: flex-start;
}

.message-wrapper.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.avatar-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  box-shadow: 0 4px 10px rgba(99, 102, 241, 0.2);
  flex-shrink: 0;
}

.message-bubble-container {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.message-wrapper.user .message-bubble-container {
  align-items: flex-end;
}

.message-bubble {
  padding: 0.85rem 1.15rem;
  border-radius: 1.25rem;
  font-size: 0.95rem;
  line-height: 1.5;
  font-weight: 500;
  word-break: break-word;
}

.message-wrapper.bot .message-bubble {
  background: white;
  color: #1e293b;
  border: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
  border-top-left-radius: 4px;
}

:root.dark .message-wrapper.bot .message-bubble {
  background: rgba(30, 41, 59, 0.8);
  color: #f8fafc;
  border-color: rgba(255, 255, 255, 0.03);
}

.message-wrapper.user .message-bubble {
  background: #6366f1;
  color: white;
  border-top-right-radius: 4px;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.15);
}

.message-time {
  font-size: 0.72rem;
  color: var(--muted);
  font-weight: 600;
  padding: 0 0.2rem;
}

/* Quick Recommendation Chips */
.quick-chips-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 1rem;
}

.quick-chip {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(99, 102, 241, 0.15);
  color: #6366f1;
  padding: 0.6rem 1.1rem;
  border-radius: 99px;
  font-size: 0.85rem;
  font-weight: 750;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.03);
}

:root.dark .quick-chip {
  background: rgba(30, 41, 59, 0.4);
  border-color: rgba(99, 102, 241, 0.25);
  color: #a5b4fc;
}

.quick-chip:hover {
  background: #6366f1;
  color: white;
  border-color: #6366f1;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
}

/* Input Footer */
.drawer-footer {
  padding: 1.25rem 1.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  background: rgba(255, 255, 255, 0.3);
}

:root.dark .drawer-footer {
  border-top-color: rgba(255, 255, 255, 0.05);
  background: rgba(15, 23, 42, 0.3);
}

.input-form {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.chat-input {
  flex: 1;
  padding: 0.85rem 1.25rem;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: white;
  color: var(--text);
  font-size: 0.92rem;
  font-weight: 600;
  outline: none;
  transition: all 0.25s ease;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.01);
}

:root.dark .chat-input {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.8);
}

.chat-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.send-btn {
  width: 46px;
  height: 46px;
  border-radius: 16px;
  background: #6366f1;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.25);
}

.send-btn:hover:not(:disabled) {
  background: #4f46e5;
  transform: scale(1.05) translateY(-2px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.35);
}

.send-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.send-btn:disabled {
  background: #cbd5e1;
  color: #94a3b8;
  cursor: not-allowed;
  box-shadow: none;
}

:root.dark .send-btn:disabled {
  background: #334155;
  color: #64748b;
}

.send-icon {
  font-size: 1.1rem;
  display: inline-block;
  transition: transform 0.25s ease;
}

.send-btn:hover:not(:disabled) .send-icon {
  transform: translate(2px, -2px) rotate(-10deg);
}

/* Typing / Thinking Animation Indicator */
.thinking-bubble {
  min-width: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1rem !important;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
}

.typing-indicator span {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #6366f1;
  opacity: 0.6;
  animation: wave 1.4s infinite ease-in-out both;
}

:root.dark .typing-indicator span {
  background: #a5b4fc;
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

/* Keyframes */
@keyframes wave {
  0%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-6px);
  }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

/* Transitions */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.slide-drawer-enter-active, .slide-drawer-leave-active {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-drawer-enter-from, .slide-drawer-leave-to {
  transform: translateX(100%);
}
</style>
