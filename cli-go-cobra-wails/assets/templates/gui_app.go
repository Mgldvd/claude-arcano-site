// Template: gui/app.go
//
// The only file in the whole project that calls wails.Run. RunConfigGUI
// blocks until the window closes, then returns — cmd/config.go's RunE can
// call it synchronously and let its returned error bubble up normally.
//
// assets is the built frontend (frontend/dist), embedded and passed in from
// main.go rather than embedded here. Go's //go:embed cannot use ".." to
// reach outside the directory of the file containing the directive, and
// gui/ and frontend/ are siblings — so this package cannot embed
// frontend/dist itself. See main.go's own //go:embed all:frontend/dist.

package gui

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

// RunConfigGUI opens the configuration window and blocks until it is closed.
func RunConfigGUI(assets embed.FS) error {
	app := &App{}

	return wails.Run(&options.App{
		Title:  "mycom",
		Width:  480,
		Height: 420,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 24, G: 24, B: 27, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
	})
}
