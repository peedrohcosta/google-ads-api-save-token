import express from 'express'
import bodyParser from 'body-parser'
import { createClient } from '@supabase/supabase-js'

const app = express()
app.use(bodyParser.json())

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

app.post('/save-google-token', async (req, res) => {
  const { user_id, access_token, refresh_token, external_account_id } = req.body

  if (!user_id || !access_token || !external_account_id) {
    return res.status(400).json({ error: 'Dados incompletos' })
  }

  const { error } = await supabase
    .from('integrations')
    .upsert({
      user_id,
      service: 'google_ads',
      access_token,
      refresh_token,
      external_account_id
    }, { onConflict: ['user_id', 'service'] })

  if (error) return res.status(500).json({ error: error.message })

  res.status(200).json({ success: true })
})

app.get('/', (req, res) => {
  res.send('API online 🚀')
})

app.listen(process.env.PORT || 3000, () => {
  console.log('API rodando 🚀')
})
