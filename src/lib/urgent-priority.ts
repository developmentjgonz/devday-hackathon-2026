export type UrgentCategory = 'Injury' | 'Pregnancy' | 'Kittens' | 'Feeder gap' | 'Urgent review';
export function urgentCategory(message: string, flags: readonly string[] = []): UrgentCategory {
  const facts = new Set(flags.map(flag => flag.toLowerCase()));
  // Preserve source facts before inspecting language-dependent display text.
  if (facts.has('injury')) return 'Injury';
  if (facts.has('pregnancy')) return 'Pregnancy';
  if (facts.has('kittens')) return 'Kittens';
  if (facts.has('feeder_gap')) return 'Feeder gap';
  const text = message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/injur|limp|bleed|wound|hurt|cojea|cojear|mancando|ferid|machuc|sangra|\bblese\b|\bbwete\b|san ap koule/.test(text)) return 'Injury';
  if (/pregnan|belly.*larger|prenad|gestante|gravida|\bansent\b/.test(text)) return 'Pregnancy';
  if (/kitten|gatit|filhote|\bti chat\b/.test(text)) return 'Kittens';
  if (/feeder.*(gap|lost|available)|no feeder|sin alimentador|sem alimentador|pa gen (moun|volonte).*bay manje/.test(text)) return 'Feeder gap';
  return 'Urgent review';
}
export function sourceFlags(value?: string | null): string[] {
  try { const parsed:unknown = JSON.parse(value ?? '[]'); return Array.isArray(parsed) ? parsed.filter((flag):flag is string => typeof flag === 'string') : []; }
  catch { return []; }
}
