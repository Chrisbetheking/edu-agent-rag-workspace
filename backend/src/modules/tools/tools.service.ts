import { Injectable } from '@nestjs/common';
import { MemoryStore } from '../../shared/memory-store';

@Injectable()
export class ToolsService {
  constructor(private readonly store: MemoryStore) {}

  private track<T>(toolName: string, input: any, fn: () => T) {
    const start = Date.now();
    try {
      const output = fn();
      this.store.addToolLog({ toolName, input, output, duration: Date.now() - start, status: 'success' });
      return output;
    } catch (error) {
      const output = { message: error?.message || '工具调用失败' };
      this.store.addToolLog({ toolName, input, output, duration: Date.now() - start, status: 'failed' });
      throw error;
    }
  }

  convertCgpa(input: { cgpa: number; scale?: number; targetCountry?: string }) {
    return this.track('CGPA 换算工具', input, () => {
      const scale = Number(input.scale || 4);
      const cgpa = Number(input.cgpa || 0);
      const percent = Math.max(0, Math.min(100, (cgpa / scale) * 100));
      let level = '需要强化背景';
      if (percent >= 85) level = '优秀，可冲刺排名较高院校';
      else if (percent >= 75) level = '良好，适合匹配中上院校';
      else if (percent >= 65) level = '中等，建议合理选校并补充项目/实习';
      return {
        cgpa,
        scale,
        percentage: Number(percent.toFixed(2)),
        targetCountry: input.targetCountry || '未指定',
        level,
        advice: [
          '换算结果仅用于初筛，不等于学校官方评估。',
          '建议同时准备课程描述、项目经历、实习证明和推荐信。',
          '最终要求需要以目标学校官网和当年招生政策为准。',
        ],
      };
    });
  }

  recommendSchools(input: any) {
    return this.track('院校推荐工具', input, () => {
      const gpa = Number(input.gpa || input.cgpa || 0);
      const country = input.country || '英国/澳洲';
      const major = input.major || '计算机相关专业';
      const budget = input.budget || '未指定';
      const language = input.language || '暂未提供';
      const bands = gpa >= 3.4
        ? { reach: ['Manchester', 'Bristol', 'Warwick'], match: ['Sheffield', 'Nottingham', 'Leeds'], safe: ['Cardiff', 'Liverpool', 'Queen Mary'] }
        : gpa >= 3.0
          ? { reach: ['Sheffield', 'Nottingham', 'Leeds'], match: ['Cardiff', 'Liverpool', 'Queen Mary'], safe: ['Sussex', 'Essex', 'Swansea'] }
          : { reach: ['Cardiff', 'Liverpool'], match: ['Sussex', 'Essex', 'Swansea'], safe: ['部分预科/语言班/合作项目'] };
      return {
        profile: { country, major, gpa, budget, language },
        reach: bands.reach.map((name) => ({ name, reason: '可作为冲刺选择，需要突出项目、实习和课程匹配度。' })),
        match: bands.match.map((name) => ({ name, reason: '与当前背景相对匹配，建议重点准备申请材料。' })),
        safe: bands.safe.map((name) => ({ name, reason: '作为保底选择，适合提升申请成功率。' })),
        risk: ['GPA、语言成绩、专业匹配度和申请时间都会影响结果。', '推荐结果为 Demo 模拟，真实申请需核对学校官网。'],
      };
    });
  }

  generateCopywriting(input: any) {
    return this.track('销售话术生成工具', input, () => {
      const name = input.name || '同学';
      const country = input.country || '目标国家';
      const concern = input.concern || '选校和申请成功率';
      return {
        wechat: `你好${name}，根据你目前的背景，如果目标是${country}，我们可以先从 GPA、专业匹配度、预算和语言成绩四个维度做初筛。你现在最需要解决的是${concern}，我建议先整理成绩单和目标专业方向，我可以帮你做一版冲刺/匹配/保底方案。`,
        callOutline: ['确认学生背景和目标国家', '解释当前背景的优势与风险', '给出三档选校策略', '引导提供成绩单和语言成绩', '安排下一步方案沟通'],
        shortVideoScript: `如果你也是马来西亚本科背景，想申请${country}硕士，千万不要只看排名。GPA、专业匹配、预算和材料完整度都会影响结果。建议先做三档选校，再针对每所学校准备材料。`,
      };
    });
  }

  materialList(input: any) {
    return this.track('申请材料清单工具', input, () => {
      const country = input.country || '目标国家';
      const degree = input.degree || '硕士';
      return {
        country,
        degree,
        required: ['成绩单', '在读证明/毕业证', '个人陈述 PS', '简历 CV', '推荐信', '护照', '语言成绩'],
        optional: ['课程描述', '作品集', '实习证明', '项目证明', '获奖证明'],
        reminders: ['不同学校材料要求可能不同。', '语言成绩未达标时可查询语言班或后补政策。', '所有材料建议统一命名并备份。'],
      };
    });
  }

  logs() {
    return this.store.toolLogs.slice(0, 50);
  }
}
