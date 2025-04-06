#!/bin/bash

# Generate private key, self-signed certificate, and CSR
openssl req -new -newkey rsa:2048 -nodes -keyout nginx-selfsigned.key -out nginx-selfsigned.csr -subj "/C=US/ST=Nevada/L=LasVegas/O=DEFCON.run/OU=Engineering/CN=etherpad.defcon.run"

# Create self-signed certificate from the private key
openssl x509 -req -days 365 -in nginx-selfsigned.csr -signkey nginx-selfsigned.key -out nginx-selfsigned.crt