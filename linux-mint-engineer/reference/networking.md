# Networking — Wi-Fi, Ethernet, DNS, routing, firewall, Bluetooth

Distinguish the actual layer before proposing anything — resetting all networking config when the problem is narrow (e.g., just DNS) is the failure mode to avoid here.

## Evidence sequence (SAFE)

```
nmcli general status
nmcli device status
nmcli connection show
nmcli connection show <active-profile>
ip a
ip r
rfkill list
resolvectl status                    # or: cat /etc/resolv.conf
ss -tulpn
sudo ufw status verbose               # firewall state, if ufw is in use
journalctl -b -u NetworkManager -p err
```
Look for: is the interface up and has an IP (link/DHCP layer), is default route present (routing layer), does `resolvectl status` show working DNS servers (DNS layer), is `rfkill` showing a soft/hard block (radio layer), is the right profile even active (NetworkManager profile layer).

## Layer-by-layer discrimination

- **Radio off**: `rfkill list` shows `Soft blocked: yes` → SAFE fix: `rfkill unblock wifi` (or the Mint keyboard Wi-Fi toggle) — CHANGE but trivially reversible and low-risk.
- **No IP / DHCP failure**: interface up but no address from `ip a` → check driver bound (`lspci -k`/`lsusb` for the adapter), then try `nmcli connection up <profile>` (CHANGE, reversible) before touching the profile config itself.
- **DNS-only problem** (sites fail to resolve but `ping 1.1.1.1` works): don't touch NetworkManager device state — the fix is scoped to `resolvectl`/the connection's DNS setting.
- **Routing problem** (has IP, no default route, or wrong gateway): check `ip r`, compare to what DHCP should have handed out.
- **Driver/firmware missing**: `dmesg | grep -iE 'firmware|wlan|wifi'` after confirming the adapter is even detected (`lspci`/`lsusb`).
- **VPN/proxy interference**: check `nmcli connection show` for an active VPN profile, `env | grep -i proxy`.
- **Firewall blocking**: `ufw status verbose` shows a deny rule matching the symptom.

## Minimal fixes, in order of invasiveness

1. `rfkill unblock wifi` / toggle airplane mode — CHANGE, reversible, no data risk.
2. `nmcli connection up <profile>` to reconnect an existing profile — CHANGE, no config alteration.
3. Fix one field of an existing connection profile (`nmcli connection modify <profile> ipv4.dns "1.1.1.1"`, etc.) rather than deleting and recreating it — CHANGE, show the exact field changed and how to revert it (`nmcli connection modify <profile> ipv4.dns ""` to clear back to DHCP-provided, e.g.).
4. Restart NetworkManager (`sudo systemctl restart NetworkManager`) only if evidence points to the service itself being wedged, not the config — CHANGE, briefly drops all connections, say so.

## Needs explicit approval, never assumed safe

- `nmcli connection delete` — destroys a saved profile (including any saved Wi-Fi password) with no built-in undo; confirm it's not needed elsewhere first.
- Any `ufw` rule change that could remove remote/SSH access to the machine, especially on a headless or remotely-administered box — always state what connectivity could be lost.
- `nmcli networking off` / broad "reset networking" actions — prefer the narrowest layer-specific fix identified above.
- Disabling NetworkManager in favor of manual `/etc/network/interfaces` config — a significant, hard-to-reverse-by-a-non-expert architecture change; needs strong justification.
- Bluetooth: removing/unpairing a device is CHANGE (reversible by re-pairing, but may need the passkey again) — confirm before running `bluetoothctl remove <MAC>`.

## Verification

Confirm the specific original symptom: connectivity restored (`ping`/`curl` to a known-good host), DNS resolves, or the target service now reaches the network — not just "NetworkManager reports connected."
