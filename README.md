# Homebridge-samsung-aircon
Homebridge plugin for controlling Samsung Air Conditioner working on port 2878. Allows to control AC with HomeKit and Siri.
If you have Samsung AC which operates on port 8888, check this plugin instead: https://github.com/cicciovo/homebridge-samsung-airconditioner. Forked from the original project https://github.com/SebastianOsinski/HomebridgePluginSamsungAirConditioner
to support temperature range in auto mode (thanks Sebastian!).

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

#### Node
A version of Nodejs < 10.16 (i'm using 10.15.3) to avoid TLS problems. See https://nodejs.org/it/
```bash
$ curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash - 
$ sudo apt install nodejs -y
```
check the version with
```bash
$ node -v
```
To download and use a specific version of node:
```bash
$ npm i -g n
$ n 10.15
```
NOTE. For some people the plugin works fine on a version 12 of Node with the environment variable ``` NODE_OPTIONS="--tls-min-v1.0"```. I'm not one of them :(.

#### Homebridge
Install [Homebridge](https://github.com/nfarina/homebridge) with 
```bash
$ sudo npm i -g --unsafe-perm homebridge
```
#### Systemd support
Create the ```homebridge``` user and his folder ```/var/lib/homebridge```.
Write in ```/etc/default/homebridge```
```file
# Defaults / Configuration options for homebridge
# The following settings tells homebridge where to find the config.json file and where to persist the data (i.e. pairing and others)
HOMEBRIDGE_OPTS=-U /var/lib/homebridge
#
# Adding "insecure" mode option
# HOMEBRIDGE_OPTS=-U /var/lib/homebridge -I
#
#
# If you uncomment the following line, homebridge will log more
# You can display this via systemd's journalctl: journalctl -f -u homebridge
# DEBUG=*
#
# To enable web terminals via homebridge-config-ui-x uncomment the following line
# HOMEBRIDGE_CONFIG_UI_TERMINAL=1
```
and in ```/lib/systemd/system/homebridge.service```
```file
[Unit]
Description=Homebridge
After=syslog.target network-online.target

[Service]
Type=simple
User=homebridge
EnvironmentFile=/etc/default/homebridge
ExecStart=/usr/local/bin/homebridge $HOMEBRIDGE_OPTS
Restart=on-failure
RestartSec=3
KillMode=process
CapabilityBoundingSet=CAP_IPC_LOCK CAP_NET_ADMIN CAP_NET_BIND_SERVICE CAP_NET_RAW CAP_SETGID CAP_SETUID CAP_SYS_CHROOT CAP_CHOWN CAP_FOWNER CAP_DAC_OVERRIDE CAP_AUDIT_WRITE CAP_SYS_ADMIN
AmbientCapabilities=CAP_NET_RAW

[Install]
WantedBy=multi-user.target
```
Update with
```bash
$ sudo systemctl daemon-reload
```
and start with
```bash
$ sudo systemctl start homebridge.service
```

### Installation
Clone the repo
```bash
$ git clone 
```
and install by running 
```bash
$ cd HomebridgeSamsungAircon 
$ sudo npm install -g --unsafe-perm
```

### Configuration

Assign static IP address to your AC (check your router settings to do that).

Run `homebridge-samsung-aircon-get-token <your ac's ip address>` in terminal and follow instructions.

Update your Homebridge `config.json`. Check `config-sample.json` for reference.

- Required parameters:
    - `accessory` - always "Samsung Air Conditioner"
    - `name` - Name of your device
    - `ip_address` - IP address of air conditioner
    - `mac` - MAC address of air conditioner in format `AA:BB:CC:DD:EE:FF` or `AA-BB-CC-DD-EE-FF`
    - `token` - token returned by `homebridge-samsung-aircon-get-token <your ac's ip address>`
- Optional parameters:
    - `log_socket_activity` - `true`/`false` (default `false`). If `true` then logs additional raw data to console
    - `keep_alive` - dictionary with keep alive settings:
        - `enabled` - `true`/`false` (default `true`). If `true` then enables keep alive on underlying socket
        - `initial_delay` - milliseconds as integer (default `10000`). Time which needs to pass after last write to socket before sending first keep alive packet
        - `interval` - milliseconds as integer (default `10000`). Time between keep alive packes
        - `probes` - integer (default `10`). Number of keep alive packets to fails before treating connection as closed

## Background

To communicate with a device (IP = X.X.X.X), start the connection with
```
$ openssl s_client -connect X.X.X.X:2878 -cert ./res/ac14k_m.pem -cipher 'HIGH:!DH:!aNULL'
```
```
CONNECTED(00000003)
...
DPLUG-1.6
<?xml version="1.0" encoding="utf-8" ?><Update Type="InvalidateAccount"/>
```
Send the command 
```
<Request Type="GetToken" />
```
wait for 
```
<?xml version="1.0" encoding="utf-8" ?><Response Type="GetToken" Status="Ready"/>
```
and press power on the remote to collect the token
```
<?xml version="1.0" encoding="utf-8" ?><Update Type="GetToken" Status="Completed" Token="XXXXXXXX"/>
```
Authentication with 
```
<Request Type="AuthToken"><User Token="XXXXXXXX"/></Request>
```
and press again power to get the DUID="YYYYYYYY" (the MAC address!).

You can get the status
```<Request Type="DeviceState" DUID="YYYYYYYY"></Request>```
or send a command
```<Request Type="DeviceControl"><Control CommandID="' + id + '" DUID="YYYYYYYY"><Attr ID="' + key + '" Value="' + value + '" /></Control></Request>```


## Features
- Turning AC on and off
- Getting and setting target temperature, cooling and heating threshold
- Getting current temperature
- Getting and setting mode
- Getting and setting swing mode
- Getting and setting wind level
- Reacting to changes made by using AC's remote

### Confirmed compatibility list (model numbers)
- AR12HSSFAWKNEU
- AR18HSFSAWKNEU
- AR12HSFSAWKN
- AR24FSSSBWKN
- AR12FSSEDWUNEU
- AR09HSSDBWKN

If your device's number is not on the list but you have tested it and it works, please make a PR with your device's number.

## Acknowledgment

This project is few code lines far from https://github.com/SebastianOsinski/HomebridgePluginSamsungAirConditioner
which is based on the e awesome work of CloCkWeRX - https://github.com/CloCkWeRX/node-samsung-airconditioner.
