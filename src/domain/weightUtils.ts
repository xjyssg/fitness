/** 解析重量字符串，提取前/后缀和数值，如 "两边各7.5kg" → "两边各" + "7.5" + "kg" */
export function parseWeight(weight: string): { prefix: string; suffix: string; number: string; isKg: boolean } {
  // 匹配: [可选中文前缀] + 数字 + "kg" + [可选中文后缀]
  const match = weight.match(/^([一-龥]*)\s*([\d.]+)\s*kg\s*([一-龥]*)$/);
  if (match) return { prefix: match[1], suffix: match[3], number: match[2], isKg: true };
  return { prefix: '', suffix: '', number: weight, isKg: false };
}

/** 从前缀+数值构建完整重量字符串 */
export function buildWeight(prefix: string, suffix: string, number: string): string {
  const trimmed = number.trim();
  if (!trimmed) return prefix + suffix || '';
  return `${prefix}${trimmed}kg${suffix}`;
}

/** 去掉中文前缀和后缀，只保留数字+kg */
export function simplifyWeight(weight: string): string {
  return weight.replace(/^[一-龥]+/, '').replace(/[一-龥]+$/, '');
}

/** 提取纯数值，用于输入框 */
export function weightToNumber(weight: string): string {
  const { number, isKg } = parseWeight(weight);
  return isKg ? number : weight;
}
