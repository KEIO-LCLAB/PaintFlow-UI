import './assets/main.css'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

import { createApp } from 'vue'
import App from './App.vue'
import { createVuetify } from 'vuetify'
import naive from 'naive-ui'

const app = createApp(App)
const vuetify = createVuetify()
app.use(vuetify)
app.use(naive)
app.mount('#app')
