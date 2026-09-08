// Template: cmd/status.go
//
// Another pure CLI command — reads through the same internal/config package
// the GUI uses, prints to the terminal, no gui import.

package cmd

import (
	"fmt"

	"github.com/spf13/cobra"

	"mycom/internal/config"
)

func newStatusCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "status",
		Short: "Show the current configuration and readiness",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := config.Load()
			if err != nil {
				return fmt.Errorf("loading configuration: %w", err)
			}

			fmt.Printf("Provider: %s\n", cfg.Provider)
			fmt.Printf("Scope:    %s\n", cfg.Scope)
			fmt.Println("Status:   ready")
			return nil
		},
	}

	return cmd
}
