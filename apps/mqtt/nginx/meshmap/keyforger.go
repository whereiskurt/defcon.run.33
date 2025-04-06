package main

import (
	"encoding/base64"
	"fmt"
	"log"
)

func main() {
	base64Key := "ChannelPSK" // Change this to the key you want to convert

	// Decode Base64 string to raw bytes
	rawKey, err := base64.StdEncoding.DecodeString(base64Key)
	if err != nil {
		log.Fatal(err)
	}

	// Print the key in Go byte slice format
	fmt.Printf("var MeshtasticKey = []byte{\n")
	for i, b := range rawKey {
		fmt.Printf("    0x%02x,", b)
		if (i+1)%4 == 0 { // Formatting for readability
			fmt.Println()
		}
	}
	fmt.Println("}")
}
