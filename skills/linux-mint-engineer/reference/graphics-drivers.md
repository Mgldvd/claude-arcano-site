# Graphics & drivers

Identify hardware and current state before recommending any driver install/removal — never suggest a driver swap generically.

## Evidence sequence (SAFE)

```
lspci -k | grep -EA3 'VGA|3D|Display'
inxi -G
glxinfo -B                          # needs mesa-utils; note if not installed
echo $XDG_SESSION_TYPE               # x11 or wayland
loginctl show-session $(loginctl | grep $(whoami) | awk '{print $1}') -p Type
journalctl -b -p err --grep='(?i)drm|nvidia|amdgpu|i915|Xorg'
cat /var/log/Xorg.0.log 2>/dev/null | grep -iE 'error|EE'
nvidia-smi                           # only if NVIDIA proprietary driver is in use
```
Establish: exact GPU(s) (single, hybrid Optimus, etc.), which kernel driver is bound (`i915`/`amdgpu`/`nouveau`/`nvidia`), session type (X11 vs Wayland), and what specifically fails (crash, wrong resolution, tearing, black screen, Cinnamon falling back to software rendering).

## Ranked causes to consider

- Cinnamon session crash/freeze often traces to a specific applet/extension, not the GPU driver — check `~/.cinnamon/glass.log` and `journalctl --user -b` for `cinnamon` before touching drivers.
- Wrong/missing proprietary NVIDIA driver after a kernel update (DKMS module didn't rebuild) — check `dkms status`.
- Hybrid graphics (Optimus) misconfiguration — check `prime-select query` if present.
- Wayland-specific glitches on an NVIDIA system — Mint's Cinnamon Wayland session support is newer/less mature than X11; switching the session type at the login screen is a SAFE, fully reversible diagnostic step worth trying before any driver change.
- Resolution/scaling issues are usually a Cinnamon Display settings / xrandr config issue, not a driver bug.

## Minimal fixes, in order of invasiveness

1. Try the other session type (X11 ↔ Wayland) at the login screen — SAFE, no system change, isolates whether the compositor/session is the variable.
2. Restart Cinnamon (`Alt+F2` → `r` → `Enter` in X11; full re-login required on Wayland) — SAFE, no persistent change.
3. Disable one specific Cinnamon applet/extension/theme suspected from evidence, via Cinnamon Settings — CHANGE, but trivially reversible (re-enable it).
4. `sudo dkms status` then `sudo dkms autoinstall` if a DKMS module (e.g. `nvidia`) shows as not built for the running kernel — **CHANGE**, explain it rebuilds the existing driver's kernel module, doesn't install anything new.
5. Install/change the recommended driver via Mint's Driver Manager (`mintdrivers` / `driver-manager` — the actual supported tool for Mint, not raw `apt install nvidia-*` first) only after confirming which driver generation matches the hardware. **CHANGE** — explain the switch, that a previous driver may need explicit removal, and that a black screen on next boot is the main risk (mention the recovery path: `Ctrl+Alt+F3` to a TTY, or boot the previous kernel/driver via GRUB advanced options).

## Needs explicit approval, never assumed safe

- Removing the currently-active display driver.
- `apt purge` of `xserver-xorg*`, `nvidia-*`, or `mesa*` packages.
- Editing `/etc/X11/xorg.conf` (rarely needed on modern Mint; most config is driver-managed) — if genuinely required, show the exact diff against the existing file, preserving unrelated sections.
- Blacklisting a kernel module (e.g. `nouveau`) via a modprobe.d file — explain this persists across reboots and is reversed by deleting the blacklist file + `update-initramfs -u`.

## Verification

Confirm the session starts cleanly, `journalctl -b -p err` no longer shows the driver/DRM error, and the original symptom (crash, wrong resolution, tearing) is gone. If a driver change was made and the next boot is the real test, say so plainly rather than declaring success before reboot.
