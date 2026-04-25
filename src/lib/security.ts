export const initSecurity = () => {
  if (import.meta.env.DEV) return;

  // 1. Disabling Right-Click
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  // 2. Shortcut Blocking
  document.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+Shift+J, Ctrl+U
    if (e.ctrlKey && (e.shiftKey || e.key.toLowerCase() === 'u')) {
      const key = e.key.toLowerCase();
      if (
        key === 'i' ||
        key === 'c' ||
        key === 'j' ||
        key === 'u'
      ) {
        e.preventDefault();
        return false;
      }
    }
  });

  // 3. Locking the Console (Black & Empty)
  const lockConsole = () => {
    // Save original log to use it for the blackout effect
    const originalLog = console.log;

    // Clear the console immediately
    console.clear();

    // Style for the blacked-out effect
    const style = 'color: transparent; font-size: 1000px; background: #000; padding: 100%;';

    // Continuous clearing loop
    setInterval(() => {
      console.clear();
      // Use a huge console log with background to make the console appear "black"
      originalLog('%c ', style);
    }, 100);

    // Override common console methods to prevent output
    const noop = () => {};
    // @ts-ignore
    console.log = console.info = console.warn = console.error = console.debug = console.table = noop;
  };
  lockConsole();

  // 4. The Debugger Trap
  const debuggerTrap = () => {
    const loop = () => {
      // Use an eval-based debugger or function constructor to make it harder to disable
      (function() {
        return false;
      })
      ['constructor']('debugger')
      ['call']();
      setTimeout(loop, 50);
    };
    loop();
  };
  debuggerTrap();

};
