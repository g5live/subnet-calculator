#!/usr/bin/env node
import { calculateSubnet } from './subnet-core.js';

function printSubnet(result) {
  console.log(`\nDETAILED SUBNET BREAKDOWN — ${result.address}/${result.prefix}`);
  if (result.prefixWasInferred) console.log(`   ASSUMPTION: ${result.prefixAssumption}`);
  console.log('='.repeat(72));
  console.log('1. Count the host bits');
  console.log(`   IPv4 has 32 bits. Prefix /${result.prefix} allocates ${result.prefix} network bits.`);
  console.log(`   32 − ${result.prefix} = ${result.hostBits} host bits`);

  console.log('\n2. Find the total addresses in each subnet');
  console.log(`   2^${result.hostBits} = ${result.powersExpression} = ${result.totalAddresses} addresses`);
  console.log('   For /0 through /30 these include the network and broadcast addresses.');

  console.log('\n3. Build the subnet mask and derive the network address');
  console.log(`   Dotted-decimal subnet mask: ${result.maskText}`);
  console.log(`   IP bits:          ${result.ipBits}`);
  console.log(`   Mask bits:        ${result.maskBits}`);
  console.log(`   IP AND mask:      ${result.networkBits} = ${result.networkAddress} (network address)`);
  console.log(`   Wildcard mask:    ${result.wildcardText} (host bits set to 1)`);
  console.log(`   Network OR mask:  ${result.broadcastBits} = ${result.broadcastAddress} (host bits set to 1)`);

  if (result.parentPrefix === null) {
    console.log('\n4. Subnet blocks');
    console.log('   /0 is the entire IPv4 address space; there is no larger parent block to subdivide.');
  } else {
    console.log(`\n4. Count the /${result.prefix} subnets inside their /${result.parentPrefix} parent`);
    console.log(`   Parent block: ${result.parentNetworkAddress}/${result.parentPrefix} (nearest less-specific whole-octet boundary)`);
    console.log(`   ${result.prefix} − ${result.parentPrefix} = ${result.subnetBits} subnet bits added inside that parent`);
    console.log(`   2^${result.subnetBits} = ${result.subnetCount} child subnets`);
    if (result.prefix % 8 !== 0) {
      console.log(`   In the boundary octet: 256 ÷ ${result.blockSize} addresses per block = ${256 / result.blockSize} subnets`);
    } else {
      console.log(`   At an octet boundary, each subnet advances by ${result.blockSize} in octet ${result.boundaryOctet + 1}.`);
    }
  }

  console.log('\n5. Locate the input address within a block');
  if (result.boundaryOctet === null) {
    console.log('   /0 has no network/host boundary octet; all 32 bits are host bits.');
  } else {
    const octetNumber = result.boundaryOctet + 1;
    const maskOctet = Number(result.maskText.split('.')[result.boundaryOctet]);
    console.log(`   Boundary octet: ${octetNumber}; input value ${result.boundaryAddressValue}, mask value ${maskOctet}.`);
    console.log(`   Block size = 256 − ${maskOctet} = ${result.blockSize}`);
    console.log(`   Network boundary = floor(${result.boundaryAddressValue} ÷ ${result.blockSize}) × ${result.blockSize} = ${result.boundaryNetworkValue}`);
    console.log(`   Broadcast boundary = ${result.boundaryNetworkValue} + ${result.blockSize} − 1 = ${result.boundaryBroadcastValue}`);
    console.log('   Keep network bits unchanged; set remaining host bits to 0 for the network and 1 for the broadcast.');
  }

  console.log('\n6. List sibling subnets and find the one containing the input');
  console.log('   #    CIDR                  Network address     Usable range                              Broadcast');
  for (const subnet of result.subnets) {
    const marker = subnet.containsInput ? '  <<< YOUR IP IS IN THIS SUBNET' : '';
    console.log(
      `   ${String(subnet.number).padEnd(4)} ${subnet.cidr.padEnd(21)} ` +
      `${subnet.networkAddress.padEnd(19)} ${subnet.usable.padEnd(40)} ${subnet.broadcast}${marker}`,
    );
  }

  const selected = result.subnets.find(subnet => subnet.containsInput);
  console.log('\nFINAL ANSWER — THE SUBNET CONTAINING YOUR IP');
  console.log(`   Network:   ${selected.cidr}`);
  console.log(`   Usable:    ${selected.usable}`);
  console.log(`   Broadcast: ${selected.broadcast}`);
}

const cidr = process.argv[2];
if (!cidr || process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('IPv4 Subnet Calculator — detailed learning output');
  console.log('Usage: node subnet.js <IPv4/CIDR>');
  console.log('Example: node subnet.js 192.168.1.70/26');
  process.exit(cidr ? 0 : 1);
}

try {
  printSubnet(calculateSubnet(cidr));
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
}
