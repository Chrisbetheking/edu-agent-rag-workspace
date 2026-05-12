export const countryOptions = [
  '英国', '澳洲', '新加坡', '香港', '加拿大', '美国', '新西兰', '爱尔兰', '荷兰', '德国', '法国', '瑞典', '丹麦', '芬兰', '瑞士', '日本', '韩国', '马来西亚', '澳门', '意大利', '西班牙'
];

export const majorOptions = [
  '计算机科学', '数据科学', '人工智能', '软件工程', '网络安全', '信息系统', '商业分析', '金融科技', '电子电气工程', '机械工程', '土木工程', '生物医学工程', '统计学', '数学', '金融', '会计', '经济学', '管理学', '市场营销', '传媒', '教育学', '心理学', '法律', '设计', '建筑', '公共政策', '供应链管理'
];

export const degreeOptions = ['硕士', '本科', '博士', '预科', '语言班'];

export const budgetOptions = [
  '15万人民币以内', '20万人民币', '25万人民币', '30万人民币', '35万人民币', '40万人民币', '50万人民币以上', '预算待定'
];

export const languageTypeOptions = ['IELTS', 'TOEFL', 'PTE', 'Duolingo', '暂无'];

export const platformOptions = ['小红书 + 微信私域', '短视频 + 微信私域', '朋友圈 + 私聊跟进', '官网表单 + 电话跟进', '展会线索 + 微信跟进', '小红书 + 短视频 + 微信私域'];

export const angleOptions = [
  'GPA 不算高，但项目经历可以补强',
  '预算有限，需要优先考虑性价比',
  '目标专业热门，需要尽早规划材料',
  '跨专业申请，需要证明课程和项目匹配',
  '想尽快拿到稳妥录取，需要分层投递',
  '家长更关注排名和安全性，需要解释方案逻辑'
];

export function buildLanguage(type: string, score: string) {
  const t = (type || '').trim();
  const s = (score || '').trim();
  if (!t || t === '暂无') return '暂未考试';
  return s ? `${t} ${s}` : t;
}
