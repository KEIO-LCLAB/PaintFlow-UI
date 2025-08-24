import {fileURLToPath, URL} from 'node:url'

import {defineConfig, loadEnv} from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import vuetify from 'vite-plugin-vuetify'

export default ({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    return defineConfig({
        plugins: [
            vue(),
            vueDevTools(),
            vuetify({autoImport: true})
        ],
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url))
            },
        },
        server: {
            host: env.VITE_DEV_SERVER_HOST || '127.0.0.1',
            port: Number(env.VITE_DEV_SERVER_PORT) || 8777,
        },
    })
}
