import {animateSpring} from './spring.mjs';

/** A native modal dialog supplies focus containment, Escape and inert background. */
export function createDrawer({dialog, openButton, closeButton, initiallyOpen = false, returnFocus}) {
  if (dialog?.tagName !== 'DIALOG' || !openButton || !closeButton) throw new TypeError('Native dialog, open and close buttons required');
  let desiredOpen = false, disposed = false, initialized = false;
  const savedStyle = {transform: dialog.style.transform, opacity: dialog.style.opacity};
  const motion = animateSpring(({value, settled}) => {
    dialog.style.transform = `translate3d(${(1 - value) * 100}%,0,0)`; dialog.style.opacity = String(Math.max(0, Math.min(1, value)));
    dialog.dataset.motionState = settled ? desiredOpen ? 'open' : 'closed' : desiredOpen ? 'opening' : 'closing';
    if (initialized && !desiredOpen && settled && dialog.open) {dialog.close(); (returnFocus?.() || openButton).focus();}
  }, {frequency: 3});
  initialized = true;
  const setOpen = value => {
    if (disposed) throw new Error('Drawer disposed'); desiredOpen = Boolean(value);
    if (desiredOpen && !dialog.open) dialog.showModal();
    openButton.setAttribute('aria-expanded', String(desiredOpen)); motion.retarget(desiredOpen ? 1 : 0);
  };
  const open = () => setOpen(true), close = () => setOpen(false), cancel = event => {event.preventDefault(); close();};
  const externalClose = () => {if (dialog.open) return; desiredOpen = false; openButton.setAttribute('aria-expanded', 'false'); motion.retarget(0);};
  openButton.addEventListener('click', open); closeButton.addEventListener('click', close); dialog.addEventListener('cancel', cancel); dialog.addEventListener('close', externalClose); setOpen(initiallyOpen);
  return {setOpen, get state() {return {open: desiredOpen, ...motion.state};}, dispose() {if (disposed) return; disposed = true; motion.dispose(); openButton.removeEventListener('click', open); closeButton.removeEventListener('click', close); dialog.removeEventListener('cancel', cancel); dialog.removeEventListener('close', externalClose); if (dialog.open) dialog.close(); Object.assign(dialog.style, savedStyle); openButton.setAttribute('aria-expanded', 'false');}};
}
