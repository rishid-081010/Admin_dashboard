const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
const key = envContent.split('\n').find(l => l.startsWith('OPENAI_API_KEY')).split('=')[1].trim();

async function testOpenAI() {
  const prompt = 'Extract and shorten the clean building/property name from: "V3 TOWER Unit 1503 - Jumeirah Lakes Towers (JLT)". Return ONLY the concise building name (e.g. "V3 Tower"), under 25 chars, without unit numbers or full community.';
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 30,
      })
    });
    const data = await res.json();
    console.log('OpenAI response:', JSON.stringify(data.choices?.[0]?.message?.content));
  } catch (e) {
    console.error('Error:', e);
  }
}
testOpenAI();
