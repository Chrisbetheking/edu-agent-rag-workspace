type EvalCase = {
  name: string;
  question: string;
  expectedAnswerMode: 'school_plan' | 'grounded_qa';
  requireStructured?: boolean;
  requireTool?: string;
  expectedProfileHints?: string[];
};

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

const cases: EvalCase[] = [
  {
    name: 'APU CGPA 3.2 英国数据科学三档选校',
    question: 'Chris，马来西亚 APU 计算机本科，CGPA 3.2 / 4，IELTS 6.5，预算 35万人民币，想申请英国数据科学硕士。请按冲刺、匹配、保底推荐具体学校和专业，并按成功率排序。',
    expectedAnswerMode: 'school_plan',
    requireStructured: true,
    requireTool: '院校推荐工具',
    expectedProfileHints: ['英国', '数据科学', '3.2', '35万'],
  },
  {
    name: '双非均分 85 英国 CS 选校',
    question: '学生A，双非一本计算机专业，均分85 / 100，雅思 6.5，预算 40万人民币，目标英国计算机科学硕士，帮我做三档选校。',
    expectedAnswerMode: 'school_plan',
    requireStructured: true,
    requireTool: '院校推荐工具',
    expectedProfileHints: ['英国', '计算机科学', '85', '40万'],
  },
  {
    name: '申请材料知识问答不应出学校卡片',
    question: '英国计算机硕士申请一般需要提交哪些材料？',
    expectedAnswerMode: 'grounded_qa',
  },
  {
    name: 'CV 包装知识问答不应出学校卡片',
    question: '申请英国计算机硕士时，CV 里的 RAG 项目和前端 AI 工作台应该怎么写？',
    expectedAnswerMode: 'grounded_qa',
  },
];

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

async function requestJson(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`${path} failed ${response.status}: ${JSON.stringify(data).slice(0, 500)}`);
  }
  return data;
}

function checkStructured(data: any, testCase: EvalCase) {
  assert(data.structured, `${testCase.name}: expected structured result`);
  const tiers = data.structured.schoolTiers || [];
  assert(tiers.length === 3, `${testCase.name}: expected 3 school tiers`);
  for (const tier of tiers) {
    assert(Array.isArray(tier.schools) && tier.schools.length >= 2, `${testCase.name}: ${tier.tier} should include at least 2 schools`);
    const rates = tier.schools.map((school: any) => Number(String(school.successRate || '').match(/\d+/)?.[0] || 0));
    for (let i = 1; i < rates.length; i += 1) {
      assert(rates[i - 1] >= rates[i], `${testCase.name}: ${tier.tier} is not sorted by successRate`);
    }
    for (const school of tier.schools) {
      assert(school.nameZh && school.nameEn, `${testCase.name}: school missing zh/en name`);
      assert(school.majorZh && school.majorEn, `${testCase.name}: school missing zh/en programme`);
      assert(school.successRate, `${testCase.name}: school missing successRate`);
      assert(school.reason && school.fit && school.risk && school.action, `${testCase.name}: school missing explanation fields`);
    }
  }
}

async function main() {
  const guest = await requestJson('/auth/guest', { method: 'POST', body: '{}' });
  const authorization = `Bearer ${guest.token}`;
  const results: Array<{ name: string; ok: boolean; mode?: string; error?: string }> = [];

  for (const testCase of cases) {
    try {
      const data = await requestJson('/chat', {
        method: 'POST',
        headers: { authorization },
        body: JSON.stringify({ question: testCase.question, topK: 3 }),
      });
      assert(data.answerMode === testCase.expectedAnswerMode, `${testCase.name}: expected ${testCase.expectedAnswerMode}, got ${data.answerMode}`);
      if (testCase.requireStructured) checkStructured(data, testCase);
      if (testCase.requireTool) {
        const tool = (data.toolCalls || []).find((item: any) => String(item.name || '').includes(testCase.requireTool!));
        assert(tool, `${testCase.name}: expected tool ${testCase.requireTool}`);
        const toolText = JSON.stringify(tool.result || {});
        for (const hint of testCase.expectedProfileHints || []) {
          assert(toolText.includes(hint), `${testCase.name}: tool result/profile did not include ${hint}`);
        }
      }
      if (testCase.expectedAnswerMode === 'grounded_qa') {
        assert(!data.structured, `${testCase.name}: grounded_qa should not return structured school plan`);
      }
      results.push({ name: testCase.name, ok: true, mode: data.answerMode });
    } catch (error: any) {
      results.push({ name: testCase.name, ok: false, error: error?.message || String(error) });
    }
  }

  for (const item of results) {
    console.log(`${item.ok ? '✅' : '❌'} ${item.name}${item.mode ? ` (${item.mode})` : ''}${item.error ? `\n   ${item.error}` : ''}`);
  }

  const failed = results.filter((item) => !item.ok);
  if (failed.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
