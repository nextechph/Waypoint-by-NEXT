/**
 * Waypoint icon set, backed by Phosphor (https://phosphoricons.com).
 *
 * Components import icons by their familiar names (X, Plus, Calendar, Trash2 …) from this
 * module; each one renders the matching Phosphor icon. Icons draw in `currentColor`, so
 * they follow the surrounding text colour and stay monochrome.
 */
import React from 'react';
import * as P from '@phosphor-icons/react';
import type { Icon as PhosphorIcon, IconWeight } from '@phosphor-icons/react';

export interface IconProps {
  size?: number | string;
  color?: string;
  /** Accepted for call-site compatibility: heavier strokes map to Phosphor's bold weight. */
  strokeWidth?: number | string;
  weight?: IconWeight;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  [key: string]: unknown;
}

function make(Glyph: PhosphorIcon, displayName: string) {
  const C = ({ size = 16, color, strokeWidth, weight, className, style, title, ...rest }: IconProps) => (
    <Glyph
      {...(rest as Record<string, unknown>)}
      size={size}
      color={color}
      weight={weight ?? (Number(strokeWidth) >= 2.5 ? 'bold' : 'regular')}
      className={className ? `wp-icon ${className}` : 'wp-icon'}
      style={style}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    />
  );
  C.displayName = displayName;
  return C;
}

/* Actions and navigation */
export const X = make(P.X, 'X');
export const XCircle = make(P.XCircle, 'XCircle');
export const Plus = make(P.Plus, 'Plus');
export const Check = make(P.Check, 'Check');
export const CheckCircle2 = make(P.CheckCircle, 'CheckCircle2');
export const ChevronLeft = make(P.CaretLeft, 'ChevronLeft');
export const ChevronRight = make(P.CaretRight, 'ChevronRight');
export const ChevronDown = make(P.CaretDown, 'ChevronDown');
export const ChevronUp = make(P.CaretUp, 'ChevronUp');
export const ChevronsLeft = make(P.CaretDoubleLeft, 'ChevronsLeft');
export const ChevronsRight = make(P.CaretDoubleRight, 'ChevronsRight');
export const ArrowLeft = make(P.ArrowLeft, 'ArrowLeft');
export const ArrowRight = make(P.ArrowRight, 'ArrowRight');
export const ArrowRightLeft = make(P.ArrowsLeftRight, 'ArrowRightLeft');
export const ExternalLink = make(P.ArrowSquareOut, 'ExternalLink');
export const Maximize2 = make(P.ArrowsOut, 'Maximize2');
export const MoreHorizontal = make(P.DotsThree, 'MoreHorizontal');
export const RotateCcw = make(P.ArrowCounterClockwise, 'RotateCcw');
export const RotateCw = make(P.ArrowClockwise, 'RotateCw');
export const RefreshCw = make(P.ArrowsClockwise, 'RefreshCw');
export const ZoomIn = make(P.MagnifyingGlassPlus, 'ZoomIn');
export const ZoomOut = make(P.MagnifyingGlassMinus, 'ZoomOut');
export const Menu = make(P.List, 'Menu');
export const Trash2 = make(P.Trash, 'Trash2');
export const Pencil = make(P.PencilSimple, 'Pencil');
export const Edit3 = make(P.PencilSimpleLine, 'Edit3');
export const Eye = make(P.Eye, 'Eye');
export const EyeOff = make(P.EyeSlash, 'EyeOff');
export const Search = make(P.MagnifyingGlass, 'Search');
export const Filter = make(P.Funnel, 'Filter');
export const Copy = make(P.Copy, 'Copy');
export const Download = make(P.DownloadSimple, 'Download');
export const Upload = make(P.UploadSimple, 'Upload');
export const Save = make(P.FloppyDisk, 'Save');
export const Send = make(P.PaperPlaneRight, 'Send');
export const Reply = make(P.ArrowBendUpLeft, 'Reply');
export const Move = make(P.ArrowsOutCardinal, 'Move');
export const LogOut = make(P.SignOut, 'LogOut');
export const LogIn = make(P.SignIn, 'LogIn');

/* Status */
export const AtSign = make(P.At, 'AtSign');
export const AlertCircle = make(P.WarningCircle, 'AlertCircle');
export const AlertTriangle = make(P.Warning, 'AlertTriangle');
export const Info = make(P.Info, 'Info');
export const Bell = make(P.Bell, 'Bell');
export const Clock = make(P.Clock, 'Clock');
export const Square = make(P.Square, 'Square');
export const CheckSquare = make(P.CheckSquare, 'CheckSquare');
export const Loader2 = make(P.CircleNotch, 'Loader2');

/* Objects */
export const Mail = make(P.EnvelopeSimple, 'Mail');
export const Inbox = make(P.Tray, 'Inbox');
export const Paperclip = make(P.Paperclip, 'Paperclip');
export const Link2 = make(P.LinkSimple, 'Link2');
export const Settings = make(P.GearSix, 'Settings');
export const Sliders = make(P.Sliders, 'Sliders');
export const Sun = make(P.Sun, 'Sun');
export const Moon = make(P.Moon, 'Moon');
export const Calendar = make(P.CalendarBlank, 'Calendar');
export const CalendarDays = make(P.CalendarDots, 'CalendarDays');
export const CalendarCheck = make(P.CalendarCheck, 'CalendarCheck');
export const CalendarRange = make(P.CalendarDots, 'CalendarRange');
export const Users = make(P.Users, 'Users');
export const User = make(P.User, 'User');
export const UserPlus = make(P.UserPlus, 'UserPlus');
export const UserCheck = make(P.UserCheck, 'UserCheck');
export const Image = make(P.Image, 'Image');
export const Camera = make(P.Camera, 'Camera');
export const Crop = make(P.Crop, 'Crop');
export const Palette = make(P.Palette, 'Palette');
export const Pipette = make(P.Eyedropper, 'Pipette');
export const Tag = make(P.Tag, 'Tag');
export const Home = make(P.House, 'Home');
export const Crown = make(P.Crown, 'Crown');
export const Shield = make(P.Shield, 'Shield');
export const ShieldCheck = make(P.ShieldCheck, 'ShieldCheck');
export const Lock = make(P.Lock, 'Lock');
export const KeyRound = make(P.Key, 'KeyRound');
export const Milestone = make(P.Flag, 'Milestone');
export const KanbanSquare = make(P.Kanban, 'KanbanSquare');
export const FolderClosed = make(P.Folders, 'FolderClosed');
export const MessageSquare = make(P.ChatCircle, 'MessageSquare');
export const File = make(P.File, 'File');
export const FileText = make(P.FileText, 'FileText');
export const FileArchive = make(P.FileArchive, 'FileArchive');
export const FileCode = make(P.FileCode, 'FileCode');
export const FileSpreadsheet = make(P.FileXls, 'FileSpreadsheet');
export const Activity = make(P.Pulse, 'Activity');
export const AlignLeft = make(P.TextAlignLeft, 'AlignLeft');
export const BookOpen = make(P.BookOpen, 'BookOpen');
export const Briefcase = make(P.Briefcase, 'Briefcase');
export const Code = make(P.Code, 'Code');
export const Code2 = make(P.CodeSimple, 'Code2');
export const Columns = make(P.Columns, 'Columns');
export const Cpu = make(P.Cpu, 'Cpu');
export const Crosshair = make(P.Crosshair, 'Crosshair');
export const Database = make(P.Database, 'Database');
export const Globe = make(P.Globe, 'Globe');
export const HardDrive = make(P.HardDrive, 'HardDrive');
export const Layers = make(P.Stack, 'Layers');
export const Layout = make(P.Layout, 'Layout');
export const Paintbrush = make(P.PaintBrush, 'Paintbrush');
export const Server = make(P.HardDrives, 'Server');
export const Smartphone = make(P.DeviceMobile, 'Smartphone');
export const Sparkles = make(P.Sparkle, 'Sparkles');
export const Zap = make(P.Lightning, 'Zap');

/* Extra Phosphor icons used by Waypoint's own screens */
export const Path = make(P.Path, 'Path');
export const Target = make(P.Target, 'Target');
export const Plant = make(P.Plant, 'Plant');
export const ListChecks = make(P.ListChecks, 'ListChecks');
export const Kanban = make(P.Kanban, 'Kanban');
export const Flag = make(P.Flag, 'Flag');
export const ChatCircle = make(P.ChatCircle, 'ChatCircle');
export const SquaresFour = make(P.SquaresFour, 'SquaresFour');
export const Lightning = make(P.Lightning, 'Lightning');
export const ArrowUpRight = make(P.ArrowUpRight, 'ArrowUpRight');
export const Command = make(P.Command, 'Command');
export const Person = make(P.UserCircle, 'Person');
