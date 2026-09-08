/** Injects the combined page and GUI styles once. */
const ensureStyles = () => {
  if (document.getElementById(CONFIG.styleId)) return;
  const style = document.createElement('style');
  style.id = CONFIG.styleId;
  style.textContent = APP_STYLES;
  document.documentElement.append(style);
};

const settingsGui = createSettingsGui({
  getState: getApplicationState,
  save: saveApplicationState,
});

/** Initializes the application without duplicating persistent UI. */
const initialize = () => {
  ensureStyles();
  settingsGui.mountControl();
};

initialize();
