const express = require('express')
const cors = require('cors')
const app = express()
const port = 3000
require('dotenv').config()

app.use(express.json())
app.use(cors())

// connecting to YouTube Data API
app.get('/', async (req, res) => {
  const result = await getVideo()
  res.send(result)
})

async function getVideo() {
    const params = new URLSearchParams();
    params.append("key", process.env["API_KEY"])
    params.append("part", "snippet,contentDetails,statistics")
    params.append("id", "FftLImzl1-k")

    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`)
    
    const result = await response.json();
    console.log(result)
    return result
}

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

// connecting to client-side
app.post('/', (req, res) => {
    console.log(req.body)
    res.send("heeheehoohoo")
})

