import { http } from './http';

export type CgpaInput = {
  score: number;
  scale: '4.0' | '5.0' | '100';
  targetCountry?: string;
};

export type SchoolRecommendInput = {
  country: string;
  major: string;
  gpa: number;
  scale: '4.0' | '5.0' | '100';
  englishScore?: string;
  budget?: string;
  background?: string;
};

export type CopywritingInput = {
  studentName?: string;
  targetCountry: string;
  major: string;
  gpa?: number;
  concern?: string;
  channel?: 'wechat' | 'phone' | 'short_video';
  background?: string;
};

export async function convertCgpa(input: CgpaInput) {
  const { data } = await http.post('/tools/cgpa-convert', input);
  return data;
}

export async function recommendSchools(input: SchoolRecommendInput) {
  const { data } = await http.post('/tools/school-recommend', input);
  return data;
}

export async function generateCopywriting(input: CopywritingInput) {
  const { data } = await http.post('/tools/copywriting', input);
  return data;
}

export async function getToolLogs() {
  const { data } = await http.get('/tools/logs');
  return data;
}
