const PRIVATE_RANGES = [
  { cidr: '10.0.0.0/8', purpose: 'RFC 1918 private-use range' },
  { cidr: '172.16.0.0/12', purpose: 'RFC 1918 private-use range (172.16.0.0–172.31.255.255)' },
  { cidr: '192.168.0.0/16', purpose: 'RFC 1918 private-use range' },
];

const SPECIAL_RANGES = [
  { cidr: '0.0.0.0/8', purpose: 'This-network and unspecified addresses' },
  { cidr: '100.64.0.0/10', purpose: 'Shared address space, commonly used by carrier-grade NAT' },
  { cidr: '127.0.0.0/8', purpose: 'Loopback; the address refers to this device' },
  { cidr: '169.254.0.0/16', purpose: 'IPv4 link-local; often self-assigned when DHCP is unavailable' },
  { cidr: '192.0.0.0/24', purpose: 'IETF protocol assignments; special-use, with assignment-specific reachability' },
  { cidr: '192.0.2.0/24', purpose: 'Documentation and examples (TEST-NET-1)' },
  { cidr: '192.88.99.0/24', purpose: 'Deprecated 6to4 relay anycast special-use range' },
  { cidr: '198.18.0.0/15', purpose: 'Benchmarking and performance testing' },
  { cidr: '198.51.100.0/24', purpose: 'Documentation and examples (TEST-NET-2)' },
  { cidr: '203.0.113.0/24', purpose: 'Documentation and examples (TEST-NET-3)' },
  { cidr: '224.0.0.0/4', purpose: 'Multicast address space (Class D)' },
  { cidr: '240.0.0.0/4', purpose: 'Reserved address space (Class E)' },
];

export function parseIPv4(address) {
  const octets = address.split('.');
  if (octets.length !== 4 || octets.some(part => !/^\d{1,3}$/.test(part))) {
    throw new Error('IPv4 address must contain four decimal octets.');
  }
  const values = octets.map(Number);
  if (values.some(value => value > 255)) {
    throw new Error('Each IPv4 octet must be between 0 and 255.');
  }
  return values.reduce((value, octet) => ((value << 8) | octet) >>> 0, 0);
}

export function formatIPv4(value) {
  return [24, 16, 8, 0].map(shift => (value >>> shift) & 255).join('.');
}

export function formatBinary(value) {
  return [24, 16, 8, 0]
    .map(shift => ((value >>> shift) & 255).toString(2).padStart(8, '0'))
    .join('.');
}

export function maskForPrefix(prefix) {
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

function matchesCidr(ip, cidr) {
  const [networkText, prefixText] = cidr.split('/');
  const prefix = Number(prefixText);
  return ((ip & maskForPrefix(prefix)) >>> 0) === parseIPv4(networkText);
}

export function classifyIPv4(address) {
  const ip = parseIPv4(address);
  const firstOctet = ip >>> 24;
  let className;
  let classRange;
  let legacyPrefix = null;
  let historicalPurpose;

  if (firstOctet === 0) {
    className = 'Reserved';
    classRange = '0–0';
    historicalPurpose = '0.0.0.0/8 is reserved for this-network and unspecified uses.';
  } else if (firstOctet === 127) {
    className = 'A (loopback special case)';
    classRange = '1–126 for ordinary Class A; 127/8 is loopback';
    legacyPrefix = 8;
    historicalPurpose = 'Class A historically used a /8 default, but 127/8 is reserved for loopback to this device.';
  } else if (firstOctet <= 126) {
    className = 'A';
    classRange = '1–126';
    legacyPrefix = 8;
    historicalPurpose = 'Historically a large network block, with a classful default mask of /8.';
  } else if (firstOctet <= 191) {
    className = 'B';
    classRange = '128–191';
    legacyPrefix = 16;
    historicalPurpose = 'Historically a medium-sized network block, with a classful default mask of /16.';
  } else if (firstOctet <= 223) {
    className = 'C';
    classRange = '192–223';
    legacyPrefix = 24;
    historicalPurpose = 'Historically a smaller network block, with a classful default mask of /24.';
  } else if (firstOctet <= 239) {
    className = 'D';
    classRange = '224–239';
    historicalPurpose = 'Multicast destination space; it is not an ordinary host-unicast class.';
  } else {
    className = 'E';
    classRange = '240–255';
    historicalPurpose = 'Reserved for special or experimental use; it is not an ordinary host-unicast class.';
  }

  const privateMatch = PRIVATE_RANGES.find(range => matchesCidr(ip, range.cidr));
  const specialMatch = SPECIAL_RANGES.find(range => matchesCidr(ip, range.cidr));
  let allocation;
  if (privateMatch) {
    allocation = {
      category: 'Private IPv4 (RFC 1918)',
      matchedRange: privateMatch.cidr,
      purpose: `${privateMatch.purpose}. Intended for internal networks; these addresses are not globally unique.`,
    };
  } else if (specialMatch) {
    allocation = {
      category: 'Special-use (not ordinary public unicast)',
      matchedRange: specialMatch.cidr,
      purpose: specialMatch.purpose,
    };
  } else {
    allocation = {
      category: 'Public/unicast candidate',
      matchedRange: null,
      purpose: 'This address is outside the RFC 1918 private ranges and the common special-use ranges checked here. Global reachability still depends on allocation, routing and local network policy.',
    };
  }

  return {
    address,
    firstOctet,
    className,
    classRange,
    legacyPrefix,
    historicalPurpose,
    allocation,
  };
}

function addressRange(network, broadcast, prefix) {
  if (prefix <= 30) {
    return {
      usable: `${formatIPv4(network + 1)} – ${formatIPv4(broadcast - 1)}`,
      broadcast: formatIPv4(broadcast),
    };
  }
  if (prefix === 31) {
    return {
      usable: `${formatIPv4(network)} – ${formatIPv4(broadcast)} (both point-to-point endpoints)`,
      broadcast: '— (/31 has no broadcast address)',
    };
  }
  return {
    usable: `${formatIPv4(network)} (single host route)`,
    broadcast: '— (/32 has no broadcast address)',
  };
}

export function getNearbySubnets(subnets, radius = 2) {
  const selectedIndex = subnets.findIndex(subnet => subnet.containsInput);
  if (selectedIndex < 0) throw new Error('Could not find the subnet containing the input address.');
  const first = Math.max(0, selectedIndex - radius);
  const last = Math.min(subnets.length, selectedIndex + radius + 1);
  return { subnets: subnets.slice(first, last), first, last, selectedIndex, total: subnets.length };
}

export function calculateSubnet(input) {
  if (typeof input !== 'string') throw new Error('Enter an IPv4 address, with or without a CIDR prefix.');
  const parts = input.trim().split('/');
  if (parts.length > 2 || !parts[0]) throw new Error('Use IPv4 CIDR notation, for example 192.168.1.70/26.');

  const address = parts[0].trim();
  const ip = parseIPv4(address);
  const classification = classifyIPv4(address);
  const prefixWasInferred = parts.length === 1;
  if (prefixWasInferred && classification.legacyPrefix === null) {
    throw new Error(`Class ${classification.className} has no classful host default. Enter an explicit prefix, such as ${address}/24.`);
  }
  const prefixText = prefixWasInferred ? String(classification.legacyPrefix) : parts[1];
  if (!/^\d+$/.test(prefixText)) throw new Error('CIDR prefix must be a whole number from /0 through /32.');
  const prefix = Number(prefixText);
  if (prefix < 0 || prefix > 32) throw new Error('Prefix must be between /0 and /32.');

  const mask = maskForPrefix(prefix);
  const network = (ip & mask) >>> 0;
  const wildcard = (~mask) >>> 0;
  const broadcast = (network | wildcard) >>> 0;
  const hostBits = 32 - prefix;
  const totalAddresses = 2 ** hostBits;
  const maskText = formatIPv4(mask);

  // This octet-aligned parent is a teaching frame for listing sibling subnets,
  // not a claim that modern IPv4 uses classful A/B/C networks.
  const parentPrefix = prefix === 0 ? null : Math.floor((prefix - 1) / 8) * 8;
  const parentMask = parentPrefix === null ? 0 : maskForPrefix(parentPrefix);
  const parentNetwork = (ip & parentMask) >>> 0;
  const subnetCount = parentPrefix === null ? 1 : 2 ** (prefix - parentPrefix);
  const subnets = Array.from({ length: subnetCount }, (_, index) => {
    const childNetwork = parentNetwork + index * totalAddresses;
    const childBroadcast = childNetwork + totalAddresses - 1;
    return {
      number: index + 1,
      network: childNetwork,
      networkAddress: formatIPv4(childNetwork),
      cidr: `${formatIPv4(childNetwork)}/${prefix}`,
      broadcastAddress: formatIPv4(childBroadcast),
      ...addressRange(childNetwork, childBroadcast, prefix),
      containsInput: ip >= childNetwork && ip <= childBroadcast,
    };
  });

  const boundaryOctet = prefix === 0 ? null : Math.ceil(prefix / 8) - 1;
  const addressOctets = address.split('.').map(Number);
  const maskOctets = maskText.split('.').map(Number);
  const blockSize = boundaryOctet === null ? null : 256 - maskOctets[boundaryOctet];
  const boundaryAddressValue = boundaryOctet === null ? null : addressOctets[boundaryOctet];
  const boundaryNetworkValue = boundaryOctet === null
    ? null
    : Math.floor(boundaryAddressValue / blockSize) * blockSize;
  const boundaryBroadcastValue = boundaryOctet === null
    ? null
    : boundaryNetworkValue + blockSize - 1;

  return {
    address, prefix, prefixWasInferred,
    prefixAssumption: prefixWasInferred ? `Traditional Class ${classification.className} default /${prefix}; this is an assumption, not a discovered mask.` : null,
    classification,
    ip, ipBits: formatBinary(ip), mask, maskText,
    maskBits: formatBinary(mask), wildcard, wildcardText: formatIPv4(wildcard),
    hostBits, totalAddresses, network, networkAddress: formatIPv4(network),
    networkBits: formatBinary(network), broadcast, broadcastAddress: formatIPv4(broadcast),
    broadcastBits: formatBinary(broadcast), parentPrefix, parentNetwork,
    parentNetworkAddress: formatIPv4(parentNetwork), subnetBits: parentPrefix === null ? 0 : prefix - parentPrefix,
    subnetCount, subnets, boundaryOctet, boundaryAddressValue, blockSize,
    boundaryNetworkValue, boundaryBroadcastValue,
    powersExpression: hostBits === 0 ? '1' : Array(hostBits).fill('2').join(' × '),
  };
}
