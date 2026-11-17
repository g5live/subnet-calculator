# Subnet Calculator

A small learning tool for working out IP subnets. Use the calculator to see the answer and follow the maths, or try a practice question and work it out yourself.

## Run it locally

With Node.js installed, open a terminal in this folder and run:

```bash
npm run web
```

Open [the local calculator](http://127.0.0.1:4173) or the address printed in the terminal. No extra packages are needed. Keep the terminal open while you use the app; press Ctrl+C to stop it.

## What you can do

- **Understand an address:** switch between IPv4 and IPv6 to find the network and address range. Try `192.168.1.70/26` or `2001:db8:1234:5678::42/64`.
- **Split my network:** enter a starting network and the number of equal-sized subnets you need. See the new prefix, which blocks you need and how many are spare.
- **Test my knowledge:** work through 36 guided IPv4 scenarios. Enter the prefix, select the mask bits, find the increment and calculate the range. Check each part and compare your method with the worked solution.

Use the actual prefix when you know it. A bare IPv4 address uses a labelled historical assumption where applicable; IPv6 and network splitting require an explicit prefix. The app calculates address ranges locally and does not scan the network.

## Terminal and tests

The terminal calculator supports IPv4.

```bash
node subnet.js 192.168.1.70/26
npm test
```
