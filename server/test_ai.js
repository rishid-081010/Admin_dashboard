import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

export async function detectColumnsWithAI(headers, sampleRow) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('OpenAI API Key is missing. Falling back to simple heuristic detection.');
    return null;
  }
  
  const openai = new OpenAI({ apiKey });
  
  const prompt = `You are an expert data engineer mapping messy real estate headers to standard columns.
Standard required core roles: 'name', 'phone', 'project', 'location', 'unit', 'property_type'.
Standard nice headers: 'Owner Name', 'Contact Number', 'Project', 'Location', 'Unit Number', 'Property Type'.

Raw headers array: ${JSON.stringify(headers)}
Sample data row: ${JSON.stringify(sampleRow)}

Your task:
1. Look at the raw headers and the sample data row to determine what each column ACTUALLY contains. 
2. If a column contains the owner's name, assign it standardRole: 'name' and normalizedHeader: 'Owner Name'.
3. If it contains a phone number, assign standardRole: 'phone' and normalizedHeader: 'Contact Number'.
4. Do the same for 'project', 'location', 'unit', and 'property_type'.
5. If a column DOES NOT match any of these core roles (e.g. Email, Passport, Agent Name), DO NOT drop it! Keep it, but generate a clean, human-readable normalizedHeader for it (e.g. 'client_email_addr' -> 'Client Email') and set standardRole to null.

Output ONLY a JSON object with a single key "columns" containing an array of objects representing EVERY raw header in the exact same order.
Format:
{
  "columns": [
    { "originalIndex": 0, "rawHeader": "Client Name En", "normalizedHeader": "Owner Name", "standardRole": "name" },
    { "originalIndex": 1, "rawHeader": "Mobile", "normalizedHeader": "Contact Number", "standardRole": "phone" },
    { "originalIndex": 2, "rawHeader": "Passport Num", "normalizedHeader": "Passport Number", "standardRole": null }
  ]
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0,
    });
    
    const content = response.choices[0].message.content;
    const json = JSON.parse(content);
    return json.columns;
  } catch(e) {
    console.error("AI column detection error:", e);
    return null;
  }
}
