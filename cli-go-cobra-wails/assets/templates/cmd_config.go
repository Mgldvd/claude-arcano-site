// Template: cmd/config.go
//
// The ONLY file in cmd/ that imports gui. That single import boundary is
// what guarantees init/run/status never link in a window — grep for
// `"mycom/gui"` across cmd/ and this should be the only hit. The "embed"
// import here is just to thread the assets embed.FS through from
// Execute(); it's stdlib and carries no Wails/GUI machinery on its own.

package cmd

import (
	"embed"

	"github.com/spf13/cobra"

	"mycom/gui"
)

func newConfigCommand(assets embed.FS) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "config",
		Short: "Open the configuration window",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			return gui.RunConfigGUI(assets)
		},
	}

	return cmd
}
