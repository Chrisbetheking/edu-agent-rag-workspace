import { Injectable } from '@nestjs/common';
import { MemoryStore } from '../../shared/memory-store';
import { DatabaseService } from '../../shared/database.service';
import { LlmService } from '../llm/llm.service';

@Injectable()
export class ToolsService {
  constructor(
    private readonly store: MemoryStore,
    private readonly db: DatabaseService,
    private readonly llm: LlmService,
  ) {}

  private track<T>(toolName: string, input: any, fn: () => T) {
    const start = Date.now();

    try {
      const output = fn();

      this.store.addToolLog({
        toolName,
        input,
        output,
        duration: Date.now() - start,
        status: 'success',
      });

      return output;
    } catch (error: any) {
      const output = {
        message: error?.message || '工具调用失败',
      };

      this.store.addToolLog({
        toolName,
        input,
        output,
        duration: Date.now() - start,
        status: 'failed',
      });

      throw error;
    }
  }



  private async trackAsync<T>(toolName: string, input: any, fn: () => Promise<T>) {
    const start = Date.now();

    try {
      const output = await fn();

      this.store.addToolLog({
        toolName,
        input,
        output,
        duration: Date.now() - start,
        status: 'success',
      });

      return output;
    } catch (error: any) {
      const output = {
        message: error?.message || '工具调用失败',
      };

      this.store.addToolLog({
        toolName,
        input,
        output,
        duration: Date.now() - start,
        status: 'failed',
      });

      throw error;
    }
  }

  private demoMode() {
    return String(process.env.DEMO_MODE || 'true').toLowerCase() === 'true';
  }

  private stripJson(text: string) {
    return String(text || '')
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
  }

  private tryJson(text: string) {
    try {
      return JSON.parse(this.stripJson(text));
    } catch {
      const match = String(text || '').match(/\{[\s\S]*\}/);
      if (!match) return null;
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
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

      const bands =
        gpa >= 3.4
          ? {
              reach: ['Manchester', 'Bristol', 'Warwick'],
              match: ['Sheffield', 'Nottingham', 'Leeds'],
              safe: ['Cardiff', 'Liverpool', 'Queen Mary'],
            }
          : gpa >= 3.0
            ? {
                reach: ['Sheffield', 'Nottingham', 'Leeds'],
                match: ['Cardiff', 'Liverpool', 'Queen Mary'],
                safe: ['Sussex', 'Essex', 'Swansea'],
              }
            : {
                reach: ['Cardiff', 'Liverpool'],
                match: ['Sussex', 'Essex', 'Swansea'],
                safe: ['部分预科/语言班/合作项目'],
              };

      return {
        profile: {
          country,
          major,
          gpa,
          budget,
          language,
        },
        reach: bands.reach.map((name) => ({
          name,
          reason: '可作为冲刺选择，需要突出项目、实习和课程匹配度。',
        })),
        match: bands.match.map((name) => ({
          name,
          reason: '与当前背景相对匹配，建议重点准备申请材料。',
        })),
        safe: bands.safe.map((name) => ({
          name,
          reason: '作为保底选择，适合提升申请成功率。',
        })),
        risk: [
          'GPA、语言成绩、专业匹配度和申请时间都会影响结果。',
          '推荐结果为 Demo 模拟，真实申请需核对学校官网。',
        ],
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
        callOutline: [
          '确认学生背景和目标国家',
          '解释当前背景的优势与风险',
          '给出三档选校策略',
          '引导提供成绩单和语言成绩',
          '安排下一步方案沟通',
        ],
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
        reminders: [
          '不同学校材料要求可能不同。',
          '语言成绩未达标时可查询语言班或后补政策。',
          '所有材料建议统一命名并备份。',
        ],
      };
    });
  }


  async growthCampaign(input: any) {
    return this.trackAsync('AI 前台增长内容生成器', input, async () => {
      const student = input.student || input.name || '马来西亚本科计算机学生';
      const country = input.country || input.targetCountry || '英国';
      const major = input.major || '计算机科学';
      const angle = input.angle || input.concern || 'GPA 不高也想稳妥申请';
      const platform = input.platform || '小红书 + 短视频 + 微信';

      const fallback = {
        brief: `${student}，目标${country}${major}，核心内容角度：${angle}。`,
        xiaohongshu: {
          title: `GPA 不算顶尖，也能申请${country}${major}硕士吗？`,
          hook: '很多同学一看到 GPA 就觉得自己没机会，其实留学申请不是只看一个数字。',
          body: [
            `如果你是${student}，目标是${country}${major}，先不要盲目按排名投。`,
            '正确做法是把学校拆成冲刺、匹配、保底三档，再看课程匹配、项目经历、语言成绩和预算。',
            'GPA 不够强时，项目、实习、推荐信和 PS 的解释逻辑会非常关键。',
          ],
          cta: '想看你的背景适合哪一档，可以先整理成绩单和目标专业，我帮你做一版初筛。',
          hashtags: ['留学申请', `${country}硕士`, major, '选校定位', '留学咨询'],
        },
        videoScript: {
          opening: '如果你本科背景普通、GPA 不算高，还想申请海外硕士，这条一定要看完。',
          shots: [
            '镜头1：展示成绩单/项目经历，提出痛点。',
            '镜头2：用三档选校图解释冲刺、匹配、保底。',
            '镜头3：展示材料清单：PS、CV、推荐信、课程描述。',
            '镜头4：提醒官网要求每年会变，必须逐校核对。',
          ],
          ending: '评论区留下目标国家和专业，我给你一个选校方向。',
        },
        wechatFollowup: [
          `你好，我看你目标是${country}${major}，我们可以先按 GPA、课程匹配、项目经历和预算做一次定位。`,
          '我建议先不要直接定学校，先做三档策略，这样既有冲刺空间，也能控制风险。',
          '你方便发一下成绩单、语言成绩和项目/实习经历吗？我可以帮你做初版方案。',
        ],
        contentCalendar: [
          { day: '周一', topic: '低 GPA 申请策略', format: '小红书笔记' },
          { day: '周三', topic: `${country}${major}选校误区`, format: '短视频' },
          { day: '周五', topic: '申请材料清单', format: '图文 checklist' },
        ],
      };

      if (this.demoMode()) return fallback;

      try {
        const raw = await this.llm.chat([
          { role: 'system', content: '你是留学咨询公司的增长运营 Agent。只返回合法 JSON，不要 Markdown。字段包含 brief, xiaohongshu, videoScript, wechatFollowup, contentCalendar。内容要可直接发布，避免夸大录取结果。' },
          { role: 'user', content: `学生背景：${student}\n目标国家：${country}\n目标专业：${major}\n内容平台：${platform}\n核心角度：${angle}` },
        ]);
        return this.tryJson(raw) || { ...fallback, raw };
      } catch (error: any) {
        return { ...fallback, llmFallbackReason: error?.message || 'LLM unavailable' };
      }
    });
  }

  applicationPlan(input: any) {
    return this.track('留学申请后台规划器', input, () => {
      const name = input.name || input.studentName || 'Chris';
      const country = input.country || input.targetCountry || '英国';
      const major = input.major || '计算机科学';
      const degree = input.degree || '硕士';
      const gpa = input.gpa || input.cgpa || '3.2/4.0';

      return {
        student: { name, country, major, degree, gpa },
        pipeline: [
          { stage: '线索评估', status: '进行中', owner: '咨询顾问', tasks: ['确认预算与目标国家', '收集成绩单与语言成绩'] },
          { stage: '选校定位', status: '待开始', owner: '申请顾问', tasks: ['拆分冲刺/匹配/保底', '核对官网入学要求'] },
          { stage: '文书制作', status: '待开始', owner: '文书老师', tasks: ['PS 大纲', 'CV 优化', '推荐信素材表'] },
          { stage: '递交追踪', status: '待开始', owner: '申请顾问', tasks: ['网申账号', '材料上传', 'offer 状态更新'] },
        ],
        writingBrief: {
          psTheme: `围绕${major}学习经历、项目能力和未来职业目标展开，解释为什么选择${country}${degree}。`,
          cvHighlights: ['课程匹配度', '软件/AI/数据项目', 'GitHub 或作品集', '实习与团队协作'],
          recommendationAngles: ['学术能力', '项目执行力', '英文沟通与持续学习能力'],
        },
        materialChecklist: ['成绩单', '在读证明/毕业证', 'PS', 'CV', '两封推荐信', '护照', '语言成绩', '课程描述', '项目证明'],
        riskFlags: [
          'GPA 和专业课程匹配度需要逐校核对。',
          '预算需要区分伦敦与非伦敦城市。',
          '语言成绩未达标时需准备语言班或后补策略。',
        ],
        nextBestActions: [
          '上传成绩单到知识库，验证 RAG 能否命中。',
          '用 AI 对话生成三档选校。',
          '把结果转成小红书/短视频获客内容。',
        ],
      };
    });
  }

  advisorSuite(input: any) {
    return this.track('Agent 综合方案编排器', input, () => {
      const academic = this.convertCgpa({ cgpa: Number(input.cgpa || input.gpa || 3.2), scale: Number(input.scale || 4), targetCountry: input.country || '英国' });
      const schools = this.recommendSchools(input);
      const materials = this.materialList(input);
      const application = this.applicationPlan(input);

      return {
        executiveSummary: '系统已把学生背景拆解为成绩判断、选校策略、材料清单、文书重点和运营转化内容，适合咨询顾问直接拿去跟进。',
        academic,
        schools,
        materials,
        application,
        handoff: [
          { team: '咨询前台', action: '使用增长内容吸引同背景学生咨询。' },
          { team: '申请顾问', action: '用三档选校做初筛并核对官网要求。' },
          { team: '文书老师', action: '基于 writingBrief 产出 PS/CV 初稿。' },
          { team: '运营负责人', action: '在调用日志查看耗时、RAG 命中和失败情况。' },
        ],
      };
    });
  }

  async logs(limit = 50) {
    if (this.db.enabled) {
      try {
        const result = await this.db.query(
          `
          select
            id,
            conversation_id,
            question,
            model,
            success,
            duration_ms,
            rag_hit_count,
            tool_names,
            error,
            created_at
          from call_logs
          order by created_at desc
          limit $1
          `,
          [limit],
        );

        return result.rows.map((row: any) => ({
          id: row.id,
          type: 'ai_call',
          conversationId: row.conversation_id,
          question: row.question,
          model: row.model || 'unknown',
          success: Boolean(row.success),
          status: row.success ? 'success' : 'failed',
          durationMs: row.duration_ms || 0,
          ragHitCount: row.rag_hit_count || 0,
          toolNames: row.tool_names || [],
          error: row.error || '',
          createdAt: row.created_at,
        }));
      } catch (error) {
        console.error('读取 Supabase call_logs 失败：', error);
      }
    }

    return this.store.toolLogs.slice(0, limit).map((log: any) => ({
      id: log.id,
      type: 'tool_call',
      question: log.toolName,
      model: 'local-tool',
      success: log.status === 'success',
      status: log.status,
      durationMs: log.duration,
      ragHitCount: 0,
      toolNames: [log.toolName],
      error: log.status === 'success' ? '' : '工具调用失败',
      createdAt: log.createdAt,
      input: log.input,
      output: log.output,
    }));
  }

  async overview(limit = 80) {
    const logs = await this.logs(limit);
    const totalCalls = logs.length;
    const successCount = logs.filter((log: any) => log.success).length;
    const totalDuration = logs.reduce((sum: number, log: any) => sum + Number(log.durationMs || 0), 0);
    const totalRagHits = logs.reduce((sum: number, log: any) => sum + Number(log.ragHitCount || 0), 0);

    const toolUsageMap = new Map<string, number>();
    const modelUsageMap = new Map<string, number>();

    for (const log of logs as any[]) {
      const model = log.model || 'unknown';
      modelUsageMap.set(model, (modelUsageMap.get(model) || 0) + 1);

      const toolNames = Array.isArray(log.toolNames) && log.toolNames.length ? log.toolNames : ['无工具调用'];
      for (const name of toolNames) {
        toolUsageMap.set(name, (toolUsageMap.get(name) || 0) + 1);
      }
    }

    const toSortedArray = (map: Map<string, number>) =>
      Array.from(map.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    return {
      totalCalls,
      successCount,
      failedCount: totalCalls - successCount,
      successRate: totalCalls ? Number((successCount / totalCalls).toFixed(2)) : 0,
      avgDurationMs: totalCalls ? Math.round(totalDuration / totalCalls) : 0,
      avgRagHitCount: totalCalls ? Number((totalRagHits / totalCalls).toFixed(1)) : 0,
      toolUsage: toSortedArray(toolUsageMap),
      modelUsage: toSortedArray(modelUsageMap),
      latestLogs: logs.slice(0, 8),
      generatedAt: new Date().toISOString(),
    };
  }

}
