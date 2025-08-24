<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

type Props = {
  images: string[]
  selectedIndex: number
  height?: number           // 缩略图容器高度
  itemWidth?: number        // 每个缩略图宽度（未选中时）
  gap?: number              // 图片间距
  glowColor?: string        // 选中时的外发光颜色
}
const props = withDefaults(defineProps<Props>(), {
  images: () => [],
  selectedIndex: 0,
  height: 120,
  itemWidth: 100,
  gap: 20,
  glowColor: 'rgb(0,255,119)' // indigo-ish
})

const emit = defineEmits<{
  (e: 'update:selectedIndex', value: number): void
  (e: 'item-click', value: number): void
}>()

const scroller = ref<HTMLDivElement | null>(null)

// 鼠标滚轮 => 水平滚动
function onWheel(e: WheelEvent) {
  // 将纵向滚动转为横向滚动，并阻止默认页面滚动
  if (!scroller.value) return
  e.preventDefault()
  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
    scroller.value.scrollLeft += e.deltaY
  } else {
    scroller.value.scrollLeft += e.deltaX
  }
}



// 保持选中项尽量可见（自动滚动到视区内）
function scrollSelectedIntoView(idx = props.selectedIndex) {
  const container = scroller.value
  if (!container) return
  const children = container.children
  const el = children.item(idx) as HTMLElement | null
  if (!el) return
  const cLeft = container.scrollLeft
  const cRight = cLeft + container.clientWidth
  const eLeft = el.offsetLeft
  const eRight = eLeft + el.offsetWidth
  if (eLeft < cLeft) {
    container.scrollTo({ left: eLeft - props.gap, behavior: 'smooth' })
  } else if (eRight > cRight) {
    container.scrollTo({ left: eRight - container.clientWidth + props.gap, behavior: 'smooth' })
  }
}

watch(
    () => props.selectedIndex,
    (idx) => {
      scrollSelectedIntoView(idx)
    },
    { flush: 'post' }
)

onMounted(() => {
  // 初始对齐
  scrollSelectedIntoView(props.selectedIndex)
  // 为确保某些浏览器下 wheel 可被 preventDefault，这里用事件监听器兜底
  if (scroller.value) {
    scroller.value.addEventListener('wheel', onWheel, { passive: false })
  }
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  if (scroller.value) {
    scroller.value.removeEventListener('wheel', onWheel as EventListener)
  }
  window.removeEventListener('keydown', onKeyDown)
})

function onItemClick(index: number) {
  emit('update:selectedIndex', index)
  emit('item-click', index)
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft') {
    const newIndex = Math.max(0, props.selectedIndex - 1)
    emit('update:selectedIndex', newIndex)
  } else if (e.key === 'ArrowRight') {
    const newIndex = Math.min(props.images.length - 1, props.selectedIndex + 1)
    emit('update:selectedIndex', newIndex)
  }
}
</script>

<template>
  <n-card :content-style="{ overflow: 'visible' }">
    <n-divider title-placement="center" style="margin-top: -10px; margin-bottom: 0px;">
      Frames Preview
    </n-divider>
    <div
        ref="scroller"
        class="frames-scroller"
        :style="{
        height: height + 5 + 'px',
        gap: gap + 'px',
      }"
        @wheel.prevent="onWheel"
    >
      <button
          v-for="(src, idx) in images"
          :key="idx"
          class="frame-item"
          :class="{ selected: idx === selectedIndex }"
          :aria-selected="idx === selectedIndex"
          :style="{
          width: itemWidth - 30 + 'px',
          height: itemWidth - 30 + 'px',
        }"
          type="button"
          @click="onItemClick(idx)"
      >
        <img
            class="thumb"
            :src="src"
            :alt="`frame-${idx}`"
            draggable="false"
        />
        <div style="margin-top: 5px">
          {{ idx }}
        </div>
      </button>
    </div>

  </n-card>
</template>

<style scoped>
.frames-scroller {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  overflow-x: auto;
  overflow-y: visible;
  padding: 8px;
  /* 隐藏滚动条（保留滚动功能） */
  scrollbar-width: none;        /* Firefox */
}
.frames-scroller::-webkit-scrollbar {
  height: 0;
}

.frame-item {
  flex: 0 0 auto;               /* 不换行、不收缩 */
  height: 100%;
  border: none;
  background: transparent;
  padding: 0;
  margin: 0;
  cursor: pointer;
  border-radius: 8px;
  position: relative;
  outline: none;
  transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
}

.frame-item .thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  display: block;
  user-select: none;
  pointer-events: none; /* 让点击落在 button 上 */
}

/* 默认轻微阴影 */
.frame-item {
  box-shadow: 0 1px 4px rgba(0,0,0,0.12);
}

/* 悬浮轻微放大 */
.frame-item:hover {
  transform: scale(1.03);
  box-shadow: 0 4px 10px rgba(0,0,0,0.18);
}

/* 选中态：放大 + 外发光 */
.frame-item.selected {
  transform: scale(1.1);
  z-index: 1;
  box-shadow:
      0 6px 18px rgba(0,0,0,0.22),
      0 0 0 3px rgba(255,255,255,0.9),
      0 0 15px var(--glow, rgba(99,102,241,0.65));
}

/* 使用 CSS 变量注入自定义 glow 颜色（从内联 style 设置） */
.frame-item.selected {
  --glow: v-bind(glowColor);
}

/* 键盘无障碍：聚焦态可见轮廓 */
.frame-item:focus-visible {
  box-shadow: 0 0 0 3px rgba(99,102,241,0.5);
}
</style>
