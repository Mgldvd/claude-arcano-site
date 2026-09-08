# Boot, storage & filesystems

Boot problems and storage problems get the same rule: collect logs and identify the exact device/config *before* touching GRUB, initramfs, kernels, EFI entries, partitions, or fstab. These are the highest-consequence category — a wrong write here can make the system unbootable or destroy data.

## Device identity is sacrosanct

Never infer a target from a device name alone. `/dev/sda` on one machine is `/dev/nvme0n1` on another, and neither is "probably the right one." Before any write-capable storage command:

```
lsblk -f
findmnt
df -h
sudo blkid
cat /proc/partitions
```
State, explicitly, in the disclosure: the exact device path, its filesystem, its mount point, its size, and — as best determined from evidence — whether it holds user data. If this can't be established from SAFE commands alone, say so and stop rather than guessing.

## Boot problems

Evidence first, always, before any GRUB/kernel/initramfs/EFI change:

```
journalctl -b -1 -p err          # errors from the previous boot, if it completed
journalctl -b -p err             # current boot
systemctl --failed
cat /boot/grub/grub.cfg | head -50   # inspect, don't edit yet
efibootmgr -v                        # UEFI systems only
ls /boot/
uname -r
dpkg -l | grep linux-image
```
Look for: the specific unit/service that failed, whether it's the same kernel that worked before, whether GRUB even shows the expected boot entries, disk errors in the journal around boot time.

**Ranked causes to consider, most to least common:** a recent kernel update left a broken initramfs or DKMS module failure (esp. proprietary NVIDIA); a failed/hung systemd unit blocking boot; a filesystem mount failure (bad fstab entry, missing/renamed device); GRUB config drift after a dual-boot OS install; genuine disk failure (check SMART — see below — before assuming software).

**Minimal fixes, in order of invasiveness:**
1. Boot the previous working kernel from the GRUB menu (no system change at all) to confirm it's kernel-specific — pure diagnostic, not a fix, but narrows the hypothesis a lot.
2. Fix one specific bad line in `/etc/fstab` or a systemd unit override, with a timestamped backup first, rather than regenerating configs wholesale. **CHANGE.**
3. `sudo update-initramfs -u` for the specific affected kernel version only, once you know an initramfs is actually stale/broken. **CHANGE** — explain that this rebuilds the boot image for one kernel and is reversible by rebuilding again or booting an older kernel.
4. `sudo update-grub` only after confirming a config/detection issue (e.g. a new OS not showing in the menu) — this rewrites `grub.cfg` but does not touch the installed bootloader itself. **CHANGE** — still requires disclosure and approval; explain what triggers the regen and that the previous `grub.cfg` isn't kept unless backed up first.

**DANGEROUS — explicit approval required immediately before, never pre-approved by policy:**
- `grub-install` (rewrites the actual bootloader on the disk) — only after boot-mode (BIOS/UEFI) and target disk are confirmed, and only if evidence shows the bootloader itself (not just its config) is the problem.
- Any edit to `/etc/fstab` beyond the one verified line, or replacing it wholesale.
- Removing a kernel package, especially the currently-running one or the only remaining kernel.
- Any EFI boot-entry deletion (`efibootmgr -b ... -B`).
- Secure Boot state changes — see `security.md`.

## Storage & filesystems

```
lsblk -f
df -h
findmnt
sudo smartctl -a /dev/<verified-device>     # needs smartmontools; explain if not installed
journalctl -k | grep -iE 'error|fail' | tail -50
```
SMART errors, remounts-as-read-only in the journal, or I/O errors point to failing hardware — a filesystem repair will not fix failing hardware, and running one on a drive that's actively failing can make data recovery harder. Say this explicitly if SMART data suggests it, and suggest a data backup as the first priority over any repair.

**DANGEROUS — never pre-approved, always full disclosure with verified device identity first:**
- `mkfs.*` (any formatting)
- `fsck` in write/repair mode (`-y`/`-p` without `-n`) on a mounted or otherwise critical filesystem — prefer `fsck -n` (check-only) first and show its output before ever proposing a write-mode repair
- `parted`/`fdisk`/`gdisk` operations that create, delete, or resize partitions
- `dd` targeting any block device
- `wipefs`, `shred`, or any disk-wipe utility
- LUKS/encryption changes (`cryptsetup luksFormat`, key changes) — see `security.md`

**Mint-specific note:** Timeshift is installed by default and is the standard rollback mechanism. Before any boot- or filesystem-affecting CHANGE, ask whether a Timeshift snapshot exists or should be taken first — `sudo timeshift --list` is SAFE and worth checking early in any boot-related investigation.

## Verification

For boot fixes: reboot (with the user's awareness) and confirm the system reaches the desktop; check `systemctl --failed` is empty; check `journalctl -b -p err` for the new boot shows the specific error gone. For storage fixes: re-run `df -h`/`lsblk -f` and confirm the filesystem mounts cleanly and the original symptom (e.g., "drive not showing up," "read-only remount") is gone.
