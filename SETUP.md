# SETUP & NETWORK CONFIGURATION GUIDE — Financial Market Simulation (FMS)

This document provides clear, plain-language instructions for hosting a live 60-minute FMS event using a local machine as the central broker server, while enabling staff and displays to connect over a local network.

---

## 1. Core Hosting Setup

The platform is designed to run from a single **Host Laptop** which serves both the central real-time database and web interface.

1. **Host Laptop**: The machine running `node server.js`. It must remain powered on, awake, and connected to the local Wi-Fi/network for the entire duration of the event.
2. **Staff/Display Devices**: Laptops, tablets, or projector terminals that access the consoles over Wi-Fi.

---

## 2. Finding the Host Laptop IP Address

To allow other devices to connect, you need to find the host laptop's local IP address.

### On Windows:
1. Open the **Command Prompt** (Press `Win + R`, type `cmd`, and press Enter).
2. Type the following command and press Enter:
   ```cmd
   ipconfig
   ```
3. Look for the line labeled **IPv4 Address** under your active network adapter (e.g., Wireless LAN adapter Wi-Fi). It will look like `192.168.1.XX` or `10.0.0.XX`.

### On macOS / Linux:
1. Open the **Terminal** app.
2. Type the following command and press Enter:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
3. Locate the local IP address (typically starts with `192.168.` or `10.`).

---

## 3. Connecting Other Devices

All devices (Exchange staff laptops, SEBI coordinator tablets, Projector output screens) must be on the **SAME Wi-Fi network, hotspot, or local router** as the Host Laptop.

Open a web browser on any client device and navigate to:
```http
http://<HOST-LAPTOP-IP>:3000/
```
*Example:* If the Host Laptop IP is `192.168.1.15`, type `http://192.168.1.15:3000/exchange` to access the Exchange Console.

### Available URLs:
- **Projector Dashboard** (Public Display): `http://<HOST-LAPTOP-IP>:3000/projector`
- **Exchange Entry Console**: `http://<HOST-LAPTOP-IP>:3000/exchange`
- **SEBI Control Panel**: `http://<HOST-LAPTOP-IP>:3000/sebi`
- **Journalist Desk**: `http://<HOST-LAPTOP-IP>:3000/journalist`
- **Admin Configuration**: `http://<HOST-LAPTOP-IP>:3000/admin`
- **Final Results**: `http://<HOST-LAPTOP-IP>:3000/results`

---

## 4. Pre-Event Checklist
- [ ] Connect the Host Laptop to the local network or a dedicated mobile hotspot (recommended for high reliability in crowded conference rooms).
- [ ] Find the Host IP address and write it down.
- [ ] Ensure the Host Laptop's sleep mode and screen saver are disabled.
- [ ] Open the Projector screen on the display system and test full-screen visibility.
- [ ] Test order execution on one Exchange laptop, verifying the Projector updates instantly.
- [ ] Rehearse the "Quick Seed" seed data button in Admin prior to the event.
