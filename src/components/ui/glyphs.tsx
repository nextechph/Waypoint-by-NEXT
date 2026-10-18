/**
 * Waypoint glyphs — the app's replacement for an icon library.
 *
 * Waypoint's interface is typographic: actions are labelled with words, not pictograms.
 * Each export keeps the familiar icon name so call sites stay readable, but renders:
 *   • nothing, when it decorates a label or sits outside any control, or
 *   • a small typographic mark (×, +, →, "Edit" …) when it is the only content of a button.
 * Checkbox glyphs (Square / CheckSquare) render as a drawn box inside controls; Loader2 as a spinner.
 */
import React, { useLayoutEffect, useRef, useState } from 'react';

export interface GlyphProps {
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  [key: string]: unknown;
}

type Kind = 'mark' | 'word' | 'box' | 'box-checked' | 'spinner' | 'dot';

const CONTROL = 'button, a, [role="button"], [role="tab"], label, summary';

/** Text inside `root` that isn't one of our own glyph marks. */
function labelText(root: HTMLElement): string {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let out = '';
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!(n.parentElement?.closest('.wp-g'))) out += n.textContent || '';
  }
  return out.trim();
}

/**
 * A glyph only earns a visible mark when it is the sole content of a control
 * (an icon-only button). Next to a label, or outside any control, it is decoration.
 */
function shouldShow(el: HTMLElement, kind: Kind): boolean {
  const control = el.parentElement?.closest(CONTROL) as HTMLElement | null;
  if (!control) return false;
  if (kind === 'box' || kind === 'box-checked') return true;
  if (control.querySelector('img, input, select, textarea')) return false;
  return labelText(control) === '';
}

function Glyph({ text, kind, size = 14, color, className, style, title }: GlyphProps & { text: string; kind: Kind }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(kind === 'spinner');

  useLayoutEffect(() => {
    if (kind === 'spinner' || !ref.current) return;
    const next = shouldShow(ref.current, kind);
    setVisible(v => (v === next ? v : next));
    // A wrapper that exists only to frame a decorative icon (a tinted tile, a badge) collapses with it.
    const parent = ref.current.parentElement;
    if (parent && !parent.matches(CONTROL)) {
      const emptyFrame = !next && parent.children.length === 1 && labelText(parent) === '';
      if (emptyFrame) parent.setAttribute('data-wp-empty', '');
      else parent.removeAttribute('data-wp-empty');
    }
  });

  const px = typeof size === 'number' ? size : parseFloat(String(size)) || 14;
  const base: React.CSSProperties = { color, ...style };

  if (kind === 'box' || kind === 'box-checked') {
    return (
      <span
        ref={ref}
        className={`wp-g wp-g-box${kind === 'box-checked' ? ' checked' : ''}${className ? ` ${className}` : ''}`}
        style={{ ...base, width: px, height: px, display: visible ? undefined : 'none' }}
        data-hidden={visible ? undefined : ''}
        aria-hidden
      />
    );
  }
  if (kind === 'spinner') {
    return <span ref={ref} className={`wp-g wp-g-spinner${className ? ` ${className}` : ''}`} style={{ ...base, width: px, height: px }} aria-hidden />;
  }

  const fontSize = kind === 'word' ? Math.max(9.5, px * 0.72) : kind === 'dot' ? px : px * 1.15;
  return (
    <span
      ref={ref}
      className={`wp-g wp-g-${kind}${className ? ` ${className}` : ''}`}
      style={{ ...base, fontSize, display: visible ? undefined : 'none' }}
      data-hidden={visible ? undefined : ''}
      title={title}
      aria-hidden
    >
      {kind === 'dot' ? '' : text}
    </span>
  );
}

function make(text: string, kind: Kind = 'mark') {
  const C = (props: GlyphProps) => <Glyph {...props} text={text} kind={kind} />;
  C.displayName = `Glyph(${text || kind})`;
  return C;
}

/* Marks */
export const X = make('×');
export const XCircle = make('×');
export const Plus = make('+');
export const Check = make('✓');
export const CheckCircle2 = make('✓');
export const ChevronLeft = make('‹');
export const ChevronRight = make('›');
export const ChevronDown = make('▾');
export const ChevronUp = make('▴');
export const ChevronsLeft = make('«');
export const ChevronsRight = make('»');
export const ArrowLeft = make('←');
export const ArrowRight = make('→');
export const ArrowRightLeft = make('⇄');
export const ExternalLink = make('↗');
export const Maximize2 = make('↗');
export const MoreHorizontal = make('···');
export const RotateCcw = make('↺');
export const RotateCw = make('↻');
export const RefreshCw = make('↻');
export const ZoomIn = make('+');
export const ZoomOut = make('−');
export const AtSign = make('@');
export const AlertCircle = make('!');
export const AlertTriangle = make('!');
export const Info = make('i');

/* Words */
export const Menu = make('Menu', 'word');
export const Trash2 = make('×');
export const Pencil = make('Edit', 'word');
export const Edit3 = make('Edit', 'word');
export const Eye = make('Show', 'word');
export const EyeOff = make('Hide', 'word');
export const Search = make('Search', 'word');
export const Bell = make('Alerts', 'word');
export const Mail = make('Mail', 'word');
export const Inbox = make('Inbox', 'word');
export const Paperclip = make('Attach', 'word');
export const Link2 = make('Link', 'word');
export const Send = make('Send', 'word');
export const Copy = make('Copy', 'word');
export const Download = make('Download', 'word');
export const Upload = make('Upload', 'word');
export const Save = make('Save', 'word');
export const Settings = make('Settings', 'word');
export const Sliders = make('Settings', 'word');
export const LogOut = make('Sign out', 'word');
export const LogIn = make('Sign in', 'word');
export const Sun = make('Light', 'word');
export const Moon = make('Dark', 'word');
export const Filter = make('Filter', 'word');
export const Calendar = make('Date', 'word');
export const CalendarDays = make('Date', 'word');
export const CalendarCheck = make('Date', 'word');
export const CalendarRange = make('Dates', 'word');
export const Clock = make('Time', 'word');
export const Users = make('Team', 'word');
export const User = make('You', 'word');
export const UserPlus = make('Invite', 'word');
export const UserCheck = make('Assigned', 'word');
export const Image = make('Image', 'word');
export const Camera = make('Photo', 'word');
export const Crop = make('Crop', 'word');
export const Palette = make('Color', 'word');
export const Pipette = make('Pick', 'word');
export const Reply = make('Reply', 'word');
export const Tag = make('Label', 'word');
export const Move = make('Move', 'word');
export const Home = make('Home', 'word');
export const Crown = make('Owner', 'word');
export const Shield = make('Admin', 'word');
export const Lock = make('Lock', 'word');
export const KeyRound = make('Key', 'word');
export const Milestone = make('Roadmap', 'word');
export const KanbanSquare = make('Board', 'word');
export const FolderClosed = make('Projects', 'word');
export const MessageSquare = make('Notes', 'word');
export const File = make('File', 'word');
export const FileText = make('Doc', 'word');
export const FileArchive = make('Zip', 'word');
export const FileCode = make('Code', 'word');
export const FileSpreadsheet = make('Sheet', 'word');

/* Controls */
export const Square = make('', 'box');
export const CheckSquare = make('', 'box-checked');
export const Loader2 = make('', 'spinner');

/* Purely decorative pictograms: hidden next to a label, a quiet dot on their own. */
export const Activity = make('', 'dot');
export const AlignLeft = make('', 'dot');
export const BookOpen = make('', 'dot');
export const Briefcase = make('', 'dot');
export const Code = make('', 'dot');
export const Code2 = make('', 'dot');
export const Columns = make('', 'dot');
export const Cpu = make('', 'dot');
export const Crosshair = make('', 'dot');
export const Database = make('', 'dot');
export const Globe = make('', 'dot');
export const HardDrive = make('', 'dot');
export const Layers = make('', 'dot');
export const Layout = make('', 'dot');
export const Paintbrush = make('', 'dot');
export const Server = make('', 'dot');
export const ShieldCheck = make('', 'dot');
export const Smartphone = make('', 'dot');
export const Sparkles = make('', 'dot');
export const Zap = make('', 'dot');
