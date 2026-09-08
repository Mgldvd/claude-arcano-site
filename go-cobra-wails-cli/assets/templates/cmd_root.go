// Template: cmd/root.go
//
// Copy into a new project and rename the module import paths / binary name.
// This file's only job is wiring Cobra together. It must never import "gui"
// directly — only newConfigCommand (in cmd/config.go) does that.
//
// Execute takes the embedded frontend assets (built in main.go, since
// go:embed can't reach the sibling frontend/ directory from gui/) purely to
// hand them down to newConfigCommand. Commands other than config never touch
// this value.

package cmd

import (
	"embed"
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "mycom",
	Short: "One-line description of what mycom does",
	// Long: only add this if it says something Short + the flag list don't already.
}

// Execute runs the root command and is the only place a Cobra error becomes a
// process exit. internal/ and gui/ code must never call os.Exit directly.
func Execute(assets embed.FS) {
	rootCmd.AddCommand(newInitCommand())
	rootCmd.AddCommand(newRunCommand())
	rootCmd.AddCommand(newStatusCommand())
	rootCmd.AddCommand(newConfigCommand(assets))

	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, "Error:", err)
		os.Exit(1)
	}
}
