// src/utils/phoneIntl.ts
export type CountryCode = 'BR' | 'US' | 'PT' | 'MX' | 'AR' | 'CL';

export function onlyDigits(s: string) {
  return (s || '').replace(/\D+/g, '');
}

type Cfg = {
  code: string;          // DDI (com +)
  min: number;           // mínimo de dígitos NACIONAIS (sem DDI)
  max: number;           // máximo de dígitos NACIONAIS (sem DDI)
  format: (nat: string) => string; // como exibir nacional (com espaços)
};

const cfgs: Record<CountryCode, Cfg> = {
  // Brasil: DDD (2) + local (8 ou 9)
  BR: {
    code: '+55',
    min: 10,
    max: 11,
    format: (nat: string) => {
      const d = onlyDigits(nat).slice(0, 11);
      const ddd = d.slice(0, 2);
      const rest = d.slice(2);
      if (!ddd) return '';
      if (rest.length <= 4) return `${ddd} ${rest}`.trim();
      if (rest.length === 8) return `${ddd} ${rest.slice(0, 4)} ${rest.slice(4)}`.trim();
      // 9 dígitos: 1 + 4 + 4 (ex.: 9 9163 0277)
      return `${ddd} ${rest.slice(0, 1)} ${rest.slice(1, 5)} ${rest.slice(5, 9)}`.trim();
    }
  },

  // EUA: área (3) + local (7) → 3 3 4
  US: {
    code: '+1',
    min: 10,
    max: 10,
    format: (nat: string) => {
      const d = onlyDigits(nat).slice(0, 10);
      const a = d.slice(0,3), b = d.slice(3,6), c = d.slice(6,10);
      if (!a) return '';
      if (!b) return a;
      if (!c) return `${a} ${b}`.trim();
      return `${a} ${b} ${c}`.trim();
    }
  },

  // Portugal: 9 dígitos → 3 3 3
  PT: {
    code: '+351',
    min: 9,
    max: 9,
    format: (nat: string) => {
      const d = onlyDigits(nat).slice(0, 9);
      const a = d.slice(0,3), b = d.slice(3,6), c = d.slice(6,9);
      if (!a) return '';
      if (!b) return a;
      if (!c) return `${a} ${b}`.trim();
      return `${a} ${b} ${c}`.trim();
    }
  },

  // México: 10 dígitos → 2 4 4 (ex.: 55 1234 5678)
  MX: {
    code: '+52',
    min: 10,
    max: 10,
    format: (nat: string) => {
      const d = onlyDigits(nat).slice(0, 10);
      const a = d.slice(0,2), b = d.slice(2,6), c = d.slice(6,10);
      if (!a) return '';
      if (!b) return a;
      if (!c) return `${a} ${b}`.trim();
      return `${a} ${b} ${c}`.trim();
    }
  },

  // Argentina: 10 dígitos → 3 3 4 (simplificado)
  AR: {
    code: '+54',
    min: 10,
    max: 10,
    format: (nat: string) => {
      const d = onlyDigits(nat).slice(0, 10);
      const a = d.slice(0,3), b = d.slice(3,6), c = d.slice(6,10);
      if (!a) return '';
      if (!b) return a;
      if (!c) return `${a} ${b}`.trim();
      return `${a} ${b} ${c}`.trim();
    }
  },

  // Chile: 9 dígitos → 1 4 4 (ex.: 9 6123 4567)
  CL: {
    code: '+56',
    min: 9,
    max: 9,
    format: (nat: string) => {
      const d = onlyDigits(nat).slice(0, 9);
      const a = d.slice(0,1), b = d.slice(1,5), c = d.slice(5,9);
      if (!a) return '';
      if (!b) return a;
      if (!c) return `${a} ${b}`.trim();
      return `${a} ${b} ${c}`.trim();
    }
  },
};

export function countryCfg(country: CountryCode) {
  return cfgs[country];
}

export function limitNat(country: CountryCode, natDigits: string) {
  const cfg = countryCfg(country);
  return onlyDigits(natDigits).slice(0, cfg.max);
}

export function validNat(country: CountryCode, natDigits: string) {
  const cfg = countryCfg(country);
  const n = onlyDigits(natDigits);
  return n.length >= cfg.min && n.length <= cfg.max;
}

// formata SÓ o número nacional (sem DDI, do jeito que se digita)
export function formatNat(country: CountryCode, natDigits: string) {
  const cfg = countryCfg(country);
  const nat = limitNat(country, natDigits);
  return cfg.format(nat);
}

// placeholder nacional por país
export function natPlaceholder(country: CountryCode) {
  switch (country) {
    case 'BR': return '99 9 9999 9999';
    case 'US': return '415 555 2671';
    case 'PT': return '912 345 678';
    case 'MX': return '55 1234 5678';
    case 'AR': return '221 123 4567';
    case 'CL': return '9 6123 4567';
    default: return '';
  }
}

// Mantemos para envio ao backend (E.164)
export function formatIntl(country: CountryCode, natDigits: string) {
  const cfg = countryCfg(country);
  const nat = limitNat(country, natDigits);
  const natFmt = cfg.format(nat);
  return [cfg.code, natFmt].filter(Boolean).join(' ');
}

export function toE164(country: CountryCode, natDigits: string) {
  const cfg = countryCfg(country);
  const n = limitNat(country, natDigits);
  return `${cfg.code}${n}`;
}
