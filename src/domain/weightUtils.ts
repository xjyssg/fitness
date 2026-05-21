/** 自重、心率等非 kg 值，保持原文不追加 kg */
const NON_KG_VALUES = new Set(['自重', '至力竭']);

export function displayWeight(weight: string): string {
  if (!weight || NON_KG_VALUES.has(weight)) return weight;
  const num = parseFloat(weight);
  if (isNaN(num)) return weight; // e.g., "心率130-140"
  return `${weight}kg`;
}

export function normalizeWeight(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || NON_KG_VALUES.has(trimmed)) return trimmed;
  // strip any trailing "kg" the user might have typed
  return trimmed.replace(/kg$/i, '').trim();
}
