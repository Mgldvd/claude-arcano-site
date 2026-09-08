# Hardware & peripherals — audio (PipeWire), printers (CUPS), USB, input

## Audio (PipeWire/WirePlumber on Mint 22.3)

```
pactl info
pactl list short sinks
pactl list short sources
systemctl --user status pipewire pipewire-pulse wireplumber
journalctl --user -b -p err --grep='(?i)pipewire|wireplumber|alsa'
lspci -k | grep -EA3 audio
alsamixer            # interactive; ask user to check mute/volume state directly if unclear from pactl
```
Look for: is the expected sink/source even listed (device-detection layer) vs. listed but silent/muted (mixer layer) vs. listed and unmuted but no sound (routing/app layer). Check whether the correct sink is set as default (`pactl get-default-sink`).

**Minimal fixes:** set the correct default sink (`pactl set-default-sink <name>` — CHANGE, trivially reversible), unmute/adjust via `pactl set-sink-mute <name> 0` or the Sound applet (CHANGE, trivial), restart the user PipeWire services (`systemctl --user restart pipewire pipewire-pulse wireplumber` — CHANGE, brief audio interruption, no persistent risk) only if evidence shows the service itself is wedged. Avoid reinstalling PipeWire/ALSA packages unless evidence shows actual package corruption, not just a stuck service.

## Printers (CUPS)

```
systemctl status cups
lpstat -p -d
lpstat -t
lpinfo -v                 # discoverable printers/queues
journalctl -u cups -p err
```
Look for: queue exists and is enabled/accepting vs. missing entirely (driver/setup issue) vs. present but jobs stuck (queue/spooler issue). Most printer problems are queue- or driver-package-specific — resolve at that level (`cupsenable`, `cancel` a stuck job, reinstall the specific `printer-driver-*` package) rather than restarting or purging CUPS wholesale.

## USB devices / input (touchpad, webcam, etc.)

```
lsusb
lsusb -t
dmesg | tail -50               # look for connect/disconnect/error events near symptom time
libinput list-devices          # touchpad/mouse specifics, if installed
journalctl -b -p err --grep='(?i)usb|input|hid'
```
Confirm the device even enumerates at the USB layer before assuming a driver or Cinnamon input-settings problem.

## Needs explicit approval, never assumed safe

- Removing/purging PipeWire, PulseAudio-compat, ALSA, or CUPS packages — these are core to the desktop's audio/print stack; a targeted service restart or config fix is almost always the actual answer.
- Any `udev` rule change affecting device permissions.
- Recursive permission changes on `/dev` nodes — never; these are managed by udev, not manual `chmod`.

## Verification

Reproduce the original action (play audio, print a test page, plug the device) and confirm the specific symptom is gone — don't stop at "service is active."
