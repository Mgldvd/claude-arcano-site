// Template: internal/config/config.go
//
// The Config type and its (de)serialization are shared, unmodified, by both
// cmd/config.go (CLI path) and gui/bindings.go (GUI path). Never fork this
// struct or duplicate its logic in the frontend.

package config

// Config is the full persisted configuration for mycom.
type Config struct {
	Provider string   `toml:"provider"`
	Scope    string   `toml:"scope"`
	UI       UIConfig `toml:"ui"`
}

type UIConfig struct {
	Theme string `toml:"theme"`
}

// Default returns the configuration used when no config file exists yet.
func Default() Config {
	return Config{
		Provider: "claude",
		Scope:    "project",
		UI:       UIConfig{Theme: "dark"},
	}
}
