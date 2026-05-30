/**
 * Total Stock – Design System
 * Paleta extraída del logo: verde #5dc87a → teal #38a080
 */

export const colors = {
  // Brand
  primary:        '#5dc87a',
  primaryDark:    '#3ab87a',
  primaryDarker:  '#2a9668',
  teal:           '#38a080',
  tealDark:       '#1e8068',
  gradient:       'linear-gradient(135deg, #5dc87a 0%, #38a080 100%)',

  // Sidebar
  sidebarBg:      '#0f1e3a',
  sidebarHover:   '#1a2d52',
  sidebarActive:  'rgba(93, 200, 122, 0.14)',
  sidebarText:    '#e2e8f0',
  sidebarTextMuted: '#7a90b0',

  // Backgrounds
  bg:             '#f8fafc',
  surface:        '#ffffff',
  surfaceAlt:     '#f1f5f9',

  // Text
  text:           '#1a2926',
  textSecondary:  '#475569',
  textMuted:      '#94a3b8',

  // Borders
  border:         '#e2e8f0',
  borderLight:    '#f1f5f9',

  // Headings (home-consistent navy)
  heading:        '#1e3a8a',
  headingLight:   '#2563eb',

  // Status
  success:        '#5dc87a',
  successBg:      '#edfaf3',
  successBorder:  '#a8e6c5',
  successText:    '#1a6a40',

  danger:         '#e25252',
  dangerBg:       '#fef2f2',
  dangerBorder:   '#fca5a5',
  dangerText:     '#991b1b',
  dangerDark:     '#c53030',

  warning:        '#f59e0b',
  warningBg:      '#fffbeb',
  warningBorder:  '#fcd34d',
  warningText:    '#92400e',

  info:           '#3b9ede',
  infoBg:         '#eff6ff',
  infoBorder:     '#93c5fd',
  infoText:       '#1e4a8a',

  // Neutrals
  white:          '#ffffff',
  gray50:         '#f8fafc',
  gray100:        '#f1f5f9',
  gray200:        '#e2e8f0',
  gray300:        '#cbd5e1',
  gray400:        '#94a3b8',
  gray500:        '#64748b',
  gray600:        '#475569',
  gray700:        '#334155',
  gray800:        '#1e293b',
  gray900:        '#0f172a',
};

export const radius = {
  sm: '6px',
  md: '10px',
  lg: '16px',
  xl: '24px',
  full: '9999px',
};

export const shadow = {
  sm:  '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
  md:  '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.05)',
  lg:  '0 10px 30px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06)',
  xl:  '0 20px 50px rgba(0,0,0,0.12)',
  green: '0 4px 14px rgba(93,200,122,0.35)',
};

export const font = {
  sans: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
  mono: "source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace",
};

// ─── Shared component style factories ───────────────────────────────────────

export const btn = {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '9px 20px',
    borderRadius: radius.md,
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: font.sans,
    transition: 'all 0.18s ease',
    outline: 'none',
  },
  primary: {
    backgroundColor: colors.primary,
    color: '#fff',
    boxShadow: shadow.green,
  },
  primaryHover: {
    backgroundColor: colors.primaryDark,
  },
  secondary: {
    backgroundColor: colors.surface,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    boxShadow: shadow.sm,
  },
  danger: {
    backgroundColor: colors.danger,
    color: '#fff',
  },
  warning: {
    backgroundColor: colors.warning,
    color: '#fff',
  },
  info: {
    backgroundColor: colors.info,
    color: '#fff',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: colors.primary,
    border: `1.5px solid ${colors.primary}`,
  },
  sm: { padding: '6px 14px', fontSize: 13 },
  lg: { padding: '12px 28px', fontSize: 15 },
};

export const input = {
  base: {
    width: '100%',
    padding: '9px 12px',
    borderRadius: radius.md,
    border: `1.5px solid ${colors.border}`,
    fontSize: 14,
    fontFamily: font.sans,
    color: colors.text,
    backgroundColor: colors.surface,
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  },
};

export const card = {
  base: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    boxShadow: shadow.md,
    padding: '20px 24px',
    border: `1px solid ${colors.borderLight}`,
  },
  alt: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    border: `1px solid ${colors.border}`,
    padding: '20px 24px',
  },
};

export const badge = {
  success: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 10px', borderRadius: radius.full,
    fontSize: 12, fontWeight: 600,
    backgroundColor: colors.successBg, color: colors.successText,
    border: `1px solid ${colors.successBorder}`,
  },
  danger: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 10px', borderRadius: radius.full,
    fontSize: 12, fontWeight: 600,
    backgroundColor: colors.dangerBg, color: colors.dangerText,
    border: `1px solid ${colors.dangerBorder}`,
  },
  warning: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 10px', borderRadius: radius.full,
    fontSize: 12, fontWeight: 600,
    backgroundColor: colors.warningBg, color: colors.warningText,
    border: `1px solid ${colors.warningBorder}`,
  },
  info: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 10px', borderRadius: radius.full,
    fontSize: 12, fontWeight: 600,
    backgroundColor: colors.infoBg, color: colors.infoText,
    border: `1px solid ${colors.infoBorder}`,
  },
  neutral: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 10px', borderRadius: radius.full,
    fontSize: 12, fontWeight: 600,
    backgroundColor: colors.gray100, color: colors.gray600,
    border: `1px solid ${colors.border}`,
  },
};

export const table = {
  wrapper: {
    width: '100%', overflowX: 'auto',
    borderRadius: radius.lg, border: `1px solid ${colors.border}`,
    boxShadow: shadow.sm,
  },
  table: {
    width: '100%', borderCollapse: 'collapse',
    fontSize: 14, fontFamily: font.sans,
  },
  th: {
    padding: '11px 16px', textAlign: 'left',
    backgroundColor: colors.surfaceAlt, color: colors.textSecondary,
    fontWeight: 600, fontSize: 13,
    borderBottom: `2px solid ${colors.border}`,
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '11px 16px', color: colors.text,
    borderBottom: `1px solid ${colors.borderLight}`,
    verticalAlign: 'middle',
  },
  trHover: { backgroundColor: colors.gray50 },
};

export const alert = {
  success: {
    backgroundColor: colors.successBg, color: colors.successText,
    border: `1px solid ${colors.successBorder}`,
    borderRadius: radius.md, padding: '12px 16px', fontSize: 14,
  },
  danger: {
    backgroundColor: colors.dangerBg, color: colors.dangerText,
    border: `1px solid ${colors.dangerBorder}`,
    borderRadius: radius.md, padding: '12px 16px', fontSize: 14,
  },
  warning: {
    backgroundColor: colors.warningBg, color: colors.warningText,
    border: `1px solid ${colors.warningBorder}`,
    borderRadius: radius.md, padding: '12px 16px', fontSize: 14,
  },
  info: {
    backgroundColor: colors.infoBg, color: colors.infoText,
    border: `1px solid ${colors.infoBorder}`,
    borderRadius: radius.md, padding: '12px 16px', fontSize: 14,
  },
};
