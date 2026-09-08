// Template: cmd/init.go
//
// Example of a pure CLI command. RunE is a thin call into internal/;
// no gui import anywhere in this file.

package cmd

import (
	"fmt"

	"github.com/spf13/cobra"

	"mycom/internal/installer"
)

func newInitCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "init",
		Short: "Initialize a new project in the current directory",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := installer.Init(cmd.Context()); err != nil {
				return fmt.Errorf("initializing project: %w", err)
			}
			fmt.Println("✓ Project initialized")
			return nil
		},
	}

	return cmd
}
