import { Injectable } from "@nestjs/common";
import { MemoryStore } from "../../shared/memory-store";
import { DatabaseService } from "../../shared/database.service";
import { LlmService } from "../llm/llm.service";

type ToolStatus = "success" | "failed";

type StudentInput = {
  name?: string;
  studentName?: string;
  student?: string;
  background?: string;
  country?: string;
  targetCountry?: string;
  major?: string;
  degree?: string;
  cgpa?: number | string;
  gpa?: number | string;
  scale?: number | string;
  budget?: string;
  language?: string;
  englishScore?: string;
  concern?: string;
  angle?: string;
  platform?: string;
  experience?: string;
  targetSchools?: string;
};

@Injectable()
export class ToolsService {
  constructor(
    private readonly store: MemoryStore,
    private readonly db: DatabaseService,
    private readonly llm: LlmService,
  ) {}

  private hasRealLlm() {
    return (
      this.llm.isConfigured() &&
      String(process.env.FORCE_MOCK_TOOLS || "").toLowerCase() !== "true"
    );
  }

  private normalizeStudent(input: StudentInput = {}) {
    const name = input.name || input.studentName || "Chris";
    const country = input.country || input.targetCountry || "英国";
    const major = input.major || "计算机科学";
    const degree = input.degree || "硕士";
    const cgpa = String(input.cgpa || input.gpa || "3.2");
    const scale = Number(input.scale || 4);
    const budget = input.budget || "30万人民币";
    const language = input.language || input.englishScore || "IELTS 6.5";
    const concern =
      input.concern ||
      input.angle ||
      "担心 CGPA 不够，希望用项目、实习和文书提高竞争力";
    const experience =
      input.experience ||
      input.background ||
      input.student ||
      "马来西亚 APU 计算机本科，有软件项目、AI/数据项目和实习经历";
    const platform = input.platform || "小红书 + 短视频 + 微信私域";
    const targetSchools = input.targetSchools || "暂未确定";

    return {
      name,
      country,
      major,
      degree,
      cgpa,
      scale,
      budget,
      language,
      concern,
      experience,
      platform,
      targetSchools,
    };
  }

  private track<T>(toolName: string, input: any, fn: () => T) {
    const start = Date.now();
    try {
      const output = fn();
      this.addToolLog(toolName, input, output, Date.now() - start, "success");
      return output;
    } catch (error: any) {
      const output = { message: error?.message || "工具调用失败" };
      this.addToolLog(toolName, input, output, Date.now() - start, "failed");
      throw error;
    }
  }

  private async trackAsync<T>(
    toolName: string,
    input: any,
    fn: () => Promise<T>,
  ) {
    const start = Date.now();
    try {
      const output = await fn();
      this.addToolLog(toolName, input, output, Date.now() - start, "success");
      return output;
    } catch (error: any) {
      const output = { message: error?.message || "工具调用失败" };
      this.addToolLog(toolName, input, output, Date.now() - start, "failed");
      throw error;
    }
  }

  private addToolLog(
    toolName: string,
    input: any,
    output: any,
    duration: number,
    status: ToolStatus,
  ) {
    this.store.addToolLog({ toolName, input, output, duration, status });
  }

  private stripJson(text: string) {
    return String(text || "")
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
  }

  private tryJson<T = any>(text: string): T | null {
    try {
      return JSON.parse(this.stripJson(text));
    } catch {
      const match = String(text || "").match(/\{[\s\S]*\}/);
      if (!match) return null;
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
  }

  private asArray(value: any): any[] {
    if (Array.isArray(value)) return value;
    if (value == null || value === "") return [];
    return [value];
  }

  private async aiJson<T>(config: {
    system: string;
    user: string;
    fallback: T;
    normalize?: (value: any, raw?: string) => T;
  }): Promise<T> {
    if (!this.hasRealLlm()) return config.fallback;

    try {
      const raw = await this.llm.chat([
        {
          role: "system",
          content: `${config.system}\n\n你必须只返回合法 JSON，不要 Markdown，不要代码块，不要解释。`,
        },
        { role: "user", content: config.user },
      ]);
      const parsed = this.tryJson(raw);
      if (!parsed)
        return {
          ...(config.fallback as any),
          raw,
          llmFallbackReason: "LLM 返回不是合法 JSON，已使用安全兜底结构。",
        } as T;
      return config.normalize
        ? config.normalize(parsed, raw)
        : ({
            ...(config.fallback as any),
            ...(parsed as any),
            poweredBy: "deepseek",
          } as T);
    } catch (error: any) {
      return {
        ...(config.fallback as any),
        llmFallbackReason: error?.message || "LLM unavailable",
      } as T;
    }
  }

  private markdownList(items: any[] = []) {
    return items
      .filter(Boolean)
      .map(
        (item) => `- ${typeof item === "string" ? item : JSON.stringify(item)}`,
      )
      .join("\n");
  }

  convertCgpa(input: { cgpa: number; scale?: number; targetCountry?: string }) {
    return this.track("CGPA 换算工具", input, () => {
      const scale = Number(input.scale || 4);
      const cgpa = Number(input.cgpa || 0);
      const percent = Math.max(0, Math.min(100, (cgpa / scale) * 100));

      let level = "需要强化背景";
      let band = "risk";
      if (percent >= 85) {
        level = "优秀，可冲刺排名较高院校";
        band = "reach";
      } else if (percent >= 75) {
        level = "良好，适合匹配中上院校";
        band = "match";
      } else if (percent >= 65) {
        level = "中等，建议合理选校并补充项目/实习";
        band = "safe-match";
      }

      return {
        cgpa,
        scale,
        percentage: Number(percent.toFixed(2)),
        targetCountry: input.targetCountry || "未指定",
        level,
        band,
        advice: [
          "换算结果仅用于申请初筛，不等于学校官方评估。",
          "建议同时准备课程描述、项目经历、实习证明和推荐信。",
          "最终要求需要以目标学校官网和当年招生政策为准。",
        ],
      };
    });
  }

  async recommendSchools(input: StudentInput) {
    return this.trackAsync("院校推荐工具", input, async () => {
      const s = this.normalizeStudent(input);
      const gpa = Number(s.cgpa) || 3.2;
      const fallbackBands =
        gpa >= 3.4
          ? {
              reach: ["Manchester", "Bristol"],
              match: ["Sheffield", "Nottingham"],
              safe: ["Cardiff", "Liverpool"],
            }
          : gpa >= 3.0
            ? {
                reach: ["Sheffield", "Nottingham"],
                match: ["Cardiff", "Liverpool"],
                safe: ["Sussex", "Essex"],
              }
            : {
                reach: ["Cardiff", "Liverpool"],
                match: ["Sussex", "Essex"],
                safe: ["Swansea", "部分预科/语言班/合作项目"],
              };

      const fallback = {
        profile: s,
        reach: fallbackBands.reach.map((name) => ({
          name,
          reason: "可作为冲刺选择，需要突出项目、实习和课程匹配度。",
          action: "核对官网课程要求、语言要求和申请截止时间。",
        })),
        match: fallbackBands.match.map((name) => ({
          name,
          reason: "与当前背景相对匹配，建议重点准备申请材料。",
          action: "围绕项目经历和专业匹配度准备 PS/CV。",
        })),
        safe: fallbackBands.safe.map((name) => ({
          name,
          reason: "作为保底选择，适合提升申请成功率。",
          action: "控制申请风险，避免只投高风险学校。",
        })),
        risk: [
          "GPA、语言成绩、课程匹配度和申请时间都会影响结果。",
          "推荐结果为初筛，真实申请需核对学校官网。",
        ],
      };

      return this.aiJson({
        fallback,
        system:
          "你是留学选校规划 Agent，擅长把学生背景拆成冲刺、匹配、保底三档。",
        user: `请基于以下学生背景生成三档院校推荐 JSON。字段：profile, reach, match, safe, risk。每档 2-3 所学校，每所包含 name, reason, fit, risk, action。\n${JSON.stringify(s, null, 2)}`,
        normalize: (value) => ({
          ...fallback,
          ...value,
          profile: value.profile || fallback.profile,
          reach: this.asArray(value.reach).length
            ? this.asArray(value.reach)
            : fallback.reach,
          match: this.asArray(value.match).length
            ? this.asArray(value.match)
            : fallback.match,
          safe: this.asArray(value.safe).length
            ? this.asArray(value.safe)
            : fallback.safe,
          risk: this.asArray(value.risk).length
            ? this.asArray(value.risk)
            : fallback.risk,
          poweredBy: "deepseek",
        }),
      });
    });
  }

  async generateCopywriting(input: StudentInput) {
    return this.trackAsync("销售话术生成工具", input, async () => {
      const s = this.normalizeStudent(input);
      const fallback = {
        student: s,
        wechat: `你好${s.name}，我看你目标是${s.country}${s.major}${s.degree}。我们可以先按 GPA、课程匹配、项目经历、语言成绩和预算做一次定位，再拆出冲刺/匹配/保底方案。`,
        objectionHandling: [
          {
            concern: "担心 GPA 不够",
            answer:
              "GPA 是重要因素，但项目、实习、课程匹配和文书解释逻辑也会影响整体竞争力。",
          },
          {
            concern: "担心预算超支",
            answer: "可以先区分伦敦与非伦敦城市，再把学校分成不同预算档。",
          },
        ],
        callOutline: [
          "确认学生背景和目标国家",
          "解释当前背景优势与风险",
          "给出三档选校策略",
          "引导提供成绩单和项目经历",
          "安排下一步方案沟通",
        ],
        shortVideoScript: `如果你是${s.experience}，想申请${s.country}${s.major}${s.degree}，不要只盯排名，要先看课程匹配、预算和材料完整度。`,
        followUpTasks: [
          "索要成绩单",
          "确认语言成绩",
          "整理项目/实习素材",
          "预约方案讲解",
        ],
      };

      return this.aiJson({
        fallback,
        system:
          "你是留学咨询公司的销售转化 Agent，输出专业、有边界、不过度承诺的销售话术。",
        user: `请生成销售沟通包 JSON。字段：student, wechat, objectionHandling, callOutline, shortVideoScript, followUpTasks。\n${JSON.stringify(s, null, 2)}`,
        normalize: (value) => ({
          ...fallback,
          ...value,
          objectionHandling: this.asArray(value.objectionHandling).length
            ? this.asArray(value.objectionHandling)
            : fallback.objectionHandling,
          callOutline: this.asArray(value.callOutline).length
            ? this.asArray(value.callOutline)
            : fallback.callOutline,
          followUpTasks: this.asArray(value.followUpTasks).length
            ? this.asArray(value.followUpTasks)
            : fallback.followUpTasks,
          poweredBy: "deepseek",
        }),
      });
    });
  }

  assessProfile(input: StudentInput) {
    return this.track("申请适配评分算法", input, () => {
      const student = this.normalizeStudent(input);
      const scale = Number(student.scale || 4) || 4;
      const gpaValue =
        Number(String(student.cgpa || "").replace(/[^0-9.]/g, "")) || 0;
      const percentage = Math.max(
        0,
        Math.min(100, scale === 100 ? gpaValue : (gpaValue / scale) * 100),
      );
      const text =
        `${student.experience} ${student.concern} ${student.major} ${student.language} ${student.budget}`.toLowerCase();

      const hasCsBackground =
        /计算机|软件|computer|software|it|数据|data|ai|人工智能|信息/.test(
          text,
        );
      const hasProject =
        /项目|project|github|作品集|系统|web|开发|ai|rag|数据|实习|intern/.test(
          text,
        );
      const hasInternship = /实习|intern|工作|项目交付|团队/.test(text);
      const hasLanguage =
        /ielts\s*6\.5|雅思\s*6\.5|toefl|pte|英语|英文|6\.5|7/.test(text);
      const budgetNum = Number(
        String(student.budget || "").match(/\d+(\.\d+)?/)?.[0] || 0,
      );

      const gpaScore = Math.round(Math.min(100, Math.max(35, percentage)));
      const majorScore = hasCsBackground ? 88 : 62;
      const projectScore = Math.min(
        96,
        (hasProject ? 78 : 48) +
          (hasInternship ? 10 : 0) +
          (/github|作品集|上线|部署|rag|ai/.test(text) ? 8 : 0),
      );
      const languageScore = hasLanguage ? 82 : 62;
      const budgetScore =
        budgetNum >= 35 ? 86 : budgetNum >= 28 ? 76 : budgetNum >= 20 ? 64 : 52;

      const weights = {
        gpa: 0.3,
        major: 0.22,
        project: 0.24,
        language: 0.12,
        budget: 0.12,
      };
      const overall = Math.round(
        gpaScore * weights.gpa +
          majorScore * weights.major +
          projectScore * weights.project +
          languageScore * weights.language +
          budgetScore * weights.budget,
      );

      const band =
        overall >= 82 ? "A" : overall >= 72 ? "B" : overall >= 62 ? "C" : "D";
      const tierAdvice =
        band === "A"
          ? {
              reach: 3,
              match: 3,
              safe: 2,
              strategy: "可以保留冲刺比例，但仍需设置保底。",
            }
          : band === "B"
            ? {
                reach: 2,
                match: 4,
                safe: 2,
                strategy: "以匹配院校为主，冲刺院校需要材料支撑。",
              }
            : band === "C"
              ? {
                  reach: 1,
                  match: 3,
                  safe: 4,
                  strategy: "控制申请风险，重点包装项目与课程匹配。",
                }
              : {
                  reach: 0,
                  match: 3,
                  safe: 5,
                  strategy: "先补齐语言、项目证明和材料，再扩大申请范围。",
                };

      const factors = [
        {
          key: "gpa",
          label: "成绩表现",
          score: gpaScore,
          weight: weights.gpa,
          evidence: `${student.cgpa}/${student.scale}`,
        },
        {
          key: "major",
          label: "专业匹配",
          score: majorScore,
          weight: weights.major,
          evidence: hasCsBackground
            ? "背景与目标专业相关"
            : "需要补课程或项目说明",
        },
        {
          key: "project",
          label: "项目经历",
          score: projectScore,
          weight: weights.project,
          evidence: hasProject ? "有项目/实习可包装" : "项目素材不足",
        },
        {
          key: "language",
          label: "语言准备",
          score: languageScore,
          weight: weights.language,
          evidence: student.language || "待补充",
        },
        {
          key: "budget",
          label: "预算风险",
          score: budgetScore,
          weight: weights.budget,
          evidence: student.budget || "待确认",
        },
      ];

      const risks = [] as string[];
      if (gpaScore < 75)
        risks.push("成绩不算强，冲刺院校需要用项目和推荐信补强。");
      if (!hasProject) risks.push("项目材料不足，PS 和 CV 容易空泛。");
      if (!hasLanguage)
        risks.push("语言成绩信息不完整，递交节奏需要预留补分时间。");
      if (budgetScore < 70)
        risks.push("预算需要区分城市和学制，避免只按排名选校。");

      return {
        student,
        algorithm: "weighted-fit-v1",
        overall,
        band,
        percentage: Number(percentage.toFixed(1)),
        weights,
        factors,
        tierAdvice,
        risks,
        nextActions: [
          "把成绩单、课程列表和项目经历整理成结构化材料。",
          "按冲刺、匹配、保底三档核对学校官网要求。",
          "优先补充能证明工程能力或数据能力的项目证据。",
        ],
      };
    });
  }

  materialList(input: StudentInput) {
    return this.track("申请材料清单工具", input, () => {
      const s = this.normalizeStudent(input);
      return {
        country: s.country,
        degree: s.degree,
        required: [
          "成绩单",
          "在读证明/毕业证",
          "个人陈述 PS",
          "简历 CV",
          "推荐信",
          "护照",
          "语言成绩",
        ],
        optional: [
          "课程描述",
          "作品集",
          "实习证明",
          "项目证明",
          "获奖证明",
          "GitHub/作品集链接",
        ],
        namingRules: [
          "01_transcript.pdf",
          "02_cv.pdf",
          "03_ps.docx",
          "04_reference_1.pdf",
        ],
        reminders: [
          "不同学校材料要求可能不同。",
          "语言成绩未达标时可查询语言班或后补政策。",
          "所有材料建议统一命名并备份。",
        ],
      };
    });
  }

  async growthCampaign(input: StudentInput) {
    return this.trackAsync("线索内容生成器", input, async () => {
      const s = this.normalizeStudent(input);
      const fallback = {
        brief: `${s.experience}，目标${s.country}${s.major}${s.degree}，核心内容角度：${s.concern}。`,
        xiaohongshu: {
          title: `GPA 不算顶尖，也能申请${s.country}${s.major}${s.degree}吗？`,
          hook: "很多同学一看到 GPA 就觉得自己没机会，其实留学申请不是只看一个数字。",
          body: [
            `如果你是${s.experience}，目标是${s.country}${s.major}，先不要盲目按排名投。`,
            "正确做法是把学校拆成冲刺、匹配、保底三档，再看课程匹配、项目经历、语言成绩和预算。",
            "GPA 不够强时，项目、实习、推荐信和 PS 的解释逻辑会非常关键。",
          ],
          cta: "想看你的背景适合哪一档，可以先整理成绩单和目标专业，我帮你做一版初筛。",
          hashtags: [
            "留学申请",
            `${s.country}硕士`,
            s.major,
            "选校定位",
            "留学咨询",
          ],
        },
        videoScript: {
          opening:
            "如果你本科背景普通、GPA 不算高，还想申请海外硕士，这条一定要看完。",
          shots: [
            "镜头1：展示成绩单/项目经历，提出痛点。",
            "镜头2：用三档选校图解释冲刺、匹配、保底。",
            "镜头3：展示材料清单：PS、CV、推荐信、课程描述。",
          ],
          ending: "评论区留下目标国家和专业，我给你一个选校方向。",
        },
        wechatFollowup: [
          `你好，我看你目标是${s.country}${s.major}，我们可以先按 GPA、课程匹配、项目经历和预算做一次定位。`,
          "我建议先不要直接定学校，先做三档策略，这样既有冲刺空间，也能控制风险。",
          "你方便发一下成绩单、语言成绩和项目/实习经历吗？我可以帮你做初版方案。",
        ],
        contentCalendar: [
          { day: "周一", topic: "低 GPA 申请策略", format: "小红书笔记" },
          {
            day: "周三",
            topic: `${s.country}${s.major}选校误区`,
            format: "短视频",
          },
          { day: "周五", topic: "申请材料清单", format: "图文 checklist" },
        ],
      };

      return this.aiJson({
        fallback,
        system:
          "你是留学咨询公司的前台增长 Agent。内容要能直接发小红书、短视频和微信私域，避免夸大录取结果。",
        user: `请生成多平台获客内容包 JSON。字段：brief, xiaohongshu{title,hook,body,cta,hashtags}, videoScript{opening,shots,ending}, wechatFollowup, contentCalendar。\n${JSON.stringify(s, null, 2)}`,
        normalize: (value) => ({
          ...fallback,
          ...value,
          xiaohongshu: {
            ...fallback.xiaohongshu,
            ...(value.xiaohongshu || {}),
          },
          videoScript: {
            ...fallback.videoScript,
            ...(value.videoScript || {}),
          },
          wechatFollowup: this.asArray(value.wechatFollowup).length
            ? this.asArray(value.wechatFollowup)
            : fallback.wechatFollowup,
          contentCalendar: this.asArray(value.contentCalendar).length
            ? this.asArray(value.contentCalendar)
            : fallback.contentCalendar,
          poweredBy: "deepseek",
        }),
      });
    });
  }

  async applicationPlan(input: StudentInput) {
    return this.trackAsync("申请文书规划器", input, async () => {
      const s = this.normalizeStudent(input);
      const fallback = {
        student: {
          name: s.name,
          country: s.country,
          major: s.major,
          degree: s.degree,
          gpa: s.cgpa,
          language: s.language,
          budget: s.budget,
          experience: s.experience,
        },
        pipeline: [
          {
            stage: "线索评估",
            status: "进行中",
            owner: "咨询顾问",
            tasks: ["确认预算与目标国家", "收集成绩单与语言成绩"],
          },
          {
            stage: "选校定位",
            status: "待开始",
            owner: "申请顾问",
            tasks: ["拆分冲刺/匹配/保底", "核对官网入学要求"],
          },
          {
            stage: "文书制作",
            status: "待开始",
            owner: "文书老师",
            tasks: ["PS 大纲", "CV 优化", "推荐信素材表"],
          },
          {
            stage: "递交追踪",
            status: "待开始",
            owner: "申请顾问",
            tasks: ["网申账号", "材料上传", "offer 状态更新"],
          },
        ],
        writingBrief: {
          psTheme: `围绕${s.major}学习经历、项目能力和未来职业目标展开，解释为什么选择${s.country}${s.degree}。`,
          psOutline: [
            "学术背景与兴趣来源",
            "项目/实习经历证明能力",
            "为什么选择目标专业和国家",
            "未来职业目标和课程匹配",
          ],
          cvHighlights: [
            "课程匹配度",
            "软件/AI/数据项目",
            "GitHub 或作品集",
            "实习与团队协作",
          ],
          recommendationAngles: [
            "学术能力",
            "项目执行力",
            "英文沟通与持续学习能力",
          ],
        },
        drafts: {
          personalStatement: `我希望申请${s.country}${s.major}${s.degree}，因为本科阶段的计算机学习和项目实践让我逐步形成了对软件工程、数据分析和 AI 应用的兴趣。接下来我会进一步补充具体课程、项目、实习和职业目标，使文书更贴合目标院校。`,
          cvSummary: `${s.name}，${s.major}方向申请人，具备编程、项目协作、数据/AI 应用和跨文化学习经历。`,
          recommendationSeed:
            "推荐信可重点强调课程表现、项目执行力、持续学习能力和英文沟通能力。",
        },
        materialChecklist: [
          "成绩单",
          "在读证明/毕业证",
          "PS",
          "CV",
          "两封推荐信",
          "护照",
          "语言成绩",
          "课程描述",
          "项目证明",
        ],
        riskFlags: [
          "GPA 和专业课程匹配度需要逐校核对。",
          "预算需要区分伦敦与非伦敦城市。",
          "语言成绩未达标时需准备语言班或后补策略。",
        ],
        nextBestActions: [
          "上传成绩单到知识库，验证 RAG 能否命中。",
          "用 AI 对话生成三档选校。",
          "把结果转成小红书/短视频获客内容。",
        ],
      };

      return this.aiJson({
        fallback,
        system:
          "你是留学申请后端 CRM + 文书规划 Agent，负责生成可执行申请流程、文书大纲和可导出的文书初稿。",
        user: `请生成申请执行方案 JSON。字段：student, pipeline, writingBrief{psTheme,psOutline,cvHighlights,recommendationAngles}, drafts{personalStatement,cvSummary,recommendationSeed}, materialChecklist, riskFlags, nextBestActions。必须给出可直接编辑的 personalStatement 初稿。\n${JSON.stringify(s, null, 2)}`,
        normalize: (value) => ({
          ...fallback,
          ...value,
          student: { ...fallback.student, ...(value.student || {}) },
          pipeline: this.asArray(value.pipeline).length
            ? this.asArray(value.pipeline)
            : fallback.pipeline,
          writingBrief: {
            ...fallback.writingBrief,
            ...(value.writingBrief || {}),
          },
          drafts: { ...fallback.drafts, ...(value.drafts || {}) },
          materialChecklist: this.asArray(value.materialChecklist).length
            ? this.asArray(value.materialChecklist)
            : fallback.materialChecklist,
          riskFlags: this.asArray(value.riskFlags).length
            ? this.asArray(value.riskFlags)
            : fallback.riskFlags,
          nextBestActions: this.asArray(value.nextBestActions).length
            ? this.asArray(value.nextBestActions)
            : fallback.nextBestActions,
          exportMarkdown: this.applicationMarkdown({ ...fallback, ...value }),
          poweredBy: "deepseek",
        }),
      });
    });
  }

  private applicationMarkdown(result: any) {
    const student = result.student || {};
    const writing = result.writingBrief || {};
    const drafts = result.drafts || {};
    return `# ${student.name || "学生"} ${student.country || ""}${student.major || ""}${student.degree || ""}申请执行方案\n\n## 学生档案\n- GPA/CGPA：${student.gpa || "-"}\n- 语言成绩：${student.language || "-"}\n- 预算：${student.budget || "-"}\n- 背景：${student.experience || "-"}\n\n## PS 主题\n${writing.psTheme || "-"}\n\n## PS 大纲\n${this.markdownList(writing.psOutline || [])}\n\n## Personal Statement 初稿\n${drafts.personalStatement || "-"}\n\n## CV 摘要\n${drafts.cvSummary || "-"}\n\n## 推荐信素材方向\n${drafts.recommendationSeed || "-"}\n\n## 材料清单\n${this.markdownList(result.materialChecklist || [])}\n\n## 风险提示\n${this.markdownList(result.riskFlags || [])}\n\n## 下一步动作\n${this.markdownList(result.nextBestActions || [])}\n`;
  }

  async advisorSuite(input: StudentInput) {
    return this.trackAsync("综合方案编排器", input, async () => {
      const s = this.normalizeStudent(input);
      const started = Date.now();
      const academic = this.convertCgpa({
        cgpa: Number(s.cgpa || 3.2),
        scale: Number(s.scale || 4),
        targetCountry: s.country,
      });
      const fit = this.assessProfile(s);
      const schools = await this.recommendSchools(s);
      const materials = this.materialList(s);
      const growth = await this.growthCampaign(s);
      const application = await this.applicationPlan(s);
      const sales = await this.generateCopywriting(s);

      const result = {
        executiveSummary: `已完成 ${s.name} 的背景评分、选校分层、跟进内容、文书规划和材料清单。`,
        studentProfile: s,
        workflow: [
          {
            step: 1,
            name: "Academic Intake",
            tool: "CGPA 换算工具",
            status: "done",
            output: academic.level,
          },
          {
            step: 2,
            name: "Fit Scoring",
            tool: "申请适配评分算法",
            status: "done",
            output: `综合评分 ${fit.overall}/100，等级 ${fit.band}`,
          },
          {
            step: 3,
            name: "School Strategy",
            tool: "院校推荐工具",
            status: "done",
            output: "冲刺/匹配/保底三档",
          },
          {
            step: 4,
            name: "Growth Handoff",
            tool: "线索内容生成器",
            status: "done",
            output: "小红书/短视频/微信",
          },
          {
            step: 5,
            name: "Application CRM",
            tool: "申请文书规划器",
            status: "done",
            output: "PS/CV/推荐信/流程",
          },
          {
            step: 6,
            name: "Material Ops",
            tool: "申请材料清单工具",
            status: "done",
            output: "required + optional checklist",
          },
        ],
        outputs: {
          academic,
          fit,
          schools,
          growth,
          sales,
          application,
          materials,
        },
        handoff: [
          {
            team: "前台/销售",
            action: "用 growth 和 sales 结果跟进同背景线索。",
          },
          { team: "咨询顾问", action: "基于 schools 输出做三档选校初筛。" },
          {
            team: "文书老师",
            action: "基于 application.writingBrief 和 drafts 产出 PS/CV 初稿。",
          },
          { team: "申请顾问", action: "根据 materials 和 pipeline 追踪递交。" },
        ],
        agentTrace: {
          mode: this.hasRealLlm() ? "真实模型" : "兜底模式",
          model: process.env.LLM_MODEL || "deepseek-chat",
          durationMs: Date.now() - started,
          tools: [
            "convertCgpa",
            "assessProfile",
            "recommendSchools",
            "growthCampaign",
            "generateCopywriting",
            "applicationPlan",
            "materialList",
          ],
        },
      };

      return {
        ...result,
        exportMarkdown: this.advisorMarkdown(result),
      };
    });
  }

  private advisorMarkdown(result: any) {
    const s = result.studentProfile || {};
    const app = result.outputs?.application || {};
    return `# EduAgent 综合申请方案\n\n## 学生画像\n- 姓名：${s.name || "-"}\n- 国家/专业/学位：${s.country || "-"} / ${s.major || "-"} / ${s.degree || "-"}\n- GPA：${s.cgpa || "-"}\n- 语言：${s.language || "-"}\n- 预算：${s.budget || "-"}\n\n## 总结\n${result.executiveSummary}\n\n## 适配评分\n${result.outputs?.fit?.overall || "-"} / 100（${result.outputs?.fit?.band || "-"}）\n\n## 工作流\n${this.markdownList((result.workflow || []).map((x: any) => `${x.step}. ${x.name}｜${x.tool}｜${x.output}`))}\n\n## 冲刺院校\n${this.markdownList(result.outputs?.schools?.reach?.map((x: any) => `${x.name}：${x.reason}`) || [])}\n\n## 匹配院校\n${this.markdownList(result.outputs?.schools?.match?.map((x: any) => `${x.name}：${x.reason}`) || [])}\n\n## 保底院校\n${this.markdownList(result.outputs?.schools?.safe?.map((x: any) => `${x.name}：${x.reason}`) || [])}\n\n## 文书初稿\n${app.drafts?.personalStatement || "-"}\n\n## 材料清单\n${this.markdownList(result.outputs?.materials?.required || [])}\n`;
  }

  async logs(limit = 50) {
    const memoryLogs = this.store.toolLogs.slice(0, limit).map((log: any) => ({
      id: log.id,
      type: "tool_call",
      question: log.toolName,
      model: this.hasRealLlm()
        ? process.env.LLM_MODEL || "deepseek-chat"
        : "local-tool",
      success: log.status === "success",
      status: log.status,
      durationMs: log.duration,
      ragHitCount: 0,
      toolNames: [log.toolName],
      error: log.status === "success" ? "" : "工具调用失败",
      createdAt: log.createdAt,
      input: log.input,
      output: log.output,
    }));

    let dbLogs: any[] = [];
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

        dbLogs = result.rows.map((row: any) => ({
          id: row.id,
          type: "ai_call",
          conversationId: row.conversation_id,
          question: row.question,
          model: row.model || "unknown",
          success: Boolean(row.success),
          status: row.success ? "success" : "failed",
          durationMs: row.duration_ms || 0,
          ragHitCount: row.rag_hit_count || 0,
          toolNames: row.tool_names || [],
          error: row.error || "",
          createdAt: row.created_at,
        }));
      } catch (error) {
        console.error("读取 Supabase call_logs 失败：", error);
      }
    }

    return [...memoryLogs, ...dbLogs]
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime(),
      )
      .slice(0, limit);
  }

  async overview(limit = 80) {
    const logs = await this.logs(limit);
    const totalCalls = logs.length;
    const successCount = logs.filter((log: any) => log.success).length;
    const totalDuration = logs.reduce(
      (sum: number, log: any) => sum + Number(log.durationMs || 0),
      0,
    );
    const totalRagHits = logs.reduce(
      (sum: number, log: any) => sum + Number(log.ragHitCount || 0),
      0,
    );

    const toolUsageMap = new Map<string, number>();
    const modelUsageMap = new Map<string, number>();

    for (const log of logs as any[]) {
      const model = log.model || "unknown";
      modelUsageMap.set(model, (modelUsageMap.get(model) || 0) + 1);
      const toolNames =
        Array.isArray(log.toolNames) && log.toolNames.length
          ? log.toolNames
          : ["无工具调用"];
      for (const name of toolNames)
        toolUsageMap.set(name, (toolUsageMap.get(name) || 0) + 1);
    }

    const toSortedArray = (map: Map<string, number>) =>
      Array.from(map.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    return {
      totalCalls,
      successCount,
      failedCount: totalCalls - successCount,
      successRate: totalCalls
        ? Number((successCount / totalCalls).toFixed(2))
        : 0,
      avgDurationMs: totalCalls ? Math.round(totalDuration / totalCalls) : 0,
      avgRagHitCount: totalCalls
        ? Number((totalRagHits / totalCalls).toFixed(1))
        : 0,
      toolUsage: toSortedArray(toolUsageMap),
      modelUsage: toSortedArray(modelUsageMap),
      latestLogs: logs.slice(0, 8),
      generatedAt: new Date().toISOString(),
      mode: this.hasRealLlm() ? "真实模型" : "兜底模式",
    };
  }
}
