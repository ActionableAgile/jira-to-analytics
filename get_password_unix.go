// +build linux darwin

package main

import (
	"fmt"
	"os"
	"syscall"
)

func getPassword() string {

	// turn echo off
	var ws syscall.WaitStatus = 0
	idk := &syscall.ProcAttr{Dir: "", Files: []uintptr{os.Stdin.Fd(), os.Stdout.Fd(), os.Stderr.Fd()}}
	if pid, err := syscall.ForkExec("/bin/stty", []string{"stty", "-echo"}, idk); err == nil {
		syscall.Wait4(pid, &ws, 0, nil)
	}

	// read the password
	var password string
	fmt.Print("Enter your password: ")
	fmt.Scanln(&password)
	fmt.Println()

	// turn echo back on
	if pid, err := syscall.ForkExec("/bin/stty", []string{"stty", "echo"}, idk); err == nil {
		syscall.Wait4(pid, &ws, 0, nil)
	}

	return password
}
