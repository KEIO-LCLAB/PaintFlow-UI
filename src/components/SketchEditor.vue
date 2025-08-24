<script setup lang="ts">
import {ref, watch, onMounted, nextTick, shallowRef} from 'vue'
import {
  VpEditor, useFreehand, downloadJpg, createSettings, Shape, Tool, type ImageHistory, exportPng, useBackground,
} from 'vue-paint'

const tools = <Tool<Shape>[]>[useFreehand(), useBackground({color: 'white'})]

// The history can be manipulated programmatically, and used to persist the image
const history = ref<ImageHistory<typeof tools>>([])

// Settings are mainly changed through the toolbar, but you have full control over the settings, if you want to change active tool, color, thickness etc.
// Use the utility function createSettings to set it up, where you pass the tools you're using along with any start settings.
let settings = createSettings(tools)

// 1) 给 vp-editor 本身加 ref
const editorRef = ref<InstanceType<typeof VpEditor> | null>(null)

// 2) 在挂载后抓取内部 svg
const svgRef = shallowRef<SVGSVGElement | null>(null)

onMounted(async () => {
  await nextTick()
  const rootEl = (editorRef.value as any)?.$el as HTMLElement | undefined
  if (rootEl) {
    svgRef.value = rootEl.querySelector('svg')
    console.log(svgRef.value)
  }
})

// 3) 暴露给父组件（可直接拿到 svg 或通过方法获取）
function getSvgElement() {
  return svgRef.value
}

async function exportImage(): Promise<string | null> {
  const svg = getSvgElement();
  if (!svg) return null
  return await exportPng({svg: svg, history: history.value, tools: tools})
}

defineExpose({ exportImage, getSvgElement })
</script>

<template>
  <vp-editor
      ref="editorRef"
      :width="256"
      :height="256"
      v-model:history="history"
      v-model:settings="settings"
      @save="downloadJpg"
      :tools>
  </vp-editor>
</template>

<style>

</style>