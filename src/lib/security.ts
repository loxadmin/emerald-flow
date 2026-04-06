export const initSecurity = () => {
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

  // 5. Detect DevTools and Replace with Math Equations
  const detectDevTools = () => {
    // Threshold is set slightly higher to reduce false positives from sidebars
    const threshold = 200;
    const checkSize = () => {
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;

      if (widthDiff || heightDiff) {
        // Only replace if DevTools are likely open (size difference is substantial)
        document.body.innerHTML = `
          <div style="height: 100vh; display: flex; align-items: center; justify-content: center; background: white; color: black; font-family: 'Times New Roman', serif; font-size: 2rem; padding: 2rem; text-align: center; overflow-y: auto;">
            <div>
              <p>∫ x dx = x²/2 + C</p>
              <p>e^(iπ) + 1 = 0</p>
              <p>∇ · B = 0</p>
              <p>∇ × E = -∂B/∂t</p>
              <p>f(x) = ∑ (a_n cos(nπx/L) + b_n sin(nπx/L))</p>
              <p>a² + b² = c²</p>
              <p>E = mc²</p>
              <p>∮ E · dA = Q/ε₀</p>
              <p>iħ ∂ψ/∂t = Ĥψ</p>
            </div>
          </div>
        `;
      }
    };
    window.addEventListener('resize', checkSize);
    // Periodically check in case DevTools is toggled without resizing window
    setInterval(checkSize, 1000);
    checkSize();
  };
  detectDevTools();
};
