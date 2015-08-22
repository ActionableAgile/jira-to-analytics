// +build windows

package main

import (
	"fmt"
)

// this version doesn't hide the password as the user types it
func getPassword() string {
	var password string
	fmt.Print("Enter your password: ")
	fmt.Scanln(&password)
	fmt.Println()
	return password
}
