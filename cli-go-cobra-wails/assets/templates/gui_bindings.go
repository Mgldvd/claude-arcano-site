// Template: gui/bindings.go
//
// The bound struct. Its exported methods become callable from Vue via the
// generated TypeScript stubs — see wails-facts.md fact #5 for exactly how
// Wails names the generated import path (wailsjs/go/gui/App, because this
// struct lives in package gui, not package main).
//
// Every method here should be a 1-3 line pass-through to internal/config.
// If a method starts growing real logic, that logic belongs in internal/
// instead, so the CLI path can reach it too.

package gui

import (
	"context"

	"mycom/internal/config"
)

// App is bound to the frontend.
type App struct {
	ctx context.Context
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// LoadConfig returns the current persisted configuration (or config.Default()
// if none exists yet) for the frontend to populate its form with.
func (a *App) LoadConfig() (config.Config, error) {
	return config.Load()
}

// SaveConfig persists cfg using the same internal/config logic the CLI uses.
func (a *App) SaveConfig(cfg config.Config) error {
	return config.Save(cfg)
}
