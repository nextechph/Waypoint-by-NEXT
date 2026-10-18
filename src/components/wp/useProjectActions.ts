import { useCallback } from 'react';
import { useWorkStore } from '../../store/useWorkStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { useConfirmStore } from '../../store/useConfirmStore';
import { isBoardOwner } from '../../lib/workspace';
import type { Board } from '../../types';

/** Rename / recolor / delete-or-leave flows shared by the Projects page and project header. */
export function useProjectActions() {
  const user = useAuthStore(s => s.user);
  const renameBoard = useWorkStore(s => s.renameBoard);
  const updateBoardColor = useWorkStore(s => s.updateBoardColor);
  const deleteBoard = useWorkStore(s => s.deleteBoard);
  const deleteBoards = useWorkStore(s => s.deleteBoards);
  const leaveBoard = useWorkStore(s => s.leaveBoard);
  const showToast = useToastStore(s => s.showToast);
  const showConfirm = useConfirmStore(s => s.showConfirm);

  const kind = (b: Board) => (b.type === 'roadmap' ? 'roadmap' : 'board');

  const rename = useCallback((board: Board, name: string) => {
    const next = name.trim();
    if (!next || next === board.name) return;
    renameBoard(board.id, next);
    showToast(`Renamed to "${next}"`, 'success');
  }, [renameBoard, showToast]);

  const recolor = useCallback((board: Board, color: string) => {
    updateBoardColor(board.id, color);
  }, [updateBoardColor]);

  const removeOrLeave = useCallback((board: Board, onDone?: () => void) => {
    if (isBoardOwner(board, user?.email)) {
      showConfirm({
        title: `Delete "${board.name}"?`,
        message: `This permanently deletes the ${kind(board)} with all of its columns, tasks and comments. This can't be undone.`,
        confirmText: board.type === 'roadmap' ? 'Delete Roadmap' : 'Delete Board',
        variant: 'danger',
        icon: 'trash',
        onConfirm: () => {
          deleteBoard(board.id);
          showToast(`Deleted "${board.name}"`, 'info');
          onDone?.();
        },
      });
    } else if (user?.email) {
      const email = user.email;
      showConfirm({
        title: `Leave "${board.name}"?`,
        message: `You'll need a new invite from the owner to rejoin this ${kind(board)}.`,
        confirmText: 'Leave',
        variant: 'danger',
        icon: 'logout',
        onConfirm: () => {
          leaveBoard(board.id, email);
          showToast(`You left "${board.name}"`, 'info');
          onDone?.();
        },
      });
    }
  }, [user?.email, showConfirm, deleteBoard, leaveBoard, showToast]);

  const removeMany = useCallback((list: Board[], onDone?: () => void) => {
    const owned = list.filter(b => isBoardOwner(b, user?.email));
    if (!owned.length) {
      showToast('You can only delete projects you own', 'warning');
      return;
    }
    const n = owned.length;
    showConfirm({
      title: `Delete ${n} ${n === 1 ? 'project' : 'projects'}?`,
      message: `This permanently deletes ${n === 1 ? 'the selected project' : `all ${n} selected projects`} and everything in ${n === 1 ? 'it' : 'them'}. This can't be undone.${owned.length < list.length ? ' Projects you don’t own are skipped.' : ''}`,
      confirmText: `Delete ${n}`,
      variant: 'danger',
      icon: 'trash',
      onConfirm: () => {
        deleteBoards(owned.map(b => b.id));
        showToast(`Deleted ${n} ${n === 1 ? 'project' : 'projects'}`, 'info');
        onDone?.();
      },
    });
  }, [user?.email, showConfirm, deleteBoards, showToast]);

  return { rename, recolor, removeOrLeave, removeMany };
}
