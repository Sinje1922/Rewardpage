<script setup lang="ts">
import { onMounted, ref, watch, onBeforeUnmount } from 'vue'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'

const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits(['update:modelValue'])

const editorRef = ref<HTMLElement | null>(null)
let quill: Quill | null = null

onMounted(() => {
  if (!editorRef.value) return

  quill = new Quill(editorRef.value, {
    theme: 'snow',
    placeholder: props.placeholder || '',
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image', 'video'],
        ['clean']
      ]
    }
  })

  // Set initial content
  if (props.modelValue) {
    quill.root.innerHTML = props.modelValue
  }

  // Handle changes
  quill.on('text-change', () => {
    const html = quill?.root.innerHTML || ''
    if (html === '<p><br></p>') {
      emit('update:modelValue', '')
    } else {
      emit('update:modelValue', html)
    }
  })
})

// Sync from outside (if needed, but usually one-way for draft)
watch(() => props.modelValue, (newVal) => {
  if (quill && newVal !== quill.root.innerHTML) {
    quill.root.innerHTML = newVal || ''
  }
})

onBeforeUnmount(() => {
  quill = null
})
</script>

<template>
  <div class="rich-editor-container">
    <div ref="editorRef" class="rich-editor"></div>
  </div>
</template>

<style>
.rich-editor-container {
  background: rgba(255, 255, 255, 0.4);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  overflow: hidden;
  transition: all 0.2s ease;
}

.rich-editor-container:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
  background: var(--panel);
}

.rich-editor {
  min-height: 200px;
  max-height: 600px;
  overflow-y: auto;
  font-family: var(--sans);
  font-size: 1rem;
  border: none !important;
}

.ql-toolbar.ql-snow {
  border: none !important;
  border-bottom: 1px solid var(--border) !important;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.5rem !important;
}

.ql-container.ql-snow {
  border: none !important;
}

.ql-editor {
  padding: 1rem !important;
  line-height: 1.6;
}

.ql-editor.ql-blank::before {
  color: var(--muted) !important;
  font-style: normal !important;
  left: 1rem !important;
}

/* Dark Mode Adjustments */
:root.dark .rich-editor-container {
  background: rgba(15, 23, 42, 0.4);
}

:root.dark .ql-toolbar.ql-snow {
  background: rgba(15, 23, 42, 0.2);
}

:root.dark .ql-snow .ql-stroke {
  stroke: var(--text-h) !important;
}

:root.dark .ql-snow .ql-fill {
  fill: var(--text-h) !important;
}

:root.dark .ql-snow .ql-picker {
  color: var(--text-h) !important;
}

:root.dark .ql-snow .ql-picker-options {
  background-color: var(--bg-deep) !important;
  border-color: var(--border) !important;
}
</style>
