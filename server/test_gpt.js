import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const headers = ['Regis', 'ProcedureValue', 'Project', 'Project Lnd', 'Plot Pre Reg No', 'Building No', 'BuildingNameEn', 'Size', 'Unit Number', 'DmNo', 'DmSubNo', 'Property Type', 'LandNumber', 'ProcedurePartyTypeNameEn', 'NameEn', 'Mobile', 'ProcedureNameEn', 'CountryNameEn', 'IdNumber', 'UaeIdNumber', 'PassportExpiryDate', 'BirthDate', 'UnifiedNumber', 'Column 24', 'Column 25'];
const sampleRow = ['28-Mar-2024', '5000000', 'Jumeirah Islands', 'TOWNHOUSES AT JUMEIRAH ISLANDS', 'JIVCTH4-064', 'JIVCTH4-064', 'null', '199.97', 'null', '393', '4204', 'Land', '4075', 'Seller', 'XIAOJING SU', '971-52-6321234', 'Sale', 'Peoples Republic of China (China)', 'EF5978978', '7.84198E+14', '2029-05-07', '1983-12-30', 'null', '', ''];

async function testAI() {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = \You are an expert data engineer mapping messy real estate headers to standard columns.
Standard required core roles: 'name', 'phone', 'project', 'location', 'unit', 'property_type'.
Standard nice headers: 'Owner Name', 'Contact Number', 'Project', 'Location', 'Unit Number', 'Property Type'.

Raw headers array: \
Sample data row: \

Your task:
1. Look at the raw headers and the sample data row to determine what each column ACTUALLY contains. 
2. If a column contains the owner's name, assign it standardRole: 'name' and normalizedHeader: 'Owner Name'.
3. If it contains a phone number, assign standardRole: 'phone' and normalizedHeader: 'Contact Number'.
4. Do the same for 'project', 'location', 'unit', and 'property_type'.
5. If a column DOES NOT match any of these core roles (e.g. Email, Passport, Agent Name), DO NOT drop it! Keep it, but generate a clean, human-readable normalizedHeader for it (e.g. 'client_email_addr' -> 'Client Email') and set standardRole to null.

Output ONLY a JSON object with a single key "columns" containing an array of objects representing EVERY raw header in the exact same order.
\;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0,
    });
    console.log(response.choices[0].message.content);
  } catch(e) {
    console.error(e.message);
  }
}
testAI();
