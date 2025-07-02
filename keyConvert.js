const fs =  require('fs')
const key = fs.readFileSync('./firebase_secret.json', 'utf8')
const base64 = Buffer.from(key).toString('base64')
