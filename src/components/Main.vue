<script setup lang="ts">
import {MenuOption, NIcon, NLoadingBarProvider} from 'naive-ui'
import {Component, h, onBeforeUnmount, ref, watch} from 'vue';
import {ArchiveOutline as ArchiveIcon, BookOutline as BookIcon} from '@vicons/ionicons5'
import SubmitButton from "@/components/SubmitButton.vue";
import TaskResult from "@/components/TaskResult.vue";
import SketchEditor from "@/components/SketchEditor.vue";

const sketchRef = ref<InstanceType<typeof SketchEditor> | null>(null)
const inputPrompt = ref('draw a girl with a yellow hat');
const sketchMode = ref(false);
const canvasMode = ref(false);
const imag_index = ref(0);

// 新增：图片文件与预览地址
const imageFile = ref<File | null>(null);
const imageUrl = ref<string | null>(null);

// 新增：拦截上传并生成预览
function handleBeforeUpload(data: { file: any }) {
  const raw = data.file?.file as File | undefined;
  if (raw) {
    imageFile.value = raw;
  }
  // 阻止 naive-ui 默认的上传行为
  return true;
}

// 新增：移除时清理
function handleRemove() {
  imageFile.value = null;
}

async function promptProvider() {
  return inputPrompt.value;
}

async function imageFileProvider() {
  if (canvasMode.value) {
    const url = await sketchRef.value!.exportImage();
    if (!url) return null;
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], 'sketch.png', {type: 'image/png'});
  }
  return imageFile.value;
}

async function extraDataProvider() {
  const extraData: Record<string, unknown> = {
    "is_sketch": sketchMode.value,
    "image_index": imag_index.value
  }
  // has image
  if (canvasMode.value || imageFile.value) {
    extraData.seed = "16815546602470737228"
  }
  return extraData;
}

// 监听文件变化，生成/释放预览 URL
watch(imageFile, (file, oldFile) => {
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value);
    imageUrl.value = null;
  }
  if (file) {
    imageUrl.value = URL.createObjectURL(file);
  }
});

// 作为 LoadingBar 的局部挂载目标
const loadingBarTargetRef = ref<HTMLElement | string | false>(false)
const activeKey = ref<string | null>(null)
const taskIds = ref<MenuOption[]>([])

// 提交回调：根据业务自行处理
function handleSubmitGenerateSuccess(data: any) {
  console.log('Submit success:', data)
  taskIds.value.push(
      {
        label: 'Task ID: ' + data.task_id,
        key: `${data.task_id}`,
        icon: renderIcon(BookIcon)
      }
  )
  activeKey.value = `${data.task_id}`
}

function handleSubmitGenerateError(err: any) {
  console.error('Submit error:', err)
}

function getImageFile(file: File) {

}

onBeforeUnmount(() => {
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value);
  }
});

const collapsed = ref(true)

function renderIcon(icon: Component) {
  return () => h(NIcon, null, {default: () => h(icon)})
}

</script>

<template>
  <v-container class="d-flex flex-column" style="gap: 5px;">
    <n-card title="Input">
      <n-grid :cols="12" :x-gap="12">
        <n-gi :span="canvasMode ? 8 : 10">
          <n-input
              v-model:value="inputPrompt"
              type="textarea"
              placeholder="Input Prompt"
              :resizable="false"
              style="width: 100%; height: 100%;"
          />
        </n-gi>
        <n-gi :span="canvasMode ? 4 : 2">
          <div style="margin-bottom: 10px; gap: 10px; display: flex; flex-direction: column; justify-content: left;">
            <div>
              <n-switch
                  :round="false"
                  v-model:value="sketchMode"
              />
              <n-text class="ma-lg-2">Sketch Mode</n-text>
            </div>
            <div>
              <n-switch
                  :round="false"
                  v-model:value="canvasMode"
              />
              <n-text class="ma-lg-2">Canvas Mode</n-text>
            </div>
            <n-slider
                v-model:value="imag_index"
                :step="1" :min="0" :max="15" />
          </div>
          <n-card v-show="canvasMode">
            <SketchEditor
                ref="sketchRef"
            />
          </n-card>
          <n-upload
              v-show="!canvasMode"
              trigger-class="no-disabled"
              directory-dnd
              list-type="image"
              accept="image/*"
              max="1"
              :default-upload="false"
              :on-before-upload="handleBeforeUpload"
              :on-remove="handleRemove"
          >
            <n-upload-dragger>
              <template v-if="!imageUrl">
                <div style="margin-bottom: 12px">
                  <n-icon size="48" :depth="3">
                    <ArchiveIcon/>
                  </n-icon>
                </div>
                <n-text style="font-size: 16px">
                  click or drag an image to this area
                </n-text>
              </template>
              <template v-else>
                <!-- 预览：铺满拖拽框，保持等比 -->
                <img
                    :src="imageUrl"
                    alt="preview"
                    style="width: 100%; object-fit: contain; border-radius: 6px;"
                />
              </template>
            </n-upload-dragger>
          </n-upload>
        </n-gi>
      </n-grid>
    </n-card>
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

    <n-space vertical>
      <n-layout has-sider v-if="taskIds.length > 0">
        <n-layout-sider
            bordered
            collapse-mode="width"
            :collapsed-width="64"
            :width="240"
            :collapsed="collapsed"
            show-trigger
            @collapse="collapsed = true"
            @expand="collapsed = false"
        >
          <n-menu
              v-model:value="activeKey"
              :collapsed="collapsed"
              :collapsed-width="64"
              :collapsed-icon-size="22"
              :options="taskIds"
          />
        </n-layout-sider>
        <n-layout>
          <TaskResult
              v-if="activeKey"
              :key="activeKey"
              :task-id="activeKey"
              style="margin-left: 3px;"
          />
          <n-card v-else>
            select a task
          </n-card>
        </n-layout>
      </n-layout>
    </n-space>
  </v-container>

</template>

<style scoped>
:deep(.no-disabled) {
  filter: none;
  opacity: 1;
  pointer-events: auto; /* 如果你仍然想点击触发器，可保留；否则删掉 */
}
</style>