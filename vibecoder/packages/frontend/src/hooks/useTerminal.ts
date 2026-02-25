import { useCallback } from 'react';
import { useTabStore } from '../store/tabStore';
import { useTerminalStore } from '../store/terminalStore';

export function useTerminal() {
  const openTab = useTabStore((s) => s.openTab);
  const nextTerminalNumber = useTerminalStore((s) => s.nextTerminalNumber);
  const addSession = useTerminalStore((s) => s.addSession);

  const openNewTerminal = useCallback(() => {
    const num = nextTerminalNumber();
    const id = `terminal-${num}`;

    addSession(id, num);
    openTab({
      id,
      type: 'terminal',
      label: `Terminal ${num}`,
      closable: true,
    });
  }, [nextTerminalNumber, addSession, openTab]);

  return { openNewTerminal };
}
