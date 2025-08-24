<script setup lang="ts">
import { useLoadingBar } from 'naive-ui'
import { FileUploadRound as FileUploadIcon } from '@vicons/material'
import {computed, ref, onBeforeUnmount} from 'vue'
import axios from 'axios'

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) ?? 'http://10.24.1.26:7988'
const loadingBar = useLoadingBar()

const props = defineProps<{
  promptProvider?: () => string | Promise<string>
  iImageFileProvider?: () => File | null | Promise<File | null>
  extraDataProvider?: () => Record<string, any>
  endpoint?: string
  method?: 'POST' | 'PUT'
}>()

const emit = defineEmits<{
  (e: 'success', payload: any): void
  (e: 'error', error: any): void
  (e: 'finally'): void
}>()

const isLoading = ref(false)

async function handleClick() {
  if (isLoading.value) return
  try {
    isLoading.value = true
    loadingBar.start()

    const prompt = props.promptProvider ? await props.promptProvider() : ''
    const imageFile = props.iImageFileProvider ? await props.iImageFileProvider() : null
    const extraData = props.extraDataProvider ? props.extraDataProvider() : null

    const form = new FormData()
    form.append('prompt', prompt ?? '')
    if (imageFile) {
      form.append('image', imageFile, imageFile.name)
    }

    // 额外字段
    if (extraData) {
      Object.entries(extraData).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          form.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v))
        }
      })
    }

    const url = `${API_BASE}${props.endpoint ?? '/submit'}`
    const method = props.method ?? 'POST'

    const resp = await axios.request({
      url,
      method,
      data: form,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    loadingBar.finish()
    emit('success', resp.data)
  } catch (err) {
    loadingBar.error()
    emit('error', err)
  } finally {
    isLoading.value = false
    emit('finally')
  }
}

</script>

<template>
  <n-button
      strong
      secondary
      style="width: 100%;"
      :disabled="isLoading"
      @click="handleClick"
  >
    <template #icon>
      <NIcon>
        <FileUploadIcon/>
      </NIcon>
    </template>
    {{isLoading ? 'Waiting' : 'Submit'}}
  </n-button>
</template>

<style scoped>

</style>