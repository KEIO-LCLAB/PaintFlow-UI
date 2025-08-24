<script setup lang="ts">

import {
  BookOutline as BookIcon,
  PauseCircleOutline as PauseIcon,
  PlayCircleOutline as PlayIcon
} from "@vicons/ionicons5";
import {NIcon, NLoadingBarProvider} from "naive-ui";
import PaintEditor from "@/components/PaintEditor.vue";
import FramesPreview from "@/components/FramesPreview.vue";
import SubmitButton from "@/components/SubmitButton.vue";
import {computed, onBeforeUnmount, onMounted, ref, watch} from "vue";
import axios from 'axios'
import SketchEditor from "@/components/SketchEditor.vue";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) ?? 'http://10.24.1.26:7988'

type Props = {
  taskId: string
}

const props = withDefaults(defineProps<Props>(), {
  taskId: '',
})

const task_id = ref(props.taskId)

const sequenceFrames = ref<string[]>([])
const taskStatus = ref<string>('loading')
const progress = ref(5)

const isDone = computed(() => taskStatus.value === 'completed')

// 轮询定时器
const pollTimer = ref<number | undefined>(undefined)

function clearPolling() {
  if (pollTimer.value !== undefined) {
    clearInterval(pollTimer.value)
    pollTimer.value = undefined
  }
}

// 开始轮询任务状态
async function startPolling(id: string) {
  clearPolling()
  task_id.value = id
  taskStatus.value = 'loading'
  // 每 1 秒轮询一次
  pollTimer.value = window.setInterval(async () => {
    try {
      const statusResp = await axios.get(`${API_BASE}/api/task/${id}/status`, {
        timeout: 10000
      })
      const status = statusResp.data?.status
      const progress_value = statusResp.data?.progress || 0
      progress.value = Math.max(5, Math.min(100, progress_value))
      // 可选：若后端返回进度，可依据进度在 UI 做展示（naive-ui 的 loadingBar 无百分比 API，这里仅保持加载条运行）
      taskStatus.value = status
      if (status === 'completed') {
        clearPolling()
        // 获取结果
        const resultResp = await axios.get(`${API_BASE}/api/task/${id}/result`, {
          timeout: 15000
        })
        sequenceFrames.value = resultResp.data?.images || []
      } else if (status === 'failed' || status === 'error') {
        clearPolling()
        const errMsg = statusResp.data?.error_message || 'Task failed'
        console.log(errMsg)
      }
      // 其他状态（如 queued/running），继续轮询
    } catch (e) {
      // 轮询异常：结束并报错
      clearPolling()
    }
  }, 1000)
}


const paintEditorRef = ref<InstanceType<typeof PaintEditor> | null>(null)
// 作为 LoadingBar 的局部挂载目标
const loadingBarTargetRef = ref<string | false | HTMLElement>(false)
const modifyPrompt = ref('Can you draw it based on modified frame now?');
const selectedIdx = ref(0)

const playerIdx = ref(0)
const isPlaying = ref(false)
const intervalId = ref<number | null>(null)
const playerSpeed = ref(3)

const frameDelay = computed(() => 1000 / playerSpeed.value)

function startTimer() {
  if (intervalId.value) {
    clearInterval(intervalId.value)
    intervalId.value = null
  }
  intervalId.value = window.setInterval(() => {
    playerIdx.value = (playerIdx.value + 1) % sequenceFrames.value.length
  }, frameDelay.value)
}

function togglePlay() {
  isPlaying.value = !isPlaying.value
  if (isPlaying.value) {
    startTimer()
  } else if (intervalId.value) {
    clearInterval(intervalId.value)
    intervalId.value = null
  }
}

function formatTime(seconds: number) {
  return `${seconds} frames / s`
}


async function promptProvider() {
  return modifyPrompt.value;
}

async function imageFileProvider() {
  const url = await paintEditorRef.value!.exportImage();
  console.log('exportImage:', url)
  if (!url) return null;
  const response = await fetch(url);
  const blob = await response.blob();
  return new File([blob], 'sketch.png', {type: 'image/png'});
}

async function extraDataProvider() {
  const extraData: Record<string, unknown> = {
    "is_sketch": false,
    "image_index": selectedIdx.value,
  }
  return extraData;
}

function handleSubmitGenerateSuccess(data: any) {
  console.log('Submit success:', data)
  startPolling(data.task_id)
}

function handleSubmitGenerateError(err: any) {
  console.error('Submit error:', err)
}

watch(playerSpeed, () => {
  if (isPlaying.value) {
    startTimer()
  }
})

onMounted(() => {
  startPolling(props.taskId)
})

onBeforeUnmount(() => {
  if (intervalId.value) {
    clearInterval(intervalId.value)
  }
  clearPolling()
});
</script>

<template>
  <div v-if="isDone && sequenceFrames.length > 0">
    <FramesPreview
        :images="sequenceFrames"
        v-model:selectedIndex="selectedIdx"
    />
    <n-grid :cols="12" :x-gap="5">
      <n-gi :span="3">
        <n-card title="Video Preview">
          <div class="player-container">
            <img :src="sequenceFrames[playerIdx]" alt="frame" class="player-frame"/>
          </div>
          <div style="display:flex; align-items: center; gap: 10px; margin-top: 5px; margin-bottom: -5px">
            <n-button text style="font-size: 30px" @click="togglePlay">
              <n-icon :component="isPlaying ? PauseIcon : PlayIcon"/>
            </n-button>
            <n-slider v-model:value="playerSpeed" :step="1" :min="1" :max="16" :format-tooltip="formatTime"/>
          </div>
        </n-card>
      </n-gi>
      <n-gi :span="6">
        <n-card :content-style="{ display: 'flex', justifyContent: 'center' }">
          <PaintEditor
              ref="paintEditorRef"
              style="width: 512px;"
              v-if="sequenceFrames[selectedIdx]"
              :key="selectedIdx"
              :background=sequenceFrames[selectedIdx]>
          </PaintEditor>
        </n-card>
      </n-gi>
      <n-gi :span="3">
        <n-card title="Modify Frames">
          <n-input
              v-model:value="modifyPrompt"
              type="textarea"
              placeholder="Modification Prompt"
              style="width: 100%; margin-bottom: 10px;"
          />
          <div ref="loadingBarTargetRef" style="position: relative; overflow: hidden;">
            <n-loading-bar-provider
                :to="loadingBarTargetRef"
                container-style="position: absolute;"
            >
              <SubmitButton
                  :prompt-provider="promptProvider"
                  :i-image-file-provider="imageFileProvider"
                  :extra-data-provider="extraDataProvider"
                  endpoint="/api/task_generate"
                  @success="handleSubmitGenerateSuccess"
                  @error="handleSubmitGenerateError"
              />
            </n-loading-bar-provider>
          </div>
        </n-card>
      </n-gi>
    </n-grid>
  </div>
  <n-card v-else class="h-100" :title="`Task Status: ${taskStatus}`">
    <n-progress
        v-if="taskStatus === 'running'"
        type="line"
        :percentage="progress"
        indicator-placement="inside"
        processing
    />
  </n-card>
</template>

<style scoped>
.player-container {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
}

.player-frame {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>