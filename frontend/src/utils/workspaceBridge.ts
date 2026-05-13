import { readSessionState, writeSessionState } from './sessionState';

export const TOOLS_WORKSPACE_KEY = 'eduagent.tools.v10';

export type WorkspaceProfile = {
  name?: string;
  country?: string;
  major?: string;
  degree?: string;
  cgpa?: string;
  scale?: string;
  budget?: string;
  languageType?: string;
  languageScore?: string;
  experience?: string;
  concern?: string;
};

function pickText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

export function normalizeWorkspaceProfile(profile: WorkspaceProfile) {
  return {
    name: pickText(profile.name, 'Chris'),
    country: pickText(profile.country, '英国'),
    major: pickText(profile.major, '计算机科学'),
    degree: pickText(profile.degree, '硕士'),
    cgpa: pickText(profile.cgpa, '3.2'),
    scale: pickText(profile.scale, '4'),
    budget: pickText(profile.budget, '30万人民币'),
    languageType: pickText(profile.languageType, 'IELTS'),
    languageScore: pickText(profile.languageScore, '6.5'),
    experience: pickText(profile.experience, '马来西亚 APU 计算机本科，有软件项目、AI/数据项目、实习和 GitHub 作品集'),
    concern: pickText(profile.concern, '担心 CGPA 不够，希望用项目经历提升竞争力'),
  };
}

export function mergeToolsDraft(profile: WorkspaceProfile, patch: Record<string, unknown> = {}) {
  const previous = readSessionState<any>(TOOLS_WORKSPACE_KEY, {});
  const normalized = normalizeWorkspaceProfile(profile);
  const form = {
    ...(previous.form || {}),
    name: normalized.name,
    country: normalized.country,
    major: normalized.major,
    degree: normalized.degree,
    cgpa: normalized.cgpa,
    scale: normalized.scale,
    budget: normalized.budget,
    languageType: normalized.languageType,
    languageScore: normalized.languageScore,
    experience: normalized.experience,
    concern: normalized.concern,
  };
  writeSessionState(TOOLS_WORKSPACE_KEY, { ...previous, form, ...patch });
  return { previous, form };
}

export async function runAdvisorInBackground(api: any, profile: WorkspaceProfile) {
  const normalized = normalizeWorkspaceProfile(profile);
  const payload = {
    cgpa: Number(normalized.cgpa),
    gpa: normalized.cgpa,
    scale: Number(normalized.scale),
    country: normalized.country,
    targetCountry: normalized.country,
    major: normalized.major,
    budget: normalized.budget,
    language: normalized.languageType === '暂无' ? '暂无' : `${normalized.languageType} ${normalized.languageScore}`,
    languageType: normalized.languageType,
    languageScore: normalized.languageScore,
    englishScore: normalized.languageType === '暂无' ? '暂无' : `${normalized.languageType} ${normalized.languageScore}`,
    name: normalized.name,
    studentName: normalized.name,
    concern: normalized.concern,
    angle: normalized.concern,
    degree: normalized.degree,
    experience: normalized.experience,
    background: normalized.experience,
    student: normalized.experience,
    platform: '小红书 + 微信私域',
  };

  mergeToolsDraft(normalized, { backgroundJob: { status: 'running', startedAt: new Date().toISOString(), source: 'chat' } });
  try {
    const { data } = await api.post('/tools/advisor-suite', payload);
    const current = readSessionState<any>(TOOLS_WORKSPACE_KEY, {});
    const results = {
      ...(current.results || {}),
      advisor: data || {},
      score: data?.outputs?.fit || current.results?.score,
      school: data?.outputs?.schools || current.results?.school,
      application: data?.outputs?.application || current.results?.application,
      copywriting: data?.outputs?.sales || current.results?.copywriting,
      material: data?.outputs?.materials || current.results?.material,
    };
    writeSessionState(TOOLS_WORKSPACE_KEY, {
      ...current,
      active: 'advisor',
      results,
      backgroundJob: { status: 'done', finishedAt: new Date().toISOString(), source: 'chat' },
    });
  } catch (err: any) {
    const current = readSessionState<any>(TOOLS_WORKSPACE_KEY, {});
    writeSessionState(TOOLS_WORKSPACE_KEY, {
      ...current,
      backgroundJob: {
        status: 'failed',
        finishedAt: new Date().toISOString(),
        source: 'chat',
        message: err?.response?.data?.message || err?.message || '方案引擎后台生成失败',
      },
    });
    try {
      await api.post('/tools/client-error-log', {
        toolName: 'AI 咨询同步方案引擎',
        activeTool: 'chat-to-tools',
        endpoint: '/tools/advisor-suite',
        message: err?.response?.data?.message || err?.message || '方案引擎后台生成失败',
      });
    } catch {}
  }
}
