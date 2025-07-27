const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(bodyParser.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.get('/', (req, res) => {
  res.send('API online 🚀');
});

app.post('/exchange-token', async (req, res) => {
  const { code, user_id } = req.body;

  if (!code || !user_id) {
    return res.status(400).json({ error: 'Código ou ID de usuário ausente' });
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: 'https://preview--vex-analytics.lovable.app/callback',
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return res.status(400).json({ error: tokenData.error_description });
    }

    const { access_token, refresh_token } = tokenData;

    const adsResponse = await fetch('https://googleads.googleapis.com/v13/customers:listAccessibleCustomers', {
      method: 'GET',
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const adsData = await adsResponse.json();
    const external_account_id = adsData.resourceNames?.[0]?.split('/').pop() || null;

    const { error } = await supabase
      .from('integrations')
      .upsert({
        user_id,
        service: 'google_ads',
        access_token,
        refresh_token,
        external_account_id
      }, { onConflict: ['user_id', 'service'] });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erro ao trocar token:', err);
    res.status(500).json({ error: 'Erro interno ao trocar token' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
