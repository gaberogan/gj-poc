import fs from 'fs'

let channels = fs.readFileSync('./packages/renderer/public/channels.txt', {
  encoding: 'utf-8',
})

channels = channels
  .split('\n')
  .filter((line) => line.includes('youtube'))
  .join('\n')

fetch('http://localhost:8080/subscriptions/SubscribeOverride', {
  method: 'POST',
  body: channels,
}).then((res) => {
  console.log(`Done, status: ${res.status}`)
  process.exit()
})
