/**
 * TubeVault Anti-Theft & Security Guard
 * Copyright © Jenish Patel. All rights reserved.
 * 
 * Features:
 * 1. Blocks Right-Click (Context Menu)
 * 2. Blocks Developer Inspection Shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+S)
 * 3. Disables Dragging of Images / Logos
 * 4. Anti-DevTools Debugger Trap
 * 5. Console Protection & Warning Banner
 */

export const initSecurityGuard = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // 1. Console Security Warning for anyone attempting to open DevTools
  try {
    const bannerStyle = 'color: #ff1a2b; font-size: 24px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);';
    const subStyle = 'color: #ffffff; font-size: 14px; font-weight: bold; background: #0c1017; padding: 4px 8px; border-radius: 4px;';
    console.log('%cSTOP! TUBEVAULT PROTECTED SYSTEM', bannerStyle);
    console.log('%cThis application code and architecture are proprietary and owned by JENISH PATEL. Reverse engineering, cloning, or scraping is strictly prohibited.', subStyle);
  } catch (e) {
    // Ignore
  }

  // 2. Disable Right-Click Context Menu
  document.addEventListener('contextmenu', (e: MouseEvent) => {
    // Allow right click on input fields so user can paste video links
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return;
    }
    e.preventDefault();
  }, { capture: true });

  // 3. Block Developer Tools & Source Inspection Keyboard Shortcuts
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    // F12 (DevTools)
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      return false;
    }

    // Ctrl + Shift + I (Inspect Element) or Ctrl + Shift + J (Console) or Ctrl + Shift + C
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      return false;
    }

    // Ctrl + U (View Page Source)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
      e.preventDefault();
      return false;
    }

    // Ctrl + S (Save Page / Download HTML assets)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      return false;
    }
  }, { capture: true });

  // 4. Prevent Dragging of Images / Logos
  document.addEventListener('dragstart', (e: DragEvent) => {
    const target = e.target as HTMLElement;
    if (target && target.tagName === 'IMG') {
      e.preventDefault();
    }
  }, { capture: true });

  // 5. Anti-Debugging loop in production (slows down reverse-engineering tools)
  if (import.meta.env.PROD) {
    setInterval(() => {
      const startTime = performance.now();
      debugger;
      const endTime = performance.now();
      if (endTime - startTime > 100) {
        // DevTools opened and paused execution
        console.clear();
      }
    }, 2000);
  }
};
