package main

import (
	"fmt"
	"net"
)

func main() {
	socketPath := "/tmp/mysocket"

	conn, err := net.Dial("unix", socketPath)
	if err != nil {
		panic(err)
	}
	defer conn.Close()

	_, err = conn.Write([]byte("Hello Server!"))
	if err != nil {
		fmt.Println("Write error:", err)
		return
	}

	buf := make([]byte, 1024)
	n, _ := conn.Read(buf)
	fmt.Println("Server response:", string(buf[:n]))
}
