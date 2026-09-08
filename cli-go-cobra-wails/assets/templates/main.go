// Template: main.go
//
// Deliberately empty of logic. Cobra is the entrypoint; the only reason this
// file imports "embed" is that go:embed patterns can't use ".." to reach a
// sibling directory, so the built frontend has to be embedded here (where
// frontend/dist is a real subdirectory) and handed down to cmd/gui — it is
// NOT imported for GUI purposes and does not touch Wails. Building or
// running this file never initializes Wails unless the executed
// subcommand's own RunE reaches into gui/.

package main

import (
	"embed"

	"mycom/cmd"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	cmd.Execute(assets)
}
