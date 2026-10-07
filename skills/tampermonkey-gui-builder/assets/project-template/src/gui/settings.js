/** Creates the settings GUI using only the supplied application contract. */
const createSettingsGui = ({ getState, save }) => {
  /** Removes the current settings overlay. */
  const close = () => document.getElementById(CONFIG.overlayId)?.remove();

  /** Opens one settings overlay and safely renders the current state. */
  const open = () => {
    close();
    const overlay = document.createElement('div');
    overlay.id = CONFIG.overlayId;
    overlay.innerHTML = GUI_TEMPLATE;

    const input = overlay.querySelector('[data-field="value"]');
    const status = overlay.querySelector('[data-role="status"]');
    if (!(input instanceof HTMLInputElement) || !(status instanceof HTMLElement)) return;

    input.value = getState().value;

    /** Handles actions delegated from GUI buttons. */
    const handleClick = async (event) => {
      const action = event.target instanceof HTMLElement ? event.target.dataset.action : undefined;
      if (event.target === overlay || action === 'close') close();
      if (action !== 'save') return;

      try {
        await save({ value: input.value });
        close();
      } catch (error) {
        console.error('[GUI Application]', error);
        status.textContent = 'Unable to save settings.';
      }
    };

    overlay.addEventListener('click', handleClick);
    document.body.append(overlay);
    input.focus();
  };

  /** Adds one persistent control that opens the settings GUI. */
  const mountControl = () => {
    if (!document.body || document.getElementById(CONFIG.controlId)) return;
    const button = document.createElement('button');
    button.id = CONFIG.controlId;
    button.type = 'button';
    button.textContent = 'Settings';
    button.addEventListener('click', open);
    document.body.append(button);
  };

  /** Removes every persistent GUI element. */
  const teardown = () => {
    close();
    document.getElementById(CONFIG.controlId)?.remove();
  };

  return { open, close, mountControl, teardown };
};
