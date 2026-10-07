import { detectColumnsWithAI } from './test_ai.js';
const headers = ['DmSubNo', 'PropertyTypeEn', 'LandNumber', 'ProcedurePartyTypeNameEn', 'NameEn', 'Mobile', 'ProcedureNameEn', 'CountryNameEn', 'IdNumber', 'UaeIdNumber'];
const sampleRow = ['4204', 'Land', '4075', 'Seller', 'XIAOJING SU', '971-52-6321234', 'Sale', 'Peoples Republic of China', 'EF5978978', '7.84198E+1'];
detectColumnsWithAI(headers, sampleRow).then(console.log);
