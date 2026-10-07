# Security — permissions, users/groups, encryption, Secure Boot, firewall, auth

The rule that overrides everything else in this file: never weaken a security control just to make an error message disappear. If a fix would reduce security (disable Secure Boot, open a firewall port, loosen permissions, disable a check), the disclosure must name the security tradeoff explicitly, consider whether a narrower alternative exists, and get explicit approval that acknowledges the tradeoff — not just the surface symptom fix.

## Evidence sequence (SAFE)

```
id <user>
groups <user>
ls -la <path>                       # exact permissions, not a guess
stat <path>
getfacl <path>                      # if ACLs are in play
sudo ufw status verbose
systemctl is-enabled apparmor       # if in use
mokutil --sb-state                  # Secure Boot status (UEFI)
lsblk -f                            # look for crypto_LUKS filesystype
last -n 20                          # recent logins
journalctl -u ssh -p err            # if ssh is in use
```
Establish exactly which permission/user/security-control state is actually wrong before proposing a change — "permission denied" has causes ranging from a simple ownership mismatch to an ACL, an AppArmor profile, or a mount option (`noexec`, `ro`).

## Permissions and ownership

**Minimal fix:** correct the specific file/directory's mode or owner with a scoped, non-recursive command once the correct target and correct mode/owner are confirmed (e.g., compare against a sibling file that works correctly, or the package's expected mode). **CHANGE.**

**Needs explicit approval, never assumed safe:**
- Any recursive `chmod -R`/`chown -R` — scope to the exact path(s) that are actually wrong; recursive changes on a broad directory (especially `/`, `/home`, `/etc`, `/usr`) risk breaking unrelated permissions system-wide and are very hard to fully reverse.
- Changing ownership/permissions on anything under `/etc`, `/usr`, `/var/lib/dpkg`, or other package-managed paths — these should come from the package, not manual chmod; if a package's file has wrong permissions, that's evidence of a broken install (see `packages.md`), not a chmod target.

## Users and groups

Adding a user to a group (`usermod -aG <group> <user>`) is CHANGE, reversible (`gpasswd -d`), and low-risk. **Needs explicit approval, never assumed safe:** deleting a user or group (`userdel`, `groupdel` — data loss risk for that user's files/crontab if `-r`/force flags are involved), and any password or authentication change (`passwd`, PAM config, SSH key changes) — these directly gate system access; confirm intent very explicitly and never suggest them to "fix" an unrelated symptom.

## Encryption (LUKS)

Never propose an encryption or key change without the user raising it directly and understanding the consequence: a botched LUKS header/key change can make an entire encrypted volume permanently unreadable. `cryptsetup luksHeaderBackup` (SAFE, read-only export) before any LUKS operation is worth suggesting proactively. `cryptsetup luksFormat`, key slot changes, and header operations are all DANGEROUS/DESTRUCTIVE — full disclosure, verified device, explicit approval, every time.

## Secure Boot

Changing Secure Boot state is a firmware-level, hard-to-reverse-remotely change with real security tradeoffs (it exists specifically to block unsigned bootkits/rootkits). Only relevant when a driver (commonly proprietary NVIDIA DKMS modules) genuinely requires it disabled or MOK-enrolled. Prefer MOK enrollment (`mokutil --import`, keeps Secure Boot on) over disabling it outright when the driver supports signed modules. Disabling Secure Boot entirely is DANGEROUS-tier by consequence even though the command itself is a firmware setting change outside Linux — explain the tradeoff and get explicit approval before walking the user through it.

## Firewall (ufw)

Read current rules before changing any (`ufw status verbose` / `ufw status numbered`). Adding a specific allow rule for a confirmed need is CHANGE, low-risk, reversible (`ufw delete <rule>`). **Needs explicit approval:** disabling ufw entirely, or any rule change that could remove the user's own remote access to the machine (e.g., an SSH allow rule) — state this risk explicitly if the machine is administered remotely.

## Verification

Re-check the specific permission/access state with the same read-only command that revealed the problem (`ls -la`, `id`, `ufw status`, `mokutil --sb-state`) and confirm only the intended scope changed — nothing broader.
