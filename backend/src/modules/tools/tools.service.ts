import { Injectable } from '@nestjs/common';

type ToolKey = 'cgpa_convert' | 'school_recommend' | 'copywriting';

type ToolLog = {
  id: string;
  toolKey: ToolKey;
  toolName: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  success: boolean;
  latencyMs: number;
  createdAt: string;
};

const toolMeta: Record<ToolKey, { name: string; description: string }> = {
  cgpa_convert: {
    name: 'CGPA 换算工具',
    description: '将 4.0 / 5.0 / 百分制成绩换算成留学申请参考区间。',
  },
  school_recommend: {
    name: '院校推荐工具',
    description: '根据国家、专业、GPA、预算和语言成绩生成冲刺/匹配/保底推荐。',
  },
  copywriting: {
    name: '销售话术生成工具',
    description: '根据学生背景、目标国家和顾虑点生成微信沟通话术、电话提纲和短视频脚本。',
  },
};

@Injectable()
export class ToolsService {
  private logs: ToolLog[] = [];

  listTools() {
    return Object.entries(toolMeta).map(([key, value]) => ({
      key,
      name: value.name,
      description: value.description,
      enabled: true,
      stage: 'phase2_real_rule_engine',
    }));
  }

  getLogs() {
    return this.logs.slice().reverse().slice(0, 30);
  }

  convertCgpa(input: { score?: number; scale?: '4.0' | '5.0' | '100'; targetCountry?: string }) {
    const started = Date.now();
    const score = Number(input.score ?? 0);
    const scale = input.scale ?? '4.0';
    const max = scale === '5.0' ? 5 : scale === '100' ? 100 : 4;
    const normalized = Math.max(0, Math.min(score / max, 1));
    const percentage = Math.round(normalized * 1000) / 10;

    let level = '需要补充背景';
    let ukEstimate = '需结合学校算法';
    let advice = '建议补充课程成绩、项目经历和语言成绩后再判断。';

    if (percentage >= 88) {
      level = '强竞争力';
      ukEstimate = '约等于一等/高 2:1 区间';
      advice = '可以准备冲刺院校，同时用科研、实习或项目强化申请亮点。';
    } else if (percentage >= 80) {
      level = '较强竞争力';
      ukEstimate = '约等于 2:1 区间';
      advice = '建议主申匹配院校，并选择 1-2 所冲刺院校。';
    } else if (percentage >= 70) {
      level = '中等竞争力';
      ukEstimate = '约等于 2:2 到 2:1 边缘';
      advice = '建议搭配语言成绩、项目经历和保底院校，降低申请风险。';
    } else {
      level = '风险较高';
      ukEstimate = '低于常见直接录取要求';
      advice = '建议考虑预科、桥梁课程、补充实习项目或扩大国家范围。';
    }

    const output = {
      percentageEquivalent: percentage,
      level,
      ukEstimate,
      advice,
      disclaimer: '换算结果为演示规则，不代表任何学校官方换算标准。',
    };

    return this.record('cgpa_convert', input as Record<string, unknown>, output, started);
  }

  recommendSchools(input: {
    country?: string;
    major?: string;
    gpa?: number;
    scale?: '4.0' | '5.0' | '100';
    englishScore?: string;
    budget?: string;
    background?: string;
  }) {
    const started = Date.now();
    const country = input.country || '英国';
    const major = input.major || 'Computer Science';
    const normalized = this.normalizeScore(Number(input.gpa ?? 3.2), input.scale ?? '4.0');

    const pool = this.schoolPool(country, major);
    const reach = pool.reach.slice(0, normalized >= 82 ? 3 : 2);
    const match = pool.match.slice(0, 3);
    const safe = pool.safe.slice(0, normalized >= 70 ? 2 : 3);

    const output = {
      profileSummary: `${country} / ${major} / 成绩约 ${normalized}% / 预算 ${input.budget || '未填写'} / 语言 ${input.englishScore || '未填写'}`,
      buckets: [
        { type: '冲刺', schools: reach, reason: '对成绩、背景和语言要求更高，适合少量尝试。' },
        { type: '匹配', schools: match, reason: '与当前背景较匹配，建议作为主申组合。' },
        { type: '保底', schools: safe, reason: '录取风险相对低，用于保证申请安全边界。' },
      ],
      nextActions: [
        '补充完整成绩单、语言成绩、项目/实习经历。',
        '核对目标专业官网 entry requirements。',
        '准备 PS/CV，并把 AI 推荐结果作为初筛参考，不替代官方要求。',
      ],
      disclaimer: '院校推荐为演示规则，真实申请必须以学校官网和当年录取要求为准。',
    };

    return this.record('school_recommend', input as Record<string, unknown>, output, started);
  }

  generateCopywriting(input: {
    studentName?: string;
    targetCountry?: string;
    major?: string;
    gpa?: number;
    concern?: string;
    channel?: 'wechat' | 'phone' | 'short_video';
    background?: string;
  }) {
    const started = Date.now();
    const name = input.studentName || '同学';
    const country = input.targetCountry || '英国/澳洲';
    const major = input.major || '计算机相关专业';
    const concern = input.concern || '担心成绩和预算是否够';

    const output = {
      wechatMessage: `${name}你好，我根据你的${major}方向和${country}目标，先帮你做了一个初步方案。你目前最关键的不是盲目选学校，而是先确认成绩换算、语言要求和预算区间。我可以先给你分成冲刺/匹配/保底三档，再逐个核对学校官网要求。`,
      phoneOutline: [
        '先确认学生背景：学校、专业、CGPA、语言、预算。',
        `重点回应顾虑：${concern}。`,
        '用 3 档院校方案降低决策压力。',
        '下一步引导补充材料：成绩单、语言成绩、目标国家、预算。',
      ],
      shortVideoScript: `开头：很多同学想申${country}的${major}，但第一步不是看排名，而是看你的成绩能匹配哪一档学校。\n中段：我们会先做 CGPA 换算，再结合预算、语言和专业方向分成冲刺、匹配、保底。\n结尾：如果你也不确定自己能申哪些学校，可以先整理成绩单和目标国家，我们帮你做初筛。`,
      riskReminder: '话术用于销售沟通草稿，不能承诺录取结果。',
    };

    return this.record('copywriting', input as Record<string, unknown>, output, started);
  }

  private normalizeScore(score: number, scale: '4.0' | '5.0' | '100') {
    const max = scale === '5.0' ? 5 : scale === '100' ? 100 : 4;
    return Math.round(Math.max(0, Math.min(score / max, 1)) * 1000) / 10;
  }

  private schoolPool(country: string, major: string) {
    const uk = country.includes('英');
    const au = country.includes('澳');
    const asia = country.includes('马') || country.includes('新');
    if (au) {
      return {
        reach: [`University of Melbourne - ${major}`, `University of Sydney - ${major}`, `UNSW - ${major}`],
        match: [`Monash University - ${major}`, `University of Queensland - ${major}`, `University of Adelaide - ${major}`],
        safe: [`RMIT University - ${major}`, `Deakin University - ${major}`, `UTS - ${major}`],
      };
    }
    if (asia) {
      return {
        reach: [`NUS/NTU 相关项目 - ${major}`, `University of Malaya - ${major}`, `Monash Malaysia - ${major}`],
        match: [`APU - ${major}`, `Taylor's University - ${major}`, `UCSI University - ${major}`],
        safe: [`INTI International University - ${major}`, `SEGi University - ${major}`, `HELP University - ${major}`],
      };
    }
    return {
      reach: [`University of Manchester - ${major}`, `University of Bristol - ${major}`, `University of Warwick - ${major}`],
      match: [`University of Birmingham - ${major}`, `University of Leeds - ${major}`, `University of Southampton - ${major}`],
      safe: [`University of Leicester - ${major}`, `University of Essex - ${major}`, `Coventry University - ${major}`],
    };
  }

  private record(toolKey: ToolKey, input: Record<string, unknown>, output: Record<string, unknown>, started: number) {
    const log: ToolLog = {
      id: `${toolKey}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      toolKey,
      toolName: toolMeta[toolKey].name,
      input,
      output,
      success: true,
      latencyMs: Date.now() - started,
      createdAt: new Date().toISOString(),
    };
    this.logs.push(log);
    return { ...output, logId: log.id, latencyMs: log.latencyMs };
  }
}
