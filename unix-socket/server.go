package main

import (
	"fmt"
	"net"
	"os"
)

func main() {
	socketPath := "/tmp/mysocket"
	err := os.Remove(socketPath)
	if err != nil {
		fmt.Println("Remove error:", err)
	}

	listener, err := net.Listen("unix", socketPath)
	if err != nil {
		panic(err)
	}
	defer listener.Close()
	fmt.Println("Server is listening on", socketPath)

	for {
		conn, err := listener.Accept()
		if err != nil {
			fmt.Println("Accept error:", err)
			continue
		}
		go handleConnection(conn)
	}
}

func handleConnection(conn net.Conn) {
	defer conn.Close()
	buf := make([]byte, 1024)
	n, _ := conn.Read(buf)
	fmt.Println("Received:", string(buf[:n]))
	conn.Write([]byte("Hello from server"))
}
