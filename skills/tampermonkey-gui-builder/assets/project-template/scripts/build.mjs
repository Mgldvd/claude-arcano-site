import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { parse } from 'yaml';

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const root = dirname(scriptsDirectory);
const modules = ['src/config.js', 'src/core.js', 'src/gui/settings.js', 'src/main.js'];

const [packageText, projectText, metadata, coreCss, guiCss, template, ...sources] =
  await Promise.all([
    readFile(resolve(root, 'package.json'), 'utf8'),
    readFile(resolve(root, '.config.yml'), 'utf8'),
    readFile(resolve(root, 'src/metadata.js'), 'utf8'),
    readFile(resolve(root, 'src/styles.css'), 'utf8'),
    readFile(resolve(root, 'src/gui/styles.css'), 'utf8'),
    readFile(resolve(root, 'src/gui/template.html'), 'utf8'),
    ...modules.map((path) => readFile(resolve(root, path), 'utf8')),
  ]);

const { version } = JSON.parse(packageText);
const project = parse(projectText);
const applicationName = project?.application?.name?.trim();
const applicationId = project?.application?.id?.trim();

if (
  !applicationName
  || /[\r\n]/.test(applicationName)
  || !/^(?!-)[a-z0-9-]{1,48}(?<!-)$/.test(applicationId || '')
) {
  throw new Error('Invalid application.name or application.id in .config.yml');
}
if (typeof version !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error('package.json version must be a valid semantic version');
}

const header = metadata
  .replaceAll('__VERSION__', version)
  .replaceAll('__APPLICATION_NAME__', applicationName)
  .replaceAll('__APPLICATION_ID__', applicationId);
const styles = `${coreCss.trim()}\n${guiCss.trim()}\n`;
const output = `${header.trim()}\n\n(() => {\n  'use strict';\n\nconst APP_STYLES = ${JSON.stringify(styles)};\nconst GUI_TEMPLATE = ${JSON.stringify(template.trim())};\n\n${sources.join('\n\n')}\n})();\n`;

if (/__[A-Z0-9_]+__/.test(output))
  throw new Error('The userscript contains an unresolved build token');

const destination = resolve(root, `dist/${applicationId}.user.js`);
new Script(output, { filename: destination });
await mkdir(dirname(destination), { recursive: true });
const temporaryDestination = `${destination}.${process.pid}.tmp`;
try {
  await writeFile(temporaryDestination, output, { flag: 'wx' });
  await rename(temporaryDestination, destination);
} finally {
  await rm(temporaryDestination, { force: true });
}
console.log(`Built ${destination} v${version}`);
