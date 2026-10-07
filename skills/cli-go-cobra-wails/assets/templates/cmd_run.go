// Template: cmd/run.go
//
// A pure CLI command with a local flag. This is also the command most
// likely to be scripted or run unattended — never make it depend on gui/.

package cmd

import (
	"github.com/spf13/cobra"

	"mycom/internal/runner"
)

func newRunCommand() *cobra.Command {
	var verbose bool

	cmd := &cobra.Command{
		Use:   "run",
		Short: "Run the application",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			return runner.Run(cmd.Context(), runner.Options{Verbose: verbose})
		},
	}

	cmd.Flags().BoolVar(&verbose, "verbose", false, "print detailed progress")
	return cmd
}
