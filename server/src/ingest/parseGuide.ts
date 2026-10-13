// Parses one exported roadmap guide (Markdown) into structured records.
// The guides share a regular shape: `# NN – Title`, `## Overview`, a concepts
// checklist, tiered reading lists under `### Start here / Core / Deep dive`,
// free-form cheat-sheet sections, and numbered practice questions.
import { createHash } from 'node:crypto';

export type Tier = 'start' | 'core' | 'deep' | 'other';

export interface GuideItem {
  id: string;
  tier: Tier;
  section: string;
  title: string;
  url: string | null;
  estMinutes: number | null;
  note: string;
  md: string;
  ord: number;
}

export interface Concept {
  id: string;
  term: string;
  md: string;
  ord: number;
}

export interface GlossaryEntry {
  id: string;
  term: string;
  section: string;
  md: string;
  ord: number;
}

export interface Question {
  id: string;
  md: string;
  ord: number;
}

export interface PlanWeek {
  id: string;
  label: string;
  md: string;
  guideNumbers: number[];
  ord: number;
}

export interface Section {
  heading: string;
  md: string;
  ord: number;
}

export interface ParsedGuide {
  number: number;
  slug: string;
  title: string;
  subtitle: string;
  overview: string;
  tag: string;
  sections: Section[];
  items: GuideItem[];
  concepts: Concept[];
  glossary: GlossaryEntry[];
  questions: Question[];
  planWeeks: PlanWeek[];
}

export const GUIDE_TAGS: Record<number, string> = {
  0: 'Roadmap',
  1: 'AI Engineering',
  2: 'Cybersecurity',
  3: 'Systems',
  4: 'Frontend & Tooling',
  5: 'Stack Critique',
  6: 'Culture',
  7: 'News',
};

export const stableId = (...parts: string[]) =>
  createHash('sha1').update(parts.join('\u0000')).digest('hex').slice(0, 12);

const BULLET = /^\s*-\s+(.*)$/;
const NUMBERED = /^\s*\d+\.\s+(.*)$/;
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/;
const BOLD = /\*\*(.+?)\*\*/;
const TIME = /\((\d+)(?:\s*[–-]\s*\d+)?\s*(min|hr)/;

const isConcepts = (h: string) => /^Concepts you should/i.test(h);
const isQuestions = (h: string) => /^Practice/i.test(h);
const isPlan = (h: string) => /^Suggested .*plan/i.test(h);
const isGlossary = (h: string) => /jokes and sayings|slang|stereotypes/i.test(h);
// Sections whose link-less bullets are still things to read (e.g. books).
const isReading = (h: string) => /reading list|essays|history/i.test(h);
// Sections whose bullets are advice, not things to read, even when they contain links.
const isNotReading = (h: string) => /^Routine$/i.test(h);

/** Strips Markdown emphasis, links and escapes down to plain text. */
export function plain(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*|\*|__/g, '')
    .replace(/\\([\\[\]_~&*])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function tierOf(h3: string): Tier {
  if (/^Start here/i.test(h3)) return 'start';
  if (/^Core/i.test(h3)) return 'core';
  if (/^Deep dive/i.test(h3)) return 'deep';
  return 'other';
}

function parseItem(md: string, slug: string, tier: Tier, section: string, ord: number): GuideItem {
  const link = md.match(LINK);
  const bold = md.match(BOLD);
  let title: string;
  let boldNote: string | null = null;
  if (link && link.index !== undefined && (!bold || link.index <= (bold.index ?? 0) + 2)) {
    title = plain(link[1]);
  } else if (bold) {
    // e.g. `***AI Engineering*** **– Chip Huyen**: note` or `**Label:** note`
    const sep = md.match(/(?::\*\*|\*\*:|:)\s+/);
    title = plain(sep?.index !== undefined ? md.slice(0, sep.index) : md);
    if (sep?.index !== undefined) boldNote = md.slice(sep.index + sep[0].length);
  } else {
    title = plain(md);
  }
  // Mainstream-journalism style bullets list several plain links: use them all as the title.
  if (!bold && link) {
    const texts = [...md.matchAll(/\[([^\]]+)\]\(/g)].map((m) => m[1]);
    if (texts.length > 1) title = texts.join(', ');
  }
  const time = md.match(TIME);
  const estMinutes = time ? Number(time[1]) * (time[2] === 'hr' ? 60 : 1) : null;
  const noteMatch = md.match(/(?:\)|\*\*)(?:\s*\([^)]*\))?:\s+(.*)$/);
  const note = boldNote ?? (noteMatch ? noteMatch[1] : '');
  const url = link ? link[2] : null;
  return {
    id: stableId(slug, url ?? title),
    tier,
    section,
    title,
    url,
    estMinutes,
    note,
    md,
    ord,
  };
}

export function parseGuide(markdown: string, fileName: string): ParsedGuide {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const slug = fileName.replace(/\.md$/, '');
  const h1 = lines.find((l) => l.startsWith('# ')) ?? `# ${slug}`;
  const titleFull = h1.slice(2).trim();
  const num = Number(titleFull.match(/^(\d+)/)?.[1] ?? slug.match(/^(\d+)/)?.[1] ?? 99);
  const title = titleFull.replace(/^\d+\s*[–-]\s*/, '');

  const guide: ParsedGuide = {
    number: num,
    slug,
    title,
    subtitle: '',
    overview: '',
    tag: GUIDE_TAGS[num] ?? 'Other',
    sections: [],
    items: [],
    concepts: [],
    glossary: [],
    questions: [],
    planWeeks: [],
  };

  let h2 = '';
  let h3 = '';
  let sectionLines: string[] = [];
  const seenItems = new Set<string>();

  const flushSection = () => {
    if (!h2) return;
    const md = sectionLines.join('\n').trim();
    if (/^(Overview|What this folder is for)$/i.test(h2)) guide.overview = md;
    guide.sections.push({ heading: h2, md, ord: guide.sections.length });
    sectionLines = [];
  };

  for (const line of lines) {
    if (line.startsWith('# ')) continue;
    if (line.startsWith('## ')) {
      flushSection();
      h2 = line.slice(3).trim();
      h3 = '';
      continue;
    }
    if (!h2) {
      const sub = line.trim().match(/^\*(.+)\*$/);
      if (sub) guide.subtitle = sub[1];
      continue;
    }
    sectionLines.push(line);
    if (line.startsWith('### ')) {
      h3 = line.slice(4).trim();
      continue;
    }

    const bullet = line.match(BULLET)?.[1];
    const numbered = line.match(NUMBERED)?.[1];

    if (isConcepts(h2) && bullet) {
      const term = plain(bullet.split(/:\s/)[0]).slice(0, 120);
      guide.concepts.push({ id: stableId(slug, 'concept', term), term, md: bullet, ord: guide.concepts.length });
    } else if (isQuestions(h2) && numbered) {
      guide.questions.push({ id: stableId(slug, 'q', plain(numbered)), md: numbered, ord: guide.questions.length });
    } else if (isPlan(h2) && bullet) {
      const label = plain(bullet.match(BOLD)?.[1] ?? bullet).replace(/:$/, '');
      const refs = new Set<number>();
      for (const m of bullet.matchAll(/(?:\(|guide\s+)(\d{2})\)?/gi)) refs.add(Number(m[1]));
      guide.planWeeks.push({
        id: stableId(slug, 'week', label),
        label,
        md: bullet,
        guideNumbers: [...refs],
        ord: guide.planWeeks.length,
      });
    } else if (isGlossary(h2) && bullet) {
      const term = plain(bullet.match(BOLD)?.[1] ?? bullet.split(':')[0]).replace(/[.:]$/, '');
      guide.glossary.push({ id: stableId(slug, 'gloss', term), term, section: h2, md: bullet, ord: guide.glossary.length });
    } else if (bullet && guide.number !== 0 && !isNotReading(h2) && (LINK.test(bullet) || (isReading(h2) && BOLD.test(bullet)))) {
      const item = parseItem(bullet, slug, h3 ? tierOf(h3) : 'other', h3 || h2, guide.items.length);
      if (seenItems.has(item.id)) continue; // same link listed twice in one guide
      seenItems.add(item.id);
      guide.items.push(item);
    }
  }
  flushSection();
  return guide;
}
