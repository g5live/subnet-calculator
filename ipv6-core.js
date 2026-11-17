function parseAddress(address) {
    const halves = address.split('::');
    const readGroups = part => part === '' ? [] : part.split(':');
    const left = readGroups(halves[0]);
    const right = halves.length === 2 ? readGroups(halves[1]) : [];
    const missing = 8 - left.length - right.length;

    if (
        halves.length > 2 ||
        [...left, ...right].some(group => !/^[0-9a-f]{1,4}$/i.test(group)) ||
        (halves.length === 1 ? missing !== 0 : missing < 1)
    ) {throw new Error('Enter a valid hexadecimal IPv6 address.');}
    const groups = [...left, ...Array(missing).fill('0'), ...right];
    return BigInt('0x' + groups.map(group => group.padStart(4, '0')).join(''));}

function formatAddress(value) {
    const hex = value.toString(16).padStart(32, '0');
    const groups = hex.match(/.{4}/g).map(group => group.replace(/^0+(?=.)/, ''));
    let bestStart = 0;
    let bestLength = 1;
    for (let i = 0; i < groups.length;) {
        if (groups[i] !== '0') {
            i++;
            continue;}
        const start = i;
        while (groups[i] === '0') i++;
        const length = i - start;
        if (length > bestLength) {
            bestStart = start;
            bestLength = length;}}
    if (bestLength === 1) return groups.join(':');
    const left = groups.slice(0, bestStart).join(':');
    const right = groups.slice(bestStart + bestLength).join(':');
    return `${left}::${right}`;}

export function calculateIpv6(cidr) {
    const parts = cidr.trim().split('/');
    const [address, prefixText] = parts;
    if (parts.length !== 2 || !/^\d{1,3}$/.test(prefixText) || Number(prefixText) > 128) {
        throw new Error('Enter an IPv6 address with a prefix from /0 to /128.');}
    const prefix = Number(prefixText);
    const value = parseAddress(address);
    const addressBits = 128 - prefix;
    const shift = BigInt(addressBits);
    const addressCount = 1n << shift;
    const network = (value >> shift) << shift;
    const last = network + addressCount - 1n;
    return {
        prefix,
        addressBits,
        network: formatAddress(network),
        last: formatAddress(last),
        addressCount: addressCount.toString(),};}

export function splitIpv6(cidr, requestedCount) {
    if (!Number.isSafeInteger(requestedCount) || requestedCount < 1) {
        throw new Error('Enter a positive whole number of networks.');}
    const parent = calculateIpv6(cidr);
    let subnetCount = 1;
    let borrowedBits = 0;
    while (subnetCount < requestedCount) {
        subnetCount *= 2;
        borrowedBits++;}
    const prefix = parent.prefix + borrowedBits;
    if (prefix > 128) {
        throw new Error('The starting block is too small for that many networks.');}
    const parentStart = parseAddress(parent.network);
    const blockSize = 1n << BigInt(128 - prefix);
    const previewCount = Math.min(subnetCount, 32);
    const subnets = Array.from({ length: previewCount }, (_, index) => {
        const start = parentStart + BigInt(index) * blockSize;
        return {
            cidr: `${formatAddress(start)}/${prefix}`,
            last: formatAddress(start + blockSize - 1n),
            required: index < requestedCount,};});
    return {
        parent,
        prefix,
        borrowedBits,
        requestedCount,
        subnetCount,
        spareCount: subnetCount - requestedCount,
        addressesPerSubnet: blockSize.toString(),
        subnets,};}