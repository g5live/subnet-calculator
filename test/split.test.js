import test from 'node:test';
import assert from 'node:assert/strict';
import { splitNetwork } from '../subnet-core.js';

test('/24 into nine networks chooses /28 and leaves seven spare', () => {
  const result = splitNetwork('192.168.1.0/24', 9);
  assert.equal(result.prefix, 28);
  assert.equal(result.borrowedBits, 4);
  assert.equal(result.subnetCount, 16);
  assert.equal(result.spareCount, 7);
  assert.equal(result.usablePerSubnet, 14);
  assert.equal(result.maskText, '255.255.255.240');
  assert.equal(result.subnets[15].broadcast, '192.168.1.255');
  assert.equal(result.subnets.filter(s => s.required).length, 9);
  assert.equal(result.subnets[1].networkAddress, '192.168.1.16');
});
test('normalises host input and does not over-borrow at exact powers', () => {
  const result = splitNetwork('10.2.3.70/24', 8);
  assert.equal(result.parent.networkAddress, '10.2.3.0');
  assert.equal(result.prefix, 27);
  assert.equal(result.spareCount, 0);
  assert.equal(splitNetwork('10.2.3.0/24', 1).prefix, 24);
});
test('handles octet boundaries, /31 endpoints and /32 routes', () => {
  assert.equal(splitNetwork('10.0.0.0/16', 9).prefix, 20);
  const links = splitNetwork('192.0.2.0/30', 2);
  assert.equal(links.usablePerSubnet, 2);
  assert.match(links.subnets[0].broadcast, /no broadcast/);
  assert.equal(splitNetwork('255.255.255.255/32', 1).subnets[0].networkAddress, '255.255.255.255');
});
test('rejects missing prefixes, bad counts and impossible splits', () => {
  assert.throws(() => splitNetwork('192.0.2.1', 9), /prefix/);
  for (const count of [0, -1, 2.5, NaN, Infinity, '9']) {
    assert.throws(() => splitNetwork('192.0.2.0/24', count), /whole number/);
  }
  assert.throws(() => splitNetwork('192.0.2.0/30', 5), /enough addresses/);
});
test('bounds previews without losing full IPv4 counts', () => {
  const result = splitNetwork('0.0.0.0/0', 2 ** 32);
  assert.equal(result.prefix, 32);
  assert.equal(result.subnetCount, 2 ** 32);
  assert.equal(result.subnets.length, 256);
});
