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
  languageType?: string;
  languageScore?: string;
  gaokaoTaken?: string;
  gaokaoScore?: string;
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
    const languageType = input.languageType || "IELTS";
    const languageScore = input.languageScore || "6.5";
    const language =
      input.language ||
      input.englishScore ||
      (languageType === "暂无" ? "暂未考试" : `${languageType} ${languageScore}`);
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
    const gaokaoTaken = input.gaokaoTaken || "否";
    const gaokaoScore = input.gaokaoScore || "";

    return {
      name,
      country,
      major,
      degree,
      cgpa,
      scale,
      budget,
      language,
      languageType,
      languageScore,
      gaokaoTaken,
      gaokaoScore,
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
      .map((item) => {
        if (typeof item === "string") return `- ${item}`;
        if (item?.name) return `- ${item.name}${item.note ? `：${item.note}` : ""}`;
        if (item?.file) return `- ${item.file}${item.note ? `：${item.note}` : ""}`;
        if (item?.stage || item?.item) return `- ${item.stage || ""} ${item.item || ""}`.trim();
        return `- ${JSON.stringify(item)}`;
      })
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
      const schoolPool: Record<string, string[][]> = {
        英国: [["Manchester", "Bristol", "Glasgow"], ["Sheffield", "Nottingham", "Queen Mary"], ["Cardiff", "Liverpool", "Sussex"]],
        澳洲: [["University of Sydney", "UNSW", "Monash"], ["University of Adelaide", "UTS", "RMIT"], ["Deakin", "Swinburne", "Macquarie"]],
        新加坡: [["NUS", "NTU"], ["SMU", "SUTD"], ["SIM / Kaplan 合作项目", "PSB Academy"]],
        香港: [["HKU", "CUHK", "HKUST"], ["CityU", "PolyU", "HKBU"], ["Lingnan", "HSUHK"]],
        加拿大: [["UBC", "Toronto", "Waterloo"], ["McMaster", "Ottawa", "Simon Fraser"], ["York", "Concordia", "Windsor"]],
        美国: [["Northeastern", "USC", "NYU Tandon"], ["Stevens", "Syracuse", "George Washington"], ["Pace", "Illinois Tech", "University of Dayton"]],
        新西兰: [["University of Auckland", "University of Otago"], ["Victoria University of Wellington", "University of Canterbury"], ["Massey University", "AUT"]],
        爱尔兰: [["Trinity College Dublin", "University College Dublin"], ["University of Galway", "University College Cork"], ["Dublin City University", "Maynooth University"]],
        荷兰: [["TU Delft", "University of Amsterdam"], ["Eindhoven University of Technology", "Utrecht University"], ["Tilburg University", "Vrije Universiteit Amsterdam"]],
        德国: [["Technical University of Munich", "RWTH Aachen"], ["University of Stuttgart", "TU Darmstadt"], ["Saarland University", "University of Passau"]],
        法国: [["École Polytechnique", "Université PSL"], ["Télécom Paris", "Université Paris-Saclay"], ["Grenoble INP", "Université Côte d'Azur"]],
        日本: [["University of Tokyo", "Kyoto University"], ["Osaka University", "Tohoku University"], ["Waseda University", "Keio University"]],
        韩国: [["Seoul National University", "KAIST"], ["POSTECH", "Yonsei University"], ["Korea University", "Hanyang University"]],
        马来西亚: [["University of Malaya", "Universiti Putra Malaysia"], ["Taylor's University", "Monash Malaysia"], ["APU Malaysia", "INTI International University"]],
      };
      const pool = schoolPool[s.country] || schoolPool["英国"];
      const fallbackBands =
        gpa >= 3.4
          ? { reach: pool[0].slice(0, 2), match: pool[1].slice(0, 2), safe: pool[2].slice(0, 2) }
          : gpa >= 3.0
            ? { reach: pool[1].slice(0, 2), match: pool[2].slice(0, 2), safe: [pool[2][2] || pool[2][0], "合作项目/预科/桥梁课程"] }
            : { reach: pool[2].slice(0, 1), match: [pool[2][1] || pool[2][0], "合作项目"], safe: ["预科/桥梁课程", "语言班后补方案"] };

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
        /计算机|软件|computer|software|it|数据|data|ai|人工智能|信息|工程|business|analytics|金融|fintech/.test(
          text,
        );
      const hasProject =
        /项目|project|github|作品集|系统|web|开发|ai|rag|数据|实习|intern|科研|竞赛|论文/.test(
          text,
        );
      const hasInternship = /实习|intern|工作|项目交付|团队|公司|research/.test(text);
      const langType = String(student.languageType || "").toUpperCase();
      const langScore = Number(
        String(student.languageScore || student.language || "").match(/\d+(\.\d+)?/)?.[0] || 0,
      );
      const hasLanguage =
        langType === "IELTS"
          ? langScore >= 6
          : langType === "TOEFL"
            ? langScore >= 80
            : langType === "PTE"
              ? langScore >= 58
              : /ielts\s*6|雅思\s*6|toefl|pte|duolingo|英语|英文/.test(text);
      const budgetNum = Number(
        String(student.budget || "").match(/\d+(\.\d+)?/)?.[0] || 0,
      );
      const isUndergrad = student.degree === "本科";
      const gaokaoNum = Number(
        String(student.gaokaoScore || "").match(/\d+(\.\d+)?/)?.[0] || 0,
      );
      const gaokaoScore =
        !isUndergrad ? 0 : student.gaokaoTaken === "是" && gaokaoNum > 0
          ? Math.max(50, Math.min(95, Math.round((gaokaoNum / 750) * 100)))
          : 58;

      const gpaScore = Math.round(Math.min(100, Math.max(35, percentage)));
      const majorScore = hasCsBackground ? 88 : 62;
      const projectScore = Math.min(
        96,
        (hasProject ? 78 : 48) +
          (hasInternship ? 10 : 0) +
          (/github|作品集|上线|部署|rag|ai|论文|竞赛/.test(text) ? 8 : 0),
      );
      const languageScore = hasLanguage ? 82 : 58;
      const budgetScore =
        budgetNum >= 40 ? 90 : budgetNum >= 35 ? 84 : budgetNum >= 28 ? 76 : budgetNum >= 20 ? 64 : 52;

      const weights = isUndergrad
        ? { gpa: 0.24, major: 0.16, project: 0.16, language: 0.14, budget: 0.1, entranceExam: 0.2 }
        : { gpa: 0.3, major: 0.22, project: 0.24, language: 0.12, budget: 0.12 };
      const overall = Math.round(
        gpaScore * weights.gpa +
          majorScore * weights.major +
          projectScore * weights.project +
          languageScore * weights.language +
          budgetScore * weights.budget +
          (isUndergrad ? gaokaoScore * (weights as any).entranceExam : 0),
      );

      const band =
        overall >= 82 ? "A" : overall >= 72 ? "B" : overall >= 62 ? "C" : "D";
      const tierAdvice =
        band === "A"
          ? { reach: 3, match: 3, safe: 2, strategy: "可以保留冲刺比例，但仍需设置保底。" }
          : band === "B"
            ? { reach: 2, match: 4, safe: 2, strategy: "以匹配院校为主，冲刺院校需要材料支撑。" }
            : band === "C"
              ? { reach: 1, match: 3, safe: 4, strategy: "控制申请风险，重点包装项目与课程匹配。" }
              : { reach: 0, match: 3, safe: 5, strategy: "先补齐语言、项目证明和材料，再扩大申请范围。" };

      const factors: any[] = [
        { key: "gpa", label: "成绩表现", score: gpaScore, weight: weights.gpa, evidence: `${student.cgpa}/${student.scale}` },
        { key: "major", label: "专业匹配", score: majorScore, weight: weights.major, evidence: hasCsBackground ? "背景与目标专业相关" : "需要补课程或项目说明" },
        { key: "project", label: "项目经历", score: projectScore, weight: weights.project, evidence: hasProject ? "有项目/实习可包装" : "项目素材不足" },
        { key: "language", label: "语言准备", score: languageScore, weight: weights.language, evidence: student.language || "待补充" },
        { key: "budget", label: "预算风险", score: budgetScore, weight: weights.budget, evidence: student.budget || "待确认" },
      ];
      if (isUndergrad) {
        factors.push({ key: "entranceExam", label: "高考/入学考试", score: gaokaoScore, weight: (weights as any).entranceExam, evidence: student.gaokaoTaken === "是" ? student.gaokaoScore || "已提供" : "未提供高考成绩" });
      }

      const risks = [] as string[];
      const riskSignals = [] as string[];
      if (gpaScore < 85) riskSignals.push("成绩不属于强冲刺区间，冲刺院校需要项目、推荐信和文书主线一起支撑。");
      if (gpaScore < 75) risks.push("成绩偏弱，冲刺院校比例需要控制，并准备成绩解释或补充证明。");
      if (isUndergrad && student.gaokaoTaken !== "是") risks.push("本科申请未提供高考成绩，需要确认是否可用国际课程、预科或其他入学路径替代。");
      if (!hasProject) risks.push("项目材料不足，PS 和 CV 容易空泛。");
      if (hasProject && projectScore < 92) riskSignals.push("项目经历可以作为优势，但需要补充可验证证据，例如 GitHub、Demo、项目说明或实习证明。");
      if (!hasLanguage) risks.push("语言成绩信息不完整，递交节奏需要预留补分时间。");
      if (hasLanguage && langScore > 0 && ((langType === "IELTS" && langScore < 7) || (langType === "TOEFL" && langScore < 95) || (langType === "PTE" && langScore < 70))) {
        riskSignals.push("语言成绩达到初筛水平，但部分学校或热门专业可能要求更高。");
      }
      if (budgetScore < 82) riskSignals.push("预算需要按城市、学制和生活费重新拆分，避免只按排名选校。");
      if (budgetScore < 70) risks.push("预算偏紧，需要优先设置成本更稳的匹配和保底方案。");
      riskSignals.push("最终录取要求必须逐校核对官网，系统评分只用于内部初筛和流程编排。");

      const softRisks = riskSignals.length
        ? riskSignals
        : [
            "仍需逐校核对官网课程、语言、截止日期和材料要求。",
            "建议补充可验证项目证据，例如 GitHub、Demo、项目说明或实习证明。",
          ];
      const hardRisks = risks;
      const combinedRisks = [...hardRisks, ...softRisks].filter(Boolean);

      return {
        student,
        algorithm: "weighted-fit-v2",
        overall,
        band,
        percentage: Number(percentage.toFixed(1)),
        weights,
        factors,
        tierAdvice,
        risks: combinedRisks,
        hardRisks,
        softRisks,
        riskSignals: softRisks,
        riskSummary: {
          hard: hardRisks.length,
          soft: softRisks.length,
          total: combinedRisks.length,
        },
        nextActions: [
          "整理成绩单、课程列表、项目经历和语言成绩。",
          "按冲刺、匹配、保底三档核对学校官网要求。",
          isUndergrad ? "确认高考/国际课程/预科路径是否适用。" : "优先补充能证明工程能力或数据能力的项目证据。",
        ],
      };
    });
  }

  materialList(input: StudentInput) {
    return this.track("申请材料清单工具", input, () => {
      const s = this.normalizeStudent(input);
      const isUndergrad = s.degree === "本科";
      const isPostgrad = s.degree === "硕士" || s.degree === "博士";
      const needsPortfolio = /设计|建筑|艺术|传媒|作品|github|计算机|软件|数据|ai|人工智能/i.test(
        `${s.major} ${s.experience}`,
      );
      const required = [
        { name: "护照", note: "信息页清晰扫描" },
        { name: "成绩单", note: "中英文版本；如未毕业，提供最新成绩单" },
        { name: isUndergrad ? "高中在读/毕业证明" : "在读证明/毕业证学位证", note: "与成绩单姓名保持一致" },
        { name: "语言成绩", note: s.language || "未考试时标记为待补" },
        { name: isUndergrad ? "个人陈述/动机信" : "Personal Statement", note: "按目标专业改写，不建议通用一版" },
        { name: "简历 CV", note: "项目、实习、课程经历按申请方向排序" },
      ];
      if (isPostgrad) required.push({ name: "推荐信", note: "通常 1-2 封，优先学术推荐" });
      if (isUndergrad && s.gaokaoTaken === "是") required.push({ name: "高考成绩", note: s.gaokaoScore || "需补充总分与省份" });

      const conditional = [
        { name: "课程描述", note: "跨专业或课程匹配不明显时建议准备" },
        { name: "均分/GPA 说明", note: "不同评分制、转学或交换经历时使用" },
        { name: "资金证明", note: "签证或个别学校阶段需要" },
        { name: "作品集/项目集", note: needsPortfolio ? "建议准备" : "如专业要求再准备" },
      ];
      if (isUndergrad && s.gaokaoTaken !== "是") conditional.unshift({ name: "国际课程/预科替代材料", note: "没有高考成绩时确认替代路径" });

      return {
        country: s.country,
        degree: s.degree,
        required,
        conditional,
        optional: [
          { name: "实习证明", note: "有岗位职责和时间更好" },
          { name: "项目证明", note: "项目说明、截图、Demo、GitHub 链接" },
          { name: "获奖/证书", note: "只放和申请相关的内容" },
          { name: "研究计划", note: "博士或研究型项目需要" },
        ],
        namingRules: [
          { file: "01_passport.pdf", note: "护照" },
          { file: "02_transcript.pdf", note: "成绩单" },
          { file: "03_cv.pdf", note: "简历" },
          { file: "04_ps.docx", note: "个人陈述" },
          { file: "05_reference_1.pdf", note: "推荐信" },
        ],
        timeline: [
          { stage: "本周", item: "补齐成绩单、语言成绩、项目经历" },
          { stage: "1-2 周", item: "完成 CV、PS 大纲和推荐信素材" },
          { stage: "递交前", item: "逐校核对材料要求、命名和文件格式" },
        ],
        reminders: [
          "材料清单是内部初筛版本，递交前仍需逐校核对官网。",
          "同一份材料不要反复复制，建议统一命名并维护版本号。",
          "语言未达标时，把后补语言或语言班方案单独标记。",
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
      const materials = this.materialList(s);

      // 完整流程默认走 algorithm-first，避免一次点击触发多个 LLM 请求导致超时。
      // 单个节点仍然可以单独调用 DeepSeek；完整流程负责稳定编排和可解释输出。
      const schoolPool: Record<string, string[][]> = {
        英国: [["Manchester", "Bristol", "Glasgow"], ["Cardiff", "Liverpool", "Sheffield"], ["Sussex", "Swansea", "Portsmouth"]],
        澳洲: [["University of Sydney", "UNSW", "Monash"], ["Adelaide", "UTS", "RMIT"], ["Deakin", "Swinburne", "Macquarie"]],
        新加坡: [["NUS", "NTU"], ["SMU", "SUTD"], ["SIM / Kaplan", "PSB Academy"]],
        香港: [["HKU", "CUHK", "HKUST"], ["CityU", "PolyU", "HKBU"], ["Lingnan", "HSUHK"]],
        加拿大: [["UBC", "Toronto", "Waterloo"], ["Ottawa", "Simon Fraser", "McMaster"], ["York", "Concordia", "Windsor"]],
        美国: [["Northeastern", "USC", "NYU Tandon"], ["Stevens", "Syracuse", "George Washington"], ["Pace", "Illinois Tech", "Dayton"]],
        新西兰: [["University of Auckland", "University of Otago"], ["Victoria University of Wellington", "University of Canterbury"], ["Massey University", "AUT"]],
        爱尔兰: [["Trinity College Dublin", "University College Dublin"], ["University of Galway", "University College Cork"], ["Dublin City University", "Maynooth University"]],
        荷兰: [["TU Delft", "University of Amsterdam"], ["Eindhoven University of Technology", "Utrecht University"], ["Tilburg University", "Vrije Universiteit Amsterdam"]],
        德国: [["Technical University of Munich", "RWTH Aachen"], ["University of Stuttgart", "TU Darmstadt"], ["Saarland University", "University of Passau"]],
        法国: [["École Polytechnique", "Université PSL"], ["Télécom Paris", "Université Paris-Saclay"], ["Grenoble INP", "Université Côte d'Azur"]],
        日本: [["University of Tokyo", "Kyoto University"], ["Osaka University", "Tohoku University"], ["Waseda University", "Keio University"]],
        韩国: [["Seoul National University", "KAIST"], ["POSTECH", "Yonsei University"], ["Korea University", "Hanyang University"]],
        马来西亚: [["University of Malaya", "Universiti Putra Malaysia"], ["Taylor's University", "Monash Malaysia"], ["APU Malaysia", "INTI International University"]],
      };
      const pool = schoolPool[s.country] || schoolPool["英国"];
      const mapSchools = (names: string[], tier: string) => names.map((name) => ({
        name,
        reason: `${tier}档候选，需结合${s.major}课程设置、语言要求和预算进一步筛选。`,
        fit: tier === "冲刺" ? "适合保留少量高目标" : tier === "匹配" ? "适合作为主申请区间" : "用于控制整体录取风险",
        risk: tier === "冲刺" ? "对成绩、课程匹配和文书要求更高" : "需逐校核对官网要求",
        action: "核对官网要求后再进入最终名单。",
      }));
      const schools = {
        profile: s,
        reach: mapSchools(pool[0].slice(0, fit.tierAdvice.reach || 1), "冲刺"),
        match: mapSchools(pool[1].slice(0, fit.tierAdvice.match || 2), "匹配"),
        safe: mapSchools(pool[2].slice(0, fit.tierAdvice.safe || 2), "保底"),
        risk: fit.risks || [],
        poweredBy: "algorithm-first",
      };

      const application = {
        student: { name: s.name, country: s.country, major: s.major, degree: s.degree, gpa: s.cgpa, language: s.language, budget: s.budget, experience: s.experience },
        pipeline: [
          { stage: "背景确认", status: "进行中", owner: "咨询顾问", tasks: ["确认目标国家、专业、预算", "收集成绩单和语言成绩"] },
          { stage: "选校定位", status: "待开始", owner: "申请顾问", tasks: ["拆分冲刺/匹配/保底", "逐校核对官网要求"] },
          { stage: "材料准备", status: "待开始", owner: "学生 + 顾问", tasks: ["补齐护照、成绩单、在读证明", "整理项目、实习和作品集"] },
          { stage: "文书制作", status: "待开始", owner: "文书顾问", tasks: ["确定 PS 主线", "优化 CV 和推荐信素材"] },
          { stage: "递交追踪", status: "待开始", owner: "申请顾问", tasks: ["网申递交", "补件和 offer 跟进"] },
        ],
        writingBrief: {
          psTheme: `围绕${s.major}学习背景、项目能力和职业目标展开，重点解释为什么选择${s.country}${s.degree}。`,
          psOutline: ["专业动机", "课程与项目基础", "实习/作品集证明", "目标课程匹配", "职业规划"],
          cvHighlights: ["课程匹配度", "软件/AI/数据项目", "GitHub 或作品集", "实习与团队协作"],
          recommendationAngles: ["学习能力", "项目执行力", "沟通协作", "持续改进"],
        },
        drafts: {
          personalStatement: `${s.name}希望申请${s.country}${s.major}${s.degree}。现阶段文书主线建议围绕课程基础、项目经历、实习/作品集和未来职业目标展开，避免只解释 GPA，把重点放在可验证的能力证据上。`,
          cvSummary: `${s.major}方向申请人，具备项目、实习和跨文化学习经历，适合突出工程实践和学习能力。`,
          recommendationSeed: "推荐信可重点强调课程表现、项目执行力、团队协作和持续学习能力。",
        },
        materialChecklist: materials.required?.map((x: any) => x.name || x) || [],
        riskFlags: fit.risks || [],
        nextBestActions: fit.nextActions || [],
        poweredBy: "algorithm-first",
      };

      const sales = {
        student: s,
        wechat: `你好${s.name}，我先按成绩、专业匹配、项目经历、语言和预算给你做了初筛。建议先确定冲刺/匹配/保底比例，再逐校核对官网要求。`,
        objectionHandling: [
          { concern: "担心成绩不够", answer: "成绩是重要因素，但项目、课程匹配、推荐信和文书主线也会影响整体竞争力。" },
          { concern: "担心预算", answer: "先区分城市和学校档位，保留主申请区间，同时设置预算更稳的保底方案。" },
        ],
        callOutline: ["确认成绩单和语言", "解释适配评分", "确认三档选校", "收集项目/实习素材", "安排下一次方案确认"],
        followUpTasks: ["索要成绩单", "确认语言成绩", "整理项目经历", "确认预算上限"],
        poweredBy: "algorithm-first",
      };

      const result = {
        executiveSummary: `${s.name}｜${s.country}${s.major}${s.degree}：评分 ${fit.overall}/100（${fit.band}），建议按冲刺 ${fit.tierAdvice.reach} / 匹配 ${fit.tierAdvice.match} / 保底 ${fit.tierAdvice.safe} 配置。`,
        studentProfile: s,
        workflow: [
          { step: 1, name: "适配评分", tool: "weighted-fit-v2", status: "done", output: `${fit.overall}/100 · ${fit.band}` },
          { step: 2, name: "选校分层", tool: "规则分层", status: "done", output: "冲刺 / 匹配 / 保底" },
          { step: 3, name: "申请案卷", tool: "文书规则", status: "done", output: "PS / CV / 推荐信" },
          { step: 4, name: "销售跟进", tool: "话术模板", status: "done", output: "微信 / 电话 / 异议" },
          { step: 5, name: "材料清单", tool: "规则引擎", status: "done", output: "必交 / 条件 / 命名" },
        ],
        outputs: { academic, fit, schools, sales, application, materials },
        handoff: [
          { team: "咨询", action: "按评分和三档选校给学生解释风险。" },
          { team: "文书", action: "基于 PS 主线、CV 重点和推荐信角度改稿。" },
          { team: "申请", action: "按材料清单和时间节点跟进递交。" },
        ],
        agentTrace: {
          mode: "algorithm-first",
          model: "local-orchestrator",
          durationMs: Date.now() - started,
          algorithm: "weighted-fit-v2",
          tools: ["assessProfile", "schoolBanding", "applicationRules", "salesRules", "materialList"],
        },
      };

      return { ...result, exportMarkdown: this.advisorMarkdown(result) };
    });
  }

  private advisorMarkdown(result: any) {
    const s = result.studentProfile || {};
    const app = result.outputs?.application || {};
    return `# EduAgent 综合申请方案\n\n## 学生画像\n- 姓名：${s.name || "-"}\n- 国家/专业/学位：${s.country || "-"} / ${s.major || "-"} / ${s.degree || "-"}\n- GPA：${s.cgpa || "-"}\n- 语言：${s.language || "-"}\n- 预算：${s.budget || "-"}\n\n## 总结\n${result.executiveSummary}\n\n## 适配评分\n${result.outputs?.fit?.overall || "-"} / 100（${result.outputs?.fit?.band || "-"}）\n\n## 工作流\n${this.markdownList((result.workflow || []).map((x: any) => `${x.step}. ${x.name}｜${x.tool}｜${x.output}`))}\n\n## 冲刺院校\n${this.markdownList(result.outputs?.schools?.reach?.map((x: any) => `${x.name}：${x.reason}`) || [])}\n\n## 匹配院校\n${this.markdownList(result.outputs?.schools?.match?.map((x: any) => `${x.name}：${x.reason}`) || [])}\n\n## 保底院校\n${this.markdownList(result.outputs?.schools?.safe?.map((x: any) => `${x.name}：${x.reason}`) || [])}\n\n## 文书初稿\n${app.drafts?.personalStatement || "-"}\n\n## 材料清单\n${this.markdownList(result.outputs?.materials?.required || [])}\n`;
  }

  recordClientFailure(input: any = {}) {
    const toolName = input.toolName || input.activeTool || "前端工具调用";
    const output = {
      message: input.message || "前端请求失败",
      endpoint: input.endpoint || "",
      activeTool: input.activeTool || "",
      createdAt: new Date().toISOString(),
    };
    this.addToolLog(`${toolName}（前端失败）`, input, output, Number(input.durationMs || 0), "failed");
    return { success: true, logged: true, output };
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
      error: log.status === "success" ? "" : (log.output?.message || log.output?.error || "工具调用失败"),
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
