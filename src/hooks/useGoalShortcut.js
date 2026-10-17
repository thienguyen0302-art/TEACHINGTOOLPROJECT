import { useEffect } from 'react';

/**
 * Hook lắng nghe phím tắt toàn cục 'G' để bật/tắt modal mục tiêu
 * Tự động bỏ qua nếu người dùng đang nhập văn bản trong input/textarea/editor
 */
export function useGoalShortcut(onToggle) {
  useEffect(() => {
    function handleKeyDown(e) {
      // Nếu bấm cùng Ctrl/Cmd hoặc đang gõ chữ trong form
      if (e.ctrlKey || e.metaKey) return;

      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isEditable =
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeTag === 'select' ||
        document.activeElement?.isContentEditable ||
        document.activeElement?.closest?.('.monaco-editor');

      if (isEditable) return;

      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        onToggle();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggle]);
}

export default useGoalShortcut;
