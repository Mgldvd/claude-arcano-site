# Packages — APT / dpkg / Flatpak / repositories

Distinguish which of these it actually is before proposing anything — they look similar but need different fixes:

1. Stale/broken APT metadata (`apt update` errors)
2. Unreachable or removed repository
3. Repository signing/GPG key problem
4. Dependency conflict / unmet dependency
5. Held package (`apt-mark hold`)
6. Interrupted dpkg transaction (power loss, killed install)
7. Foreign/manually-installed `.deb` package
8. Third-party PPA/repo causing conflicts
9. Flatpak-specific issue (separate from APT entirely)
10. Genuinely corrupted/broken package files

## Evidence sequence (SAFE)

```
apt update                       # (needs root to write lists, but is non-destructive; note why sudo is used)
apt policy <pkg>
dpkg -l | grep <pkg>
dpkg --audit
apt-cache policy
cat /etc/apt/sources.list
ls /etc/apt/sources.list.d/
apt-mark showhold
systemctl status apt-daily.service apt-daily.timer
flatpak list
flatpak remote-list
```
Look for: 404s or GPG errors in `apt update` output (→ repo/signing issue), "held broken packages" (→ dependency conflict), packages in `dpkg -l` with a status other than `ii` (e.g. `iF`, `rc`, `pn`) (→ interrupted transaction or leftover config), a PPA added shortly before the symptom started.

## Minimal-fix ranking (least to most invasive)

1. `sudo apt update` alone, if metadata was simply stale — SAFE-adjacent CHANGE (only touches local package lists).
2. Fix a specific bad repo entry (comment out or correct one line) rather than replacing `sources.list` wholesale. **CHANGE** — back up the file first (`sudo cp /etc/apt/sources.list{,.bak-$(date +%Y%m%d)}`), show the exact line changed.
3. `sudo apt --fix-broken install` to resolve a genuine unmet-dependency state dpkg reports. **CHANGE** — explain what it will install/remove before running; if it proposes removing something unexpected (a kernel, `mint-meta-cinnamon`, `network-manager`, etc.), stop and flag it instead of proceeding.
4. `sudo dpkg --configure -a` to finish an interrupted transaction. **CHANGE** — safe in the specific case of an interrupted install; explain what "interrupted" evidence you saw.
5. Unhold a specific package (`sudo apt-mark unhold <pkg>`) only if you've confirmed *why* it was held and that unholding it is what the user wants. **CHANGE**.

## Never do casually (needs explicit per-command approval, and real evidence it's the actual fix)

- `apt purge` or broad `apt autoremove` — always run `apt autoremove --dry-run` or read the proposed removal list first, and never approve it if it lists a kernel image in use, `mint-meta-*`, `cinnamon*`, `network-manager*`, `xorg`, or any display-manager package.
- `dpkg --force-*` flags — these override dpkg's own safety checks; only after you understand exactly what check is being bypassed and why it's safe here.
- Removing the currently-running kernel package.
- Replacing `/etc/apt/sources.list` wholesale instead of editing the one bad line.
- Adding a third-party repo/PPA without the user confirming its source and purpose.
- `curl ... | apt-key add -` or any remote script piped into a privileged command — download the key/script, show it, get approval, then run it explicitly.

## Verification after a fix

`sudo apt update` clean run, `apt-cache policy <pkg>` shows expected version, `dpkg --audit` empty, and — if the original symptom was an app failing to launch or a missing feature — confirm that specific behavior now works.
