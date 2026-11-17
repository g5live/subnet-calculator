import { calculateSubnet, formatIPv4, splitNetwork } from './subnet-core.js';

const questions = [
  {
    title: 'Site visit: verify a router interface',
    context: 'You are checking an installed network. The brief output gives you the interface IP and status, but it does not show the subnet mask. Check the interface configuration to find it.',
    evidence: [
      'Router# show ip interface brief',
      'Interface  IP-Address    OK? Method Status Protocol',
      'Gi0/0      192.168.1.70  YES manual up     up',
      '',
      'Router# show running-config interface GigabitEthernet0/0',
      'interface GigabitEthernet0/0',
      ' ip address 192.168.1.70 255.255.255.192',
    ].join('\n'),
    task: 'Work out the usable range. Would the proposed printer address 192.168.1.126 be in that range?',
    cidr: '192.168.1.70/26',
    check: '192.168.1.126 is the last usable address in this subnet. Check the address plan and existing assignments before using it; the calculation does not tell you whether it is free.',
  },
  {
    title: 'Event Wi-Fi: review a proposed DHCP pool',
    context: 'A venue has a separate network for an event. The handover gives the gateway address with a CIDR prefix and a proposed range for DHCP to hand out.',
    evidence: 'Gateway: 10.24.8.65/27\nProposed DHCP pool: 10.24.8.70 – 10.24.8.95',
    task: 'Calculate the full subnet range and decide whether both ends of the proposed pool are usable.',
    cidr: '10.24.8.65/27',
    check: 'The proposed pool ends at 10.24.8.95, the broadcast address. The upper limit must be at most 10.24.8.94, with any reserved or assigned addresses excluded.',
  },
  {
    title: 'Office fault: check a workstation’s subnet',
    context: 'A workstation cannot reach its configured gateway. You read the address settings locally before changing anything.',
    evidence: 'IPv4 address:    172.19.89.200\nSubnet mask:     255.255.254.0\nDefault gateway: 172.19.90.1',
    task: 'Calculate the usable range and check whether the configured gateway is on the same subnet.',
    cidr: '172.19.89.200/23',
    check: 'The subnet spans the third octets 88 and 89. The configured gateway 172.19.90.1 is outside it. Confirm the intended gateway and mask against the network plan.',
  },
  {
    title: 'CCTV handover: check the installer’s notes',
    context: 'You are reviewing the address plan for a small camera VLAN before connecting a new camera.',
    evidence: 'Switch VLAN interface: 192.168.50.33/28\nProposed camera IP:    192.168.50.48',
    task: 'Calculate the usable range and decide whether the proposed camera address belongs to it.',
    cidr: '192.168.50.33/28',
    check: '192.168.50.48 is the network address of the next /28. Choose a free address in the camera VLAN’s usable range after checking the address plan.',
  },
  {
    title: 'New installation: divide the allocated network',
    context: 'A venue is fitting out a new site. The installation brief calls for nine equal-sized networks for different teams.',
    evidence: 'Starting IP and prefix: 10.40.12.0/24\nEqual-sized networks needed: 9',
    task: 'Find the smallest equal split that meets the brief. Use the new prefix and fill in the network address and usable range of the first new subnet.',
    cidr: '10.40.12.0/24',
    networks: 9,
    check: 'Assign nine of the new blocks and keep seven spare. Check that 14 usable addresses per block is enough for each team before signing off the plan.',
  },
];

questions.push({
  title: 'Switch handover: verify the management VLAN',
  context: 'The switch responds locally but the handover may contain a wrong gateway. The detailed interface output gives you the configured prefix.',
  evidence: 'Switch# show ip interface Vlan20\nVlan20 is up, line protocol is up\n  Internet address is 10.20.4.34/28\nRecorded gateway: 10.20.4.46',
  task: 'Work out the subnet and usable range, then check whether the recorded gateway belongs to it.',
  cidr: '10.20.4.34/28',
  candidate: '10.20.4.46',
});

// Two or more examples per question family; numbered subnets count from 1.
for (const [site, cidr, networks, ordinal] of [
  ['Conference venue', '10.40.12.0/24', 9, 7],
  ['Training rooms', '192.168.20.0/24', 4, 3],
  ['Warehouse zones', '172.20.40.0/24', 5, 5],
  ['Library branches', '10.60.0.0/22', 3, 2],
  ['Festival zones', '172.16.16.0/20', 6, 6],
  ['Small office VLANs', '192.168.90.0/24', 2, 2],
]) {
  questions.push({
    title: `${site}: divide the allocated network`,
    context: 'The installation brief calls for equal-sized subnets. Count the first block in the allocation as subnet 1.',
    evidence: `Allocated network: ${cidr}\nNetworks required: ${networks}\nReport subnet number: ${ordinal}`,
    task: `Find the smallest equal split that meets the brief, then work out the range for subnet ${ordinal}.`,
    cidr, networks, ordinal,
  });
}

for (const [site, cidr, hosts] of [
  ['Nine tills', '192.168.40.0/24', 9],
  ['Training laptops', '10.30.16.0/24', 30],
  ['Guest devices', '172.17.20.0/24', 31],
  ['Office expansion', '10.32.8.0/22', 120],
  ['Stockroom scanners', '192.168.75.0/24', 6],
  ['Camera upgrade', '172.22.16.0/23', 62],
]) {
  questions.push({
    title: `${site}: size a subnet for devices`,
    context: 'The site needs one subnet for these devices. Use the smallest block that fits, starting at the beginning of the allocation.',
    evidence: `Allocated network: ${cidr}\nUsable host addresses required: ${hosts}`,
    task: 'Find how many bits to leave for hosts, then work out the first block and its usable range.',
    cidr, hosts,
  });
}

for (const [site, cidr, mask, candidate, kind] of [
  ['Reception printer', '192.168.4.83/26', '255.255.255.192', '192.168.4.127', 'device'],
  ['Workshop PC', '10.8.4.129/25', '255.255.255.128', '10.8.4.130', 'gateway'],
  ['Café till', '172.18.7.70/27', '255.255.255.224', '172.18.7.97', 'gateway'],
  ['Hotel front desk', '10.23.7.200/23', '255.255.254.0', '10.23.6.1', 'gateway'],
  ['Lighting controller', '192.168.17.34/28', '255.255.255.240', '192.168.17.32', 'device'],
  ['Office DHCP scope', '172.27.32.129/25', '255.255.255.128', '172.27.32.254', 'dhcp'],
  ['Door controllers', '10.44.12.18/29', null, '10.44.12.22', 'device'],
  ['Visitor Wi-Fi', '192.168.60.2/27', null, '192.168.60.31', 'dhcp'],
  ['Campus support desk', '172.20.37.110/22', null, '172.20.36.1', 'gateway'],
  ['Small WAN handoff', '198.51.100.5/30', null, '198.51.100.6', 'device'],
  ['Lab router uplink', '203.0.113.13/30', null, '203.0.113.15', 'device'],
  ['Office Linux client', '10.12.7.66/24', null, '10.12.8.1', 'gateway'],
]) {
  const label = { device: 'Proposed device address', gateway: 'Configured gateway', dhcp: 'Proposed DHCP upper limit' }[kind];
  questions.push({
    title: `${site}: verify the address plan`,
    context: 'You are checking the recorded IPv4 settings before making a change.',
    evidence: `${mask ? `IPv4 address: ${cidr.split('/')[0]}\nSubnet mask: ${mask}` : `Address and prefix: ${cidr}`}\n${label}: ${candidate}`,
    task: 'Work out the subnet and decide whether the recorded address falls in its usable range.',
    cidr, candidate,
  });
}

for (const [site, cidr, larger, hosts] of [
  ['Hotel refurb', '10.50.30.0/24', 60, 28],
  ['Depot extension', '172.18.24.0/23', 110, 45],
]) {
  questions.push({
    title: `${site}: allocate different sized subnets`,
    context: 'The handover calls for two LANs of different sizes. Allocate the smallest fitting block for the larger LAN first, at the start of the allocation. Place the smaller LAN directly after it.',
    evidence: `Allocated network: ${cidr}\nLarger LAN: ${larger} usable hosts\nSmaller LAN: ${hosts} usable hosts`,
    task: 'Complete the steps for the smaller LAN. First work out how much space the larger LAN uses.',
    cidr, larger, hosts,
  });
}

for (const [site, cidr] of [
  ['Core router interconnect', '192.0.2.11/31'],
  ['Backup WAN link', '10.90.0.8/31'],
  ['Monitoring loopback', '10.40.200.9/32'],
  ['Single management route', '172.18.4.77/32'],
]) {
  const pointToPoint = cidr.endsWith('/31');
  questions.push({
    title: `${site}: check a special prefix`,
    context: pointToPoint ? 'This is a point-to-point link. Both addresses in the /31 are endpoints.' : 'This prefix identifies a single address. The start and end of the block are the same.',
    evidence: `Configured address: ${cidr}`,
    task: 'Fill in the block boundaries and usable addresses. Use the upper address of the block in the range end box.',
    cidr,
  });
}

const el = id => document.getElementById(id);
const form = el('practice-answers');
const working = el('practice-working');
const fieldNames = ['prefix', 'increment', 'network', 'broadcast', 'first', 'last'];
const noteNames = [...fieldNames, 'bits', 'mask', 'parent-mask', 'larger'];
const weights = [128, 64, 32, 16, 8, 4, 2, 1];
let currentIndex = questions.findIndex(question => question.title.startsWith('New installation'));
let remaining = questions.map((_, index) => index).filter(index => index !== currentIndex);
let lesson;
let selectedBits;
const selectedMasks = {};

function buildLesson(question) {
  const parent = calculateSubnet(question.cidr);
  const ordinal = question.ordinal ?? 1;
  const split = question.networks ? splitNetwork(question.cidr, question.networks) : null;
  const hostBits = question.hosts ? Math.ceil(Math.log2(question.hosts + 2)) : null;
  const largerSize = question.larger ? 2 ** Math.ceil(Math.log2(question.larger + 2)) : 0;
  const childCidr = split?.subnets[ordinal - 1].cidr ??
    (hostBits === null ? question.cidr : `${formatIPv4(parent.network + largerSize)}/${32 - hostBits}`);
  const result = calculateSubnet(childCidr);
  return {
    parent, split, ordinal, result, largerSize,
    bits: split?.borrowedBits ?? hostBits,
    expected: {
      prefix: String(result.prefix),
      increment: String(result.blockSize),
      network: result.networkAddress,
      broadcast: result.broadcastAddress,
      first: formatIPv4(result.network + (result.prefix < 31 ? 1 : 0)),
      last: formatIPv4(result.broadcast - (result.prefix < 31 ? 1 : 0)),
    },
  };
}

function bitButton(text, label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  button.setAttribute('aria-label', label);
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', onClick);
  return button;
}

const borrowButtons = weights.map((weight, index) => bitButton(
  weight, `Select ${8 - index} bits, from weight ${weight} through 1`, () => selectBits(8 - index),
));
el('borrow-bits').replaceChildren(...borrowButtons);
function createMaskButtons(containerId, noteName) {
  const buttons = Array.from({ length: 32 }, (_, index) => bitButton(
    '0', `Set mask boundary after bit ${index + 1}, weight ${weights[index % 8]}`,
    () => selectMask(noteName, index + 1),
  ));
  el(containerId).replaceChildren(...Array.from({ length: 4 }, (_, index) => {
    const octet = document.createElement('div');
    octet.className = 'practice-bit-row';
    octet.append(...buttons.slice(index * 8, index * 8 + 8));
    return octet;
  }));
  return buttons;
}

const maskButtons = {
  mask: createMaskButtons('mask-bits', 'mask'),
  'parent-mask': createMaskButtons('parent-mask-bits', 'parent-mask'),
};

function selectBits(count) {
  selectedBits = count;
  borrowButtons.forEach((button, index) => {
    button.setAttribute('aria-pressed', String(count !== null && index >= 8 - count));
  });
  el('borrow-selection').textContent = count === null ? '' : `Bits selected: ${count}`;
  setNote('bits', null);
}

function selectMask(name, prefix) {
  selectedMasks[name] = prefix;
  maskButtons[name].forEach((button, index) => {
    const selected = prefix !== null && index < prefix;
    button.textContent = selected ? '1' : '0';
    button.setAttribute('aria-pressed', String(selected));
  });
  setNote(name, null);
}

function setNote(name, correct) {
  const note = el(`answer-${name}-note`);
  if (correct === null) {
    note.textContent = '';
    delete note.dataset.status;
    return;
  }
  note.textContent = { blank: '? Enter an answer', correct: '✓ Correct', incorrect: '✗ Try again' }[correct];
  note.dataset.status = correct;
}

function showQuestion(index) {
  currentIndex = index;
  const question = questions[index];
  lesson = buildLesson(question);
  el('question-title').textContent = question.title;
  el('question-context').textContent = question.context;
  el('question-evidence').textContent = question.evidence;
  el('question-task').textContent = question.task;
  el('range-end-label').textContent = lesson.result.prefix < 31
    ? 'Broadcast address (end of the block)' : 'Last address in the block';
  el('borrow-work').hidden = lesson.bits === null;
  el('larger-work').hidden = !lesson.largerSize;
  el('parent-mask-work').hidden = !lesson.split;
  el('mask-guide').textContent = lesson.split
    ? 'Extend the prefix by marking the last network bit of the new mask.'
    : '2a. Mark the last network bit of the mask. All bits before it are reserved too.';
  el('borrow-guide').textContent = lesson.split
    ? 'Choose how many host bits to borrow. Start from the right of the weight row; each bit doubles the number of networks.'
    : 'Choose how many bits to leave for hosts. Start from the right of the weight row; remember the network and broadcast addresses.';
  form.reset();
  selectBits(null);
  selectMask('mask', null);
  selectMask('parent-mask', null);
  noteNames.forEach(name => setNote(name, null));
  el('practice-progress').textContent = '';
  working.open = false;
  working.hidden = true;
  el('practice-steps').replaceChildren();
  el('practice-check').textContent = '';
}

function pickRandomQuestion() {
  if (!remaining.length) {
    remaining = questions.map((_, index) => index).filter(index => index !== currentIndex);
  }
  const position = Math.floor(Math.random() * remaining.length);
  showQuestion(remaining.splice(position, 1)[0]);
}

function renderWorking() {
  const question = questions[currentIndex];
  const { parent, split, ordinal, result, expected, bits, largerSize } = lesson;
  const { prefix, maskText, maskBits, blockSize, boundaryOctet, boundaryAddressValue,
    boundaryNetworkValue, totalAddresses, networkAddress, broadcastAddress } = result;
  const maskOctet = maskText.split('.')[boundaryOctet];
  const prefixStep = split
    ? `1 · Find the new prefix: 2^${bits - 1} = ${split.subnetCount / 2} is too few; 2^${bits} = ${split.subnetCount} gives ${split.requestedCount} needed and ${split.spareCount} spare. Borrow ${bits} bits: /${parent.prefix} + ${bits} = /${prefix}.`
    : question.hosts
      ? `1 · Find the prefix: 2^${bits - 1} − 2 = ${2 ** (bits - 1) - 2} is too few; 2^${bits} − 2 = ${2 ** bits - 2} fits ${question.hosts}. Leave ${bits} host bits: 32 − ${bits} = /${prefix}.`
      : `1 · Find the prefix: ${maskText} is ${maskBits} in binary. The ${prefix} consecutive ones give /${prefix}.`;
  const locate = split
    ? `Start at ${parent.networkAddress}. Subnet ${ordinal} is ${ordinal - 1} blocks after the first: ${ordinal - 1} × ${totalAddresses} = ${(ordinal - 1) * totalAddresses} addresses forward → ${networkAddress}.`
    : largerSize
      ? `The larger LAN needs ${question.larger} usable addresses, so it takes ${largerSize} addresses starting at ${parent.networkAddress}. Move forward ${largerSize} addresses to start the smaller block at ${networkAddress}.`
      : `In octet ${boundaryOctet + 1}, round ${boundaryAddressValue} down to the nearest multiple of ${blockSize} → ${boundaryNetworkValue}. Keep earlier octets and zero any later ones → ${networkAddress}.`;
  const descriptions = [
    prefixStep,
    `2a · Build the mask: ${split ? `The starting /${parent.prefix} mask is ${parent.maskText}. Extend it by ${bits} bits. ` : ''}Set the first ${prefix} bits to 1 and leave ${32 - prefix} at 0 → ${maskBits} = ${maskText}.`,
    `2b · Find the increment: in octet ${boundaryOctet + 1}, 256 − ${maskOctet} = ${blockSize}. This is also the weight of the final 1 in the mask. Each block has 2^${32 - prefix} = ${totalAddresses} addresses.`,
    `3a · Find the full range: ${locate} Add ${totalAddresses} − 1 to the network address to get the last address → ${networkAddress} to ${broadcastAddress}.`,
    prefix === 31
      ? `3b · Find usable addresses: on a point-to-point /31, both ${expected.first} and ${expected.last} are usable; there is no directed broadcast address for the link.`
      : prefix === 32
        ? `3b · Find usable addresses: a /32 identifies just ${expected.first}. There is no separate broadcast address or host range.`
        : `3b · Find usable addresses: network + 1 = ${expected.first}; broadcast − 1 = ${expected.last}. That leaves ${totalAddresses - 2} usable addresses.`,
  ];
  el('practice-steps').replaceChildren(...descriptions.map(text => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }));
  const candidate = question.candidate ? calculateSubnet(`${question.candidate}/${prefix}`).ip : null;
  el('practice-check').textContent = question.check ?? (candidate === null ? '' :
    `${question.candidate} is ${candidate > result.network && candidate < result.broadcast ? 'inside' : 'outside'} the usable range. A valid range alone does not prove an address is available or a device is reachable.`);
  working.hidden = false;
}

function markAnswers(event) {
  event.preventDefault();
  const actual = Object.fromEntries(fieldNames.map(name => [name, el(`answer-${name}`).value.trim()]));
  actual.prefix = actual.prefix.replace(/^\//, '');
  const { bits, result, expected } = lesson;
  const checks = Object.entries(expected).map(([name, value]) => [name, actual[name], value]);
  checks.push(['mask', selectedMasks.mask, result.prefix]);
  if (lesson.split) checks.push(['parent-mask', selectedMasks['parent-mask'], lesson.parent.prefix]);
  if (lesson.largerSize) checks.push(['larger', el('answer-larger').value.trim(), String(lesson.largerSize)]);
  if (bits !== null) checks.push(['bits', selectedBits, bits]);
  let answered = 0;
  let correct = 0;
  for (const [name, value, target] of checks) {
    const blank = value === '' || value === null;
    const match = value === target;
    if (!blank) answered++;
    if (match) correct++;
    setNote(name, blank ? 'blank' : match ? 'correct' : 'incorrect');
  }
  el('practice-progress').textContent = answered < checks.length
    ? `${correct} correct so far. Fill in every part to unlock the worked solution.`
    : `${correct} of ${checks.length} correct. The worked solution is now available.`;
  if (answered === checks.length && working.hidden) renderWorking();
}

el('random-question').addEventListener('click', pickRandomQuestion);
form.addEventListener('submit', markAnswers);
showQuestion(currentIndex);
