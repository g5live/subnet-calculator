# IPv4 Subnet Calculator

A small cross-platform IPv4 CIDR learning tool with a terminal version and a browser interface. It uses Node.js built-ins only; no dependency installation is needed.

## Browser calculator

Install Node.js on Windows, macOS or Linux, then open a terminal in this folder and run:

```text
npm run web
```

Open the local address printed by the command (normally `http://127.0.0.1:4173`) in any modern browser. Keep the terminal running while you use the page; press `Ctrl+C` to stop the local server. The calculator does not send entered addresses anywhere.

Section 2 has working buttons for Quick Calculation, Step-by-Step, Binary View and IPv4 Class. Section 3 keeps the final answer visible. Section 4 switches between a Quick View of the matching subnet plus up to two neighbours on either side, and the Full Subnet list. Binary bits are colour-coded by network-prefix versus host position. A bare address uses a labelled, historical Class A/B/C default because the address alone cannot reveal its configured mask.

## Command line

```text
node subnet.js 192.168.1.70/26
```

Or:

```text
npm start -- 10.0.4.1/20
```

The command line gives the same detailed calculation. IPv4 prefixes `/0` through `/32` are supported, including the special `/31` point-to-point and `/32` host-route cases. You can also enter a bare address: the tool infers the traditional Class A `/8`, B `/16` or C `/24` default and labels it as an assumption. An address alone cannot reveal its actually configured prefix, so supply the real slash prefix whenever known. Class and allocation details are shown separately; special-use addresses are distinguished from private and public/unicast candidates.

## Check the calculations

```text
npm test
```

The tests use Node's built-in test runner; no packages need to be downloaded. The project source can be cloned from GitHub and run on any operating system with Node.js installed.
