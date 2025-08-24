<script setup>
import Main from './components/Main.vue'
// 新增：引入 Naive UI 的配置与暗色主题、跟随系统主题
import {NConfigProvider, NGlobalStyle, darkTheme, useOsTheme, NSwitch} from 'naive-ui'
import {computed, ref} from 'vue'

const isDarkTheme = ref(true)
const theme = computed(() => isDarkTheme.value ? darkTheme : null)
</script>

<template>
  <n-config-provider :theme="theme" :class="{ 'theme-dark': isDarkTheme }">
    <n-switch v-model:value="isDarkTheme" class="theme-switch"/>
    <Main/>
    <!-- 可选：全局样式（含滚动条、重置等） -->
    <n-global-style />
  </n-config-provider>
</template>

<style scoped>
.theme-switch {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
}
</style>
