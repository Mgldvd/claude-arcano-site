# Performance — CPU, memory, disk I/O, thermal

Determine the actual bottleneck before proposing anything — "the system is slow" has too many distinct causes to guess at.

## Evidence sequence (SAFE)

```
uptime                              # load average vs. core count
free -h                             # memory + swap pressure
vmstat 1 5
top -b -n1 | head -30               # or: ps aux --sort=-%cpu | head -15
ps aux --sort=-%mem | head -15
iostat -xz 1 3                      # needs sysstat; note if not installed
df -h                                # capacity, not just usage
sensors                              # needs lm-sensors; thermal state
journalctl -k --grep='(?i)thermal|throttl'
systemctl list-units --type=service --state=running
```
Look for: load average persistently above core count (CPU-bound), high `%wa` in `vmstat`/`top` (I/O-bound), swap actively in use with low free memory (memory pressure), one process dominating `%CPU` or `%MEM` (runaway process), near-full filesystem (capacity, which also degrades performance well before 100%), thermal throttling in `sensors`/kernel log.

## Ranked causes to consider

1. A specific runaway or misbehaving process (browser tab, indexer, backup job) — most common, cheapest to confirm and fix.
2. Low free RAM forcing swap use on a system with slow storage.
3. A near-full disk (filesystems get slow well before `df` shows 100%; also breaks unrelated things).
4. Thermal throttling on a laptop with blocked vents/failing fan.
5. A background service/timer (indexing, `mintupdate` check, backup) coinciding with the reported slow period — cross-reference with `journalctl` around that time.
6. Genuine hardware bottleneck (spinning disk, insufficient RAM for workload) — a real conclusion only after the above are ruled out, not a first guess.

## Minimal fixes, in order of invasiveness

1. Identify and close/kill the specific offending user-level process — CHANGE only if it's a `kill`/`kill -9`, and only after confirming it's safe to end (not a critical system process) and telling the user what will be lost (unsaved work in that app).
2. Free disk space by identifying what's actually consuming it (`du -sh` on suspect directories, `journalctl --disk-usage`, `apt clean` for the APT cache) rather than a generic "clean up files" pass. `journalctl --vacuum-size=` and `apt clean` are CHANGE but low-risk and easily justified with evidence of their actual disk usage.
3. Disable one specific identified startup application/service via Cinnamon's Startup Applications or `systemctl --user disable <unit>` — CHANGE, reversible, do only for the one confirmed culprit.
4. Swap/swappiness tuning — only after confirming genuine memory pressure is the bottleneck; explain the tradeoff (more swap use vs. more OOM risk) before changing `/etc/sysctl.conf` or swapfile size. **CHANGE**, back up the config line first.

## Needs explicit approval, never assumed safe

- Killing a process without confirming what it is and that ending it is safe (never blind-kill by resource usage alone).
- Deleting files to free space without showing the user exactly what's being removed and why it's safe (never a generic "clean everything" pass).
- Disabling a service that turns out to be boot- or network-critical — cross-check against `security.md`'s boot/network service list before disabling anything found via a performance investigation.

## Verification

Re-run the same measurement (`uptime`, `free -h`, `top`) under the same conditions that showed the problem, and confirm the specific bottleneck metric has actually improved — not just that the killed process is gone.
