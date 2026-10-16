# IPv4 Subnet Calculator

A small browser and terminal tool for working through IPv4 subnetting: see the answer, follow the calculation and compare the binary bits.

My contribution was the base outline for a practical networking exercise supporting my wider cybersecurity learning. The browser now includes a notebook-style interface and an equal-sized network splitting walkthrough.

## Open the browser version

With Node.js installed, run from this project directory:

```bash
npm run web
```

Open [the local calculator](http://127.0.0.1:4173), or the address printed in the terminal. Keep the terminal running; Ctrl+C stops the server. No extra packages are needed, and entered addresses stay in the browser.

## Use the terminal version

```bash
node subnet.js 192.168.1.70/26
```

The tool shows the mask, network address, host range and address counts. The browser adds quick/step-by-step calculations, colour-coded binary bits, historical IPv4 classes and matching/neighbouring subnet views.

Prefixes `/0` through `/32` are supported, including `/31` point-to-point and `/32` host-route cases. Supply the real prefix when known. A bare address uses a labelled historical Class A/B/C assumption; it cannot reveal the configured mask. A public-address label does not establish allocation or Internet reachability.

## Check the calculations

```bash
npm test
```

Tests use Node's built-in test runner. This is an IPv4 learning calculator, not a network scanner; IPv6 is outside its current scope.

## Split my network

Choose **Split my network**, enter a starting network with an explicit prefix and the number of equal-sized subnets needed. For `192.168.1.0/24` and `9`, the tool borrows four bits: 2³ = 8 is too few; 2⁴ = 16 is enough. The result is sixteen /28 blocks, each with 16 addresses (14 usable for ordinary hosts). Nine are needed and seven are spare.

An address within the starting block is normalised to its network address. This is equal-sized subnetting, not VLSM; check host capacity separately. /31 and /32 results are labelled as point-to-point links and host routes. Large results show the first 256 blocks to keep the page responsive.

Answers come first; detailed reference sections can be expanded when useful. Snake and Architects Daughter are bundled locally with their licence notices. Headings and handwritten notes use these fonts; instructions, addresses and calculations retain readable system/monospace fonts. No third-party font requests are made.
