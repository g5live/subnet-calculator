import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSubnet, classifyIPv4, getNearbySubnets } from '../subnet-core.js';

test('explains a /26 and finds the input among four sibling subnets', () => {
  const result = calculateSubnet('192.168.1.70/26');
  assert.equal(result.hostBits, 6);
  assert.equal(result.totalAddresses, 64);
  assert.equal(result.maskText, '255.255.255.192');
  assert.equal(result.parentNetworkAddress, '192.168.1.0');
  assert.equal(result.subnetCount, 4);
  assert.deepEqual(result.subnets.map(({ networkAddress, broadcastAddress }) => [networkAddress, broadcastAddress]), [
    ['192.168.1.0', '192.168.1.63'],
    ['192.168.1.64', '192.168.1.127'],
    ['192.168.1.128', '192.168.1.191'],
    ['192.168.1.192', '192.168.1.255'],
  ]);
  assert.equal(result.subnets.filter(subnet => subnet.containsInput).length, 1);
  assert.equal(result.networkAddress, '192.168.1.64');
});

test('handles a partial third-octet prefix', () => {
  const result = calculateSubnet('10.0.4.1/20');
  assert.equal(result.maskText, '255.255.240.0');
  assert.equal(result.networkAddress, '10.0.0.0');
  assert.equal(result.broadcastAddress, '10.0.15.255');
  assert.equal(result.subnetCount, 16);
});

test('treats /31 as two point-to-point endpoints without a broadcast address', () => {
  const result = calculateSubnet('192.0.2.10/31');
  assert.equal(result.subnets.find(subnet => subnet.containsInput).usable, '192.0.2.10 – 192.0.2.11 (both point-to-point endpoints)');
  assert.match(result.subnets[0].broadcast, /no broadcast address/);
});

test('treats /32 as one host route', () => {
  const result = calculateSubnet('192.0.2.10/32');
  assert.equal(result.hostBits, 0);
  assert.equal(result.totalAddresses, 1);
  assert.equal(result.subnetCount, 256);
  assert.match(result.subnets[0].broadcast, /no broadcast address/);
});

test('rejects malformed addresses and prefixes', () => {
  assert.throws(() => calculateSubnet('192.168.1.256/26'), /octet/);
  assert.throws(() => calculateSubnet('192.168.1.1/33'), /between \/0 and \/32/);
  assert.equal(calculateSubnet('192.168.1.1').prefix, 24);
  assert.throws(() => calculateSubnet('224.0.0.1'), /no classful host default/);
});

test('keeps the current /24 and no more than two neighbours on each side in the short view', () => {
  const result = calculateSubnet('172.19.88.0/24');
  const nearby = getNearbySubnets(result.subnets);
  assert.equal(result.parentNetworkAddress, '172.19.0.0');
  assert.equal(result.subnetCount, 256);
  assert.deepEqual(nearby.subnets.map(subnet => subnet.networkAddress), [
    '172.19.86.0', '172.19.87.0', '172.19.88.0', '172.19.89.0', '172.19.90.0',
  ]);
  assert.equal(nearby.subnets.filter(subnet => subnet.containsInput).length, 1);
  assert.equal(nearby.subnets.length, 5);
});

test('infers a clearly labelled historical default for a bare address', () => {
  const result = calculateSubnet('172.19.88.0');
  assert.equal(result.prefix, 16);
  assert.equal(result.prefixWasInferred, true);
  assert.equal(result.networkAddress, '172.19.0.0');
  assert.equal(result.classification.className, 'B');
  assert.equal(result.classification.allocation.category, 'Private IPv4 (RFC 1918)');
});

test('distinguishes public candidates and special-use addresses', () => {
  const publicCandidate = classifyIPv4('8.8.8.8');
  assert.equal(publicCandidate.className, 'A');
  assert.equal(publicCandidate.allocation.category, 'Public/unicast candidate');
  const special = classifyIPv4('169.254.10.20');
  assert.equal(special.allocation.category, 'Special-use (not ordinary public unicast)');
  assert.match(special.allocation.purpose, /link-local/i);
});
