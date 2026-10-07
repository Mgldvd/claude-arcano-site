let applicationState = { value: '' };

/** Returns an immutable snapshot for GUI rendering. */
const getApplicationState = () => ({ ...applicationState });

/** Validates and stores a value supplied by the GUI. */
const saveApplicationState = async ({ value }) => {
  applicationState = { value: String(value).trim() };
  return getApplicationState();
};
