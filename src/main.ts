import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './lib/firebase'
import './style.css'
import { installAudioUnlock } from './lib/sounds'

installAudioUnlock()
createApp(App).use(router).mount('#app')
