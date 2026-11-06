import { startHub } from './hub/hub.js'

const root = document.querySelector('#app')
document.body.style.margin = '0'
document.body.style.background = '#0f172a'
startHub(root)
