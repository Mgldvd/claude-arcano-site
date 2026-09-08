// Template: internal/config/storage.go
//
// XDG-conventional path resolution plus TOML load/save. This is the only
// place that knows where the config file lives on disk.

package config

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/BurntSushi/toml"
)

func path() (string, error) {
	dir, err := os.UserConfigDir() // honors XDG_CONFIG_HOME, falls back to ~/.config
	if err != nil {
		return "", fmt.Errorf("resolving config directory: %w", err)
	}
	return filepath.Join(dir, "mycom", "config.toml"), nil
}

// Load reads the config file, returning Default() if it doesn't exist yet.
func Load() (Config, error) {
	p, err := path()
	if err != nil {
		return Config{}, err
	}

	data, err := os.ReadFile(p)
	if os.IsNotExist(err) {
		return Default(), nil
	}
	if err != nil {
		return Config{}, fmt.Errorf("reading config file: %w", err)
	}

	var cfg Config
	if err := toml.Unmarshal(data, &cfg); err != nil {
		return Config{}, fmt.Errorf("parsing config file: %w", err)
	}
	return cfg, nil
}

// Save atomically writes cfg to disk, creating the config directory if needed.
func Save(cfg Config) error {
	p, err := path()
	if err != nil {
		return err
	}

	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		return fmt.Errorf("creating config directory: %w", err)
	}

	temporary, err := os.CreateTemp(filepath.Dir(p), ".config-*.tmp")
	if err != nil {
		return fmt.Errorf("creating temporary config file: %w", err)
	}
	temporaryPath := temporary.Name()
	defer os.Remove(temporaryPath)

	if err := temporary.Chmod(0o600); err != nil {
		temporary.Close()
		return fmt.Errorf("setting config permissions: %w", err)
	}
	if err := toml.NewEncoder(temporary).Encode(cfg); err != nil {
		temporary.Close()
		return fmt.Errorf("writing config file: %w", err)
	}
	if err := temporary.Sync(); err != nil {
		temporary.Close()
		return fmt.Errorf("syncing config file: %w", err)
	}
	if err := temporary.Close(); err != nil {
		return fmt.Errorf("closing config file: %w", err)
	}
	if err := os.Rename(temporaryPath, p); err != nil {
		return fmt.Errorf("publishing config file: %w", err)
	}
	return nil
}
