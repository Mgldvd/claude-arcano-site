# Skills Directory

Índice de todos los skills disponibles en esta carpeta, con un tag de clasificación y el grupo de instalación recomendado.

## Tabla completa

| Folder | Skill Name | Tag | Grupo de instalación |
|---|---|---|---|
| agent-extension-pi-creator | agent-extension-pi-creator | `agent-extension` | D. Pi Extension Authoring ⚠️ |
| agent-extension-plugin-creator | agent-extension-plugin-creator | `agent-extension` | C. Codex Extension/Skill Authoring |
| agent-extension-skill-creator | agent-extension-skill-creator | `agent-extension` | C. Codex Extension/Skill Authoring |
| agent-extension-skill-family-organizer | agent-extension-skill-family-organizer | `agent-extension` | C. Codex Extension/Skill Authoring |
| agent-extension-skill-installer | agent-extension-skill-installer | `agent-extension` | C. Codex Extension/Skill Authoring |
| agentic-engineering-review-agent | agentic-engineering-review-agent | `code-review` | B. Agentic Engineering Workflow |
| agentic-engineering-review-loop | agentic-engineering-review-loop | `code-review` | B. Agentic Engineering Workflow |
| agentic-engineering-source-context | agentic-engineering-source-context | `research` | B. Agentic Engineering Workflow |
| agentic-engineering-structure-cleanup | agentic-engineering-structure-cleanup | `refactoring` | B. Agentic Engineering Workflow |
| agentic-engineering-workflow | agentic-engineering-workflow | `workflow` | B. Agentic Engineering Workflow (orquestador) |
| bash-scripting | bash-scripting | `shell` | Standalone |
| better-cli | better-cli | `cli` | Standalone |
| docs-readme-instructions | docs-readme-instructions | `docs` | G. Documentation & Memory ⚠️ |
| frontend-bem-css | frontend-bem-css | `css` | A. Frontend Web Stack |
| frontend-javascript-style-guide | frontend-javascript-style-guide | `javascript` | A. Frontend Web Stack |
| frontend-nuxt | frontend-nuxt | `nuxt` | A. Frontend Web Stack |
| frontend-responsive-mobile-first | frontend-responsive-mobile-first | `css` | A. Frontend Web Stack |
| frontend-style-guide | frontend-style-guide | `html-css` | A. Frontend Web Stack (base) |
| frontend-vue-style-guide | frontend-vue-style-guide | `vue` | A. Frontend Web Stack |
| frontend-web-performance | frontend-web-performance | `performance` | A. Frontend Web Stack |
| git-commit-no-ai | git-commit-no-ai | `git` | F. Git Commit & Attribution (fusionado ✅) |
| go-cobra-wails-cli | go-cobra-wails-cli | `go` | Standalone |
| imagegen | imagegen | `image-generation` | H. OpenAI Ecosystem |
| linux-mint-engineer | linux-mint-engineer | `sysadmin` | Standalone |
| memory-adr | memory-adr | `documentation` | G. Documentation & Memory |
| openai-docs | openai-docs | `openai` | H. OpenAI Ecosystem |
| pi-extension-creator | pi-extension-creator | `agent-extension` | D. Pi Extension Authoring ⚠️ |
| playwright-cli | playwright-cli | `browser-automation` | Standalone |
| readme-instructions | readme-instructions | `docs` | G. Documentation & Memory ⚠️ |
| tampermonkey | tampermonkey | `userscript` | E. Userscript Development |
| tampermonkey-gui-builder | tampermonkey-gui-builder | `userscript` | E. Userscript Development |
| taskfile | taskfile | `automation` | Standalone |

⚠️ = solapamiento/duplicado detectado, ver notas del grupo abajo. ✅ = ya fusionado en un solo skill.

## Grupos de instalación recomendados

### A. Frontend Web Stack
`frontend-style-guide` (base) + `frontend-bem-css` + `frontend-responsive-mobile-first` + `frontend-javascript-style-guide` + `frontend-vue-style-guide` + `frontend-nuxt` + `frontend-web-performance`

**Por qué juntos:** cada uno se declara explícitamente como "companion" de los demás en su propio SKILL.md (p. ej. `frontend-bem-css` dice "use `frontend-style-guide` para formato, `frontend-responsive-mobile-first` para responsive, `frontend-vue-style-guide` para Vue"). Instalar solo uno deja huecos que los otros están diseñados para cubrir.
**Instala parcial si:** no usas Vue/Nuxt, puedes omitir `frontend-vue-style-guide` y `frontend-nuxt`. `frontend-web-performance` es opcional si no vas a auditar rendimiento.

### B. Agentic Engineering Workflow
`agentic-engineering-workflow` (orquestador) + `agentic-engineering-source-context` + `agentic-engineering-structure-cleanup` + `agentic-engineering-review-agent` + `agentic-engineering-review-loop`

**Por qué juntos:** `agentic-engineering-workflow` menciona explícitamente que coordina a los otros cuatro como "companion skills" en cada fase (contexto → implementación → cleanup → review). Es un pipeline completo de feature dev con agentes; instalar solo el orquestador sin los demás lo deja citando skills que no existen.
**Instala parcial si:** solo necesitas el loop de revisión de PRs pequeños, basta con `agentic-engineering-review-agent` + `agentic-engineering-review-loop`.

### C. Codex Extension/Skill Authoring
`agent-extension-skill-creator` + `agent-extension-plugin-creator` + `agent-extension-skill-family-organizer` + `agent-extension-skill-installer`

**Por qué juntos:** son las herramientas meta para crear, empaquetar, organizar e instalar skills/plugins de Codex. Si vas a mantener tu propia colección de skills (como esta carpeta), los cuatro cubren el ciclo completo: crear → organizar en familias → empaquetar como plugin → instalar desde un repo externo.

### D. Pi Extension Authoring ⚠️ (elige uno, no ambos)
`agent-extension-pi-creator` vs `pi-extension-creator`

**Duplicado detectado:** ambos hacen lo mismo (crear extensiones del agente Pi: slash commands, tools, hooks). La única diferencia es que `agent-extension-pi-creator` permite instalación global además de local, mientras `pi-extension-creator` es solo project-local. Instalar los dos es redundante y puede generar confusión sobre cuál se activa. Recomendación: quédate con `agent-extension-pi-creator` (superset de funcionalidad) salvo que quieras forzar que nunca se toque configuración global.

### E. Userscript Development
`tampermonkey` + `tampermonkey-gui-builder`

**Por qué juntos:** `tampermonkey` cubre el ciclo general de desarrollo/debug/review de userscripts; `tampermonkey-gui-builder` es un patrón especializado para separar GUI (HTML/CSS/JS) del core y compilarlo en un solo archivo. Si tus userscripts nunca necesitan panel de settings/diálogos, `tampermonkey` solo basta.

### F. Git Commit & Attribution ✅ Fusionado
`git-commit-no-ai` (reemplaza a `git-commit` + `no-co-author`)

**Qué se hizo:** ambos skills cubrían el mismo flujo end-to-end (generar mensaje → commitear → opcionalmente pushear, garantizando cero atribución de IA), así que se fusionaron en un solo skill `git-commit-no-ai` en vez de mantenerlos como dos instalaciones separadas y coordinadas a mano.

**Qué incluye el skill fusionado:**
- Todo el flujo de `git-commit` (Conventional Commits, modos Message/Commit/Push, inspección del repo, detección de secretos).
- Las dos capas de `no-co-author`: la capa de comportamiento (instrucciones al agente) y la capa de enforcement infalible (`scripts/commit-msg`, hook de git que limpia cualquier trailer de IA antes de confirmar el commit, sin importar qué herramienta lo escribió).
- `scripts/install.sh` y `scripts/verify.sh`, `reference/patterns.md` y `reference/clean-history.md`, y las plantillas por herramienta (`templates/CLAUDE.md.snippet`, `.cursorrules.snippet`, `copilot-instructions.snippet`).
- La regla de "no atribución de IA" queda **reiterada en cada sección** del `SKILL.md` (setup, cada modo, build del mensaje, verificación de historial y el reporte final) en vez de aparecer una sola vez, para que sea imposible de pasar por alto en cualquier fase del flujo.

**Carpetas originales:** `git-commit/` y `no-co-author/` se dejaron intactas en disco (no se borraron sin confirmación); el skill activo a usar de aquí en adelante es `git-commit-no-ai/`.

### G. Documentation & Memory
`readme-instructions` vs `docs-readme-instructions` ⚠️ (elige uno) + `memory-adr`

**Duplicado detectado:** `readme-instructions` y `docs-readme-instructions` cubren lo mismo (escribir/actualizar README). `docs-readme-instructions` es más estricto — solo pasos en inglés, sin párrafos explicativos. `readme-instructions` permite algo más de estructura "GitHub-friendly". Instala solo el que se ajuste al estilo que prefieres; tenerlos ambos puede hacer que el agente dude cuál aplicar.
**`memory-adr`** es complementario, no duplicado: cubre memoria de decisiones (ADRs) + estado activo del proyecto, no la documentación de uso. Tiene sentido junto a cualquiera de los dos anteriores si quieres tanto README para usuarios como memoria para el propio agente.

### H. OpenAI Ecosystem
`openai-docs` + `imagegen`

**Por qué juntos:** `imagegen` tiene un modo CLI de fallback que depende de `OPENAI_API_KEY` y modelos de OpenAI; `openai-docs` es la referencia autoritativa para esos mismos modelos/APIs. Si generas imágenes con el modo built-in únicamente (sin CLI/API), `openai-docs` es opcional.

### Standalone (instalar individualmente según necesidad)
`bash-scripting`, `better-cli`, `taskfile`, `playwright-cli`, `go-cobra-wails-cli`, `linux-mint-engineer`

Estos no declaran dependencias ni companions entre sí ni con el resto de la colección — cada uno resuelve un dominio autocontenido (scripting, diseño de CLIs, automatización de tareas, testing de browser, un stack específico Go+Wails, o soporte de sistema Linux Mint). Instálalos solo cuando el proyecto los necesite.

## Notas generales

- Los tags con más de un skill (`css`, `agent-extension`, `docs`, `git`, `userscript`) indican candidatos naturales a agruparse; los grupos arriba lo hacen explícito con el motivo real (companions declarados, mismo dominio, o duplicado).
- Los ⚠️ marcan pares que probablemente no deberían coexistir tal cual — no por incompatibilidad técnica, sino porque cubren el mismo caso de uso con matices distintos, y tenerlos ambos activos puede hacer ambigua la selección de skill.
