import {animateSpring} from './spring.mjs';

/** Native modal semantics plus explicit boundary focus wrapping and opener restoration. */
export function createDrawer({dialog, openButton, closeButton, initiallyOpen = false}) {
  if (dialog?.tagName !== 'DIALOG' || !openButton || !closeButton) throw new TypeError('Native dialog, open and close buttons required');
  let desiredOpen = false, disposed = false, initialized = false;
  let returnFocusTarget = openButton;
  const restoreFocus = () => {
    const target = returnFocusTarget?.isConnected && !returnFocusTarget.disabled ? returnFocusTarget : openButton;
    target.focus({preventScroll: true});
  };
  const savedStyle = {transform: dialog.style.transform, opacity: dialog.style.opacity};
  const motion = animateSpring(({value, settled}) => {
    dialog.style.transform = `translate3d(${(1 - value) * 100}%,0,0)`; dialog.style.opacity = String(Math.max(0, Math.min(1, value)));
    dialog.dataset.motionState = settled ? desiredOpen ? 'open' : 'closed' : desiredOpen ? 'opening' : 'closing';
    if (initialized && !desiredOpen && settled && dialog.open) {dialog.close(); restoreFocus();}
  }, {frequency: 3});
  initialized = true;
  const setOpen = value => {
    if (disposed) throw new Error('Drawer disposed'); desiredOpen = Boolean(value);
    if (desiredOpen && !dialog.open) {
      const active = dialog.ownerDocument.activeElement;
      returnFocusTarget = active && active !== dialog.ownerDocument.body && !dialog.contains(active) && typeof active.focus === 'function' ? active : openButton;
      dialog.showModal();
    }
    openButton.setAttribute('aria-expanded', String(desiredOpen)); motion.retarget(desiredOpen ? 1 : 0);
  };
  const open = () => setOpen(true), close = () => setOpen(false), cancel = event => {event.preventDefault(); close();};
  const externalClose = () => {if (dialog.open) return; desiredOpen = false; openButton.setAttribute('aria-expanded', 'false'); motion.retarget(0);};
  const keydown = event => {
    if (event.key !== 'Tab' || !dialog.open) return;
    const controls = [...dialog.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex],[contenteditable="true"]')]
      .filter(element => !element.matches(':disabled,[hidden]') && element.tabIndex >= 0 && element.getClientRects().length && element.checkVisibility({checkVisibilityCSS: true}))
      .sort((a, b) => (a.tabIndex || Infinity) - (b.tabIndex || Infinity));
    const active = dialog.ownerDocument.activeElement, first = controls[0], last = controls.at(-1);
    if (!first) {event.preventDefault(); dialog.focus(); return;}
    if (!controls.includes(active) || event.shiftKey && active === first || !event.shiftKey && active === last) {
      event.preventDefault(); (event.shiftKey ? last : first).focus();
    }
  };
  openButton.addEventListener('click', open); closeButton.addEventListener('click', close); dialog.addEventListener('cancel', cancel); dialog.addEventListener('close', externalClose); dialog.addEventListener('keydown', keydown); setOpen(initiallyOpen);
  return {setOpen, get state() {return {open: desiredOpen, ...motion.state};}, dispose() {if (disposed) return; disposed = true; motion.dispose(); openButton.removeEventListener('click', open); closeButton.removeEventListener('click', close); dialog.removeEventListener('cancel', cancel); dialog.removeEventListener('close', externalClose); dialog.removeEventListener('keydown', keydown); if (dialog.open) dialog.close(); Object.assign(dialog.style, savedStyle); openButton.setAttribute('aria-expanded', 'false');}};
}
