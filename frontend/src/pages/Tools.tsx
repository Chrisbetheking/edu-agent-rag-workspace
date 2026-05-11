import { FormEvent, useState } from 'react';
import { api } from '../api/client';

export default function Tools() {
  const [cgpa, setCgpa] = useState('3.2');
  const [country, setCountry] = useState('英国');
  const [major, setMajor] = useState('计算机科学');
  const [result, setResult] = useState<any>(null);

  async function callTool(type: string, e?: FormEvent) {
    e?.preventDefault();
    const payload = { cgpa: Number(cgpa), gpa: Number(cgpa), country, major, budget: '30万人民币', language: '雅思 6.0', name: '同学', concern: '选校和申请成功率' };
    const endpoint = type === 'cgpa' ? '/tools/cgpa-convert' : type === 'school' ? '/tools/school-recommend' : type === 'copywriting' ? '/tools/copywriting' : '/tools/material-list';
    const { data } = await api.post(endpoint, payload);
    setResult(data);
  }

  return (
    <section>
      <div className="page-title"><div><h1>Agent 工具</h1><p>将留学咨询业务封装成可调用工具，记录输入、输出、耗时和状态。</p></div></div>
      <div className="two-col">
        <div className="panel">
          <h2>工具输入</h2>
          <form className="form-stack" onSubmit={(e) => callTool('school', e)}>
            <label>CGPA<input value={cgpa} onChange={(e) => setCgpa(e.target.value)} /></label>
            <label>目标国家<input value={country} onChange={(e) => setCountry(e.target.value)} /></label>
            <label>目标专业<input value={major} onChange={(e) => setMajor(e.target.value)} /></label>
            <div className="button-grid">
              <button type="button" onClick={() => callTool('cgpa')}>CGPA 换算</button>
              <button type="submit">院校推荐</button>
              <button type="button" onClick={() => callTool('copywriting')}>销售话术</button>
              <button type="button" onClick={() => callTool('material')}>材料清单</button>
            </div>
          </form>
        </div>
        <div className="panel">
          <h2>工具输出</h2>
          {result ? <pre>{JSON.stringify(result, null, 2)}</pre> : <p>请选择一个工具运行。</p>}
        </div>
      </div>
    </section>
  );
}
