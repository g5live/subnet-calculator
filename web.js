import { calculateSubnet, formatBinary, getNearbySubnets } from './subnet-core.js';

const form = document.querySelector('#subnet-form');
const input = document.querySelector('#cidr-input');
const error = document.querySelector('#error-message');
const output = document.querySelector('#results');

function addMathLine(parent, label, value) {
  const row = document.createElement('div');
  row.className = 'math-line';
  const name = document.createElement('div');
  name.className = 'math-label';
  name.textContent = label;
  const calculation = document.createElement('div');
  calculation.className = 'math-value';
  calculation.textContent = value;
  row.append(name, calculation);
  parent.append(row);
}

function addBinaryLegend(parent, prefix) {
  const legend = document.createElement('div');
  legend.className = 'bit-legend';
  const network = document.createElement('span');
  network.className = 'legend-item';
  const networkSwatch = document.createElement('i');
  networkSwatch.className = 'network-swatch';
  network.append(networkSwatch, document.createTextNode(`Network-prefix bits (first ${prefix}; mask bits are 1)`));
  const host = document.createElement('span');
  host.className = 'legend-item';
  const hostSwatch = document.createElement('i');
  hostSwatch.className = 'host-swatch';
  host.append(hostSwatch, document.createTextNode(`Host-address bits (remaining ${32 - prefix}; mask bits are 0)`));
  legend.append(network, host);
  parent.append(legend);
}

function addBinaryLine(parent, label, value, prefix) {
  const row = document.createElement('div');
  row.className = 'binary-row';
  const name = document.createElement('span');
  name.className = 'binary-label';
  name.textContent = label;
  const bits = document.createElement('span');
  bits.className = 'binary-value';
  bits.setAttribute('role', 'img');
  bits.setAttribute('aria-label', `${label}: ${value}. Network and host positions are colour-coded.`);
  value.split('.').forEach((octet, octetIndex) => {
    const group = document.createElement('span');
    group.className = 'octet-bits';
    for (const [bitIndex, bit] of [...octet].entries()) {
      const item = document.createElement('span');
      const absoluteIndex = octetIndex * 8 + bitIndex;
      item.className = `binary-bit ${absoluteIndex < prefix ? 'network-bit' : 'host-bit'}`;
      item.textContent = bit;
      group.append(item);
    }
    bits.append(group);
    if (octetIndex < 3) {
      const separator = document.createElement('span');
      separator.className = 'octet-separator';
      separator.textContent = '·';
      bits.append(separator);
    }
  });
  row.append(name, bits);
  parent.append(row);
}

function addPanel(parent, kind, number, title, description) {
  const panel = document.createElement('section');
  panel.className = `panel ${kind}`;
  const heading = document.createElement('div');
  heading.className = 'panel-heading';
  const badge = document.createElement('span');
  badge.className = 'step-number';
  badge.textContent = number;
  const text = document.createElement('div');
  const titleElement = document.createElement('h3');
  titleElement.textContent = title;
  const explain = document.createElement('p');
  explain.textContent = description;
  text.append(titleElement, explain);
  heading.append(badge, text);
  panel.append(heading);
  parent.append(panel);
  return panel;
}

function makeViewGroup(panel, views, defaultView) {
  const controls = document.createElement('div');
  controls.className = 'view-buttons';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Choose a view');
  const content = document.createElement('div');
  content.className = 'view-content';
  const entries = [];

  for (const view of views) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'view-button';
    button.textContent = view.label;
    button.setAttribute('aria-pressed', String(view.id === defaultView));
    const body = document.createElement('div');
    body.className = 'view-panel';
    body.hidden = view.id !== defaultView;
    view.render(body);
    button.addEventListener('click', () => {
      for (const entry of entries) {
        const active = entry.id === view.id;
        entry.button.setAttribute('aria-pressed', String(active));
        entry.body.hidden = !active;
      }
    });
    entries.push({ id: view.id, button, body });
    controls.append(button);
    content.append(body);
  }
  panel.append(controls, content);
}

function addPrefixAssumption(parent, result) {
  if (!result.prefixWasInferred) return;
  const note = document.createElement('p');
  note.className = 'assumption-note';
  note.textContent = `Prefix inferred as /${result.prefix} from the traditional Class ${result.classification.className} default. An address alone does not reveal its configured subnet mask; use the actual prefix if you know it.`;
  parent.append(note);
}

function addClassView(parent, result) {
  const info = result.classification;
  const classCard = document.createElement('div');
  classCard.className = 'class-summary';
  const classTitle = document.createElement('h4');
  classTitle.textContent = `Historical IPv4 Class ${info.className}`;
  classCard.append(classTitle);
  const firstOctet = document.createElement('p');
  firstOctet.textContent = `First octet: ${info.firstOctet}. Class range: ${info.classRange}.`;
  classCard.append(firstOctet);
  const calculation = document.createElement('p');
  calculation.className = 'class-calculation';
  calculation.textContent = info.legacyPrefix === null
    ? `The first octet ${info.firstOctet} falls in a special class with no normal classful host default.`
    : `Class ${info.className} is identified by first octet ${info.firstOctet} in the range ${info.classRange}; its historic default prefix is /${info.legacyPrefix}.`;
  classCard.append(calculation);
  const purpose = document.createElement('p');
  purpose.textContent = info.historicalPurpose;
  classCard.append(purpose);
  if (info.legacyPrefix !== null) {
    const actual = document.createElement('p');
    actual.className = 'class-current-prefix';
    actual.textContent = result.prefixWasInferred
      ? `This input had no slash prefix, so the calculator assumed /${result.prefix}.`
      : `The entered /${result.prefix} is the calculation prefix. It takes precedence over historical Class ${info.className} defaults.`;
    classCard.append(actual);
  }
  parent.append(classCard);

  const allocation = document.createElement('div');
  allocation.className = `allocation-card ${info.allocation.category.startsWith('Private') ? 'private' : info.allocation.category.startsWith('Public') ? 'public' : 'special'}`;
  const allocationTitle = document.createElement('h4');
  allocationTitle.textContent = info.allocation.category;
  allocation.append(allocationTitle);
  const allocationPurpose = document.createElement('p');
  allocationPurpose.textContent = info.allocation.matchedRange
    ? `${info.allocation.matchedRange}: ${info.allocation.purpose}`
    : info.allocation.purpose;
  allocation.append(allocationPurpose);
  parent.append(allocation);

  const note = document.createElement('p');
  note.className = 'range-note';
  note.textContent = 'Class A/B/C is a historical classification. Modern networks use CIDR prefixes. “Public/unicast candidate” means it is outside the private and common special-use ranges checked here; it does not guarantee the address is allocated or reachable on the Internet.';
  parent.append(note);

  const sources = document.createElement('p');
  sources.className = 'class-sources';
  const rfc = document.createElement('a');
  rfc.href = 'https://www.rfc-editor.org/rfc/rfc1918';
  rfc.target = '_blank';
  rfc.rel = 'noopener noreferrer';
  rfc.textContent = 'RFC 1918 private ranges';
  const iana = document.createElement('a');
  iana.href = 'https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml';
  iana.target = '_blank';
  iana.rel = 'noopener noreferrer';
  iana.textContent = 'IANA special-purpose registry';
  sources.append(rfc, document.createTextNode(' · '), iana);
  parent.append(sources);
}

function createRangeTable(subnets) {
  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const label of ['Subnet', 'Network address', 'Usable range', 'Broadcast address', 'Input']) {
    const th = document.createElement('th');
    th.textContent = label;
    headRow.append(th);
  }
  thead.append(headRow);
  const tbody = document.createElement('tbody');
  for (const subnet of subnets) {
    const row = document.createElement('tr');
    if (subnet.containsInput) row.className = 'selected';
    for (const value of [subnet.cidr, subnet.networkAddress, subnet.usable, subnet.broadcast]) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    }
    const marker = document.createElement('td');
    if (subnet.containsInput) {
      const badge = document.createElement('span');
      badge.className = 'in-this-subnet';
      badge.textContent = '← YOUR IP IS HERE';
      marker.append(badge);
    } else {
      marker.textContent = '—';
    }
    row.append(marker);
    tbody.append(row);
  }
  table.append(thead, tbody);
  wrap.append(table);
  return wrap;
}

function render(result) {
  output.replaceChildren();
  const layout = document.createElement('div');
  layout.className = 'results-grid';
  output.append(layout);

  const lesson = addPanel(layout, 'lesson', '1', 'Understanding the Pieces', 'IPv4 has 32 bits. The prefix marks the network portion; the bits left over identify addresses within each subnet.');
  const lessons = document.createElement('ol');
  lessons.className = 'lesson-list';
  for (const item of [
    `/${result.prefix} allocates ${result.prefix} network bits; ${result.hostBits} host bits remain.`,
    result.parentPrefix === null
      ? '/0 covers the whole IPv4 address space, so it has no larger parent block.'
      : `The sibling comparison uses the enclosing ${result.parentNetworkAddress}/${result.parentPrefix} whole-octet block. This is a teaching frame, not classful A/B/C addressing.`,
  ]) {
    const li = document.createElement('li');
    li.textContent = item;
    lessons.append(li);
  }
  lesson.append(lessons);
  addPrefixAssumption(lesson, result);

  const calculations = addPanel(layout, 'calculation', '2', 'Calculation Views', 'Quick Calculation by default, with more levels of detail at a click of a button.');
  const selected = result.subnets.find(subnet => subnet.containsInput);
  const views = [
    {
      id: 'quick', label: 'Quick Calculation', render: panel => {
        addMathLine(panel, 'Host bits → addresses', `32 − ${result.prefix} = ${result.hostBits};  2^${result.hostBits} = ${result.totalAddresses} IP addresses`);
        addMathLine(panel, 'Subnet mask', `/${result.prefix} → ${result.maskText}`);
        addMathLine(panel, 'Matching network', `${selected.cidr} · ${selected.usable} · broadcast ${selected.broadcast}`);
        if (result.parentPrefix !== null) addMathLine(panel, 'Subnets in enclosing block', `2^(${result.prefix} − ${result.parentPrefix}) = ${result.subnetCount}`);
        addPrefixAssumption(panel, result);
      },
    },
    {
      id: 'steps', label: 'Step-by-Step', render: panel => {
        const steps = document.createElement('ol');
        steps.className = 'deep-steps';
        const stepData = [
          ['Count host bits', `32 total IPv4 bits − ${result.prefix} network bits = ${result.hostBits} host bits.`],
          ['Calculate addresses', `2^${result.hostBits} = ${result.powersExpression} = ${result.totalAddresses} addresses per subnet.`],
          ['Build the mask', `The first ${result.prefix} mask bits are 1; the remaining ${result.hostBits} are 0. Dotted mask: ${result.maskText}.`],
          ['Count child subnets', result.parentPrefix === null ? '/0 is the whole IPv4 space.' : `In ${result.parentNetworkAddress}/${result.parentPrefix}, add ${result.prefix} − ${result.parentPrefix} = ${result.subnetBits} subnet bits; 2^${result.subnetBits} = ${result.subnetCount} subnets.`],
          ['Find this address block', result.boundaryOctet === null ? 'There is no smaller boundary in /0.' : `Block = 256 − ${Number(result.maskText.split('.')[result.boundaryOctet])} = ${result.blockSize}; floor(${result.boundaryAddressValue} ÷ ${result.blockSize}) × ${result.blockSize} = ${result.boundaryNetworkValue}; broadcast boundary = ${result.boundaryNetworkValue} + ${result.blockSize} − 1 = ${result.boundaryBroadcastValue}.`],
        ];
        for (const [title, description] of stepData) {
          const li = document.createElement('li');
          const strong = document.createElement('strong');
          strong.textContent = `${title}: `;
          li.append(strong, document.createTextNode(description));
          steps.append(li);
        }
        panel.append(steps);
        if (result.prefixWasInferred) addPrefixAssumption(panel, result);
      },
    },
    {
      id: 'binary', label: 'Binary View', render: panel => {
        addBinaryLegend(panel, result.prefix);
        addBinaryLine(panel, 'IP address', result.ipBits, result.prefix);
        addBinaryLine(panel, 'Subnet mask', result.maskBits, result.prefix);
        addBinaryLine(panel, 'Network ID (IP AND mask)', `${result.networkBits} = ${result.networkAddress}`, result.prefix);
        addBinaryLine(panel, 'Host-bit mask', `${formatBinary(result.wildcard)} = ${result.wildcardText}`, result.prefix);
        addBinaryLine(panel, result.prefix <= 30 ? 'Broadcast (host bits set to 1)' : 'Upper value (no broadcast for /31 or /32)', `${result.broadcastBits} = ${result.broadcastAddress}`, result.prefix);
        if (result.prefixWasInferred) addPrefixAssumption(panel, result);
      },
    },
    {
      id: 'class', label: 'IPv4 Class', render: panel => addClassView(panel, result),
    },
  ];
  makeViewGroup(calculations, views, 'quick');

  const answer = addPanel(layout, 'answer', '3', 'The Answer', 'After just the simple things in life? Look no further!');
  const answerTitle = document.createElement('div');
  answerTitle.className = 'answer-title';
  answerTitle.textContent = 'Your network';
  const network = document.createElement('p');
  network.className = 'answer-network';
  network.textContent = selected.cidr;
  const answerGrid = document.createElement('div');
  answerGrid.className = 'answer-grid';
  for (const [label, value] of [
    ['Usable addresses', selected.usable],
    ['Broadcast address', selected.broadcast],
    ['Total addresses', String(result.totalAddresses)],
  ]) {
    const item = document.createElement('div');
    item.className = 'answer-item';
    const caption = document.createElement('span');
    caption.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = value;
    item.append(caption, strong);
    answerGrid.append(item);
  }
  answer.append(answerTitle, network, answerGrid);
  addPrefixAssumption(answer, result);

  const ranges = addPanel(layout, 'lesson', '4', 'Subnet Ranges', 'Quick View shows the matching subnet and nearest neighbours. Full Subnet shows every sibling range.');
  const nearby = getNearbySubnets(result.subnets);
  const quickPanel = document.createElement('div');
  quickPanel.className = 'range-view';
  quickPanel.append(createRangeTable(nearby.subnets));
  const viewNote = document.createElement('p');
  viewNote.className = 'range-note';
  viewNote.textContent = `Showing ${nearby.subnets.length} of ${result.subnetCount} subnets; the highlighted row is the one containing the input address.`;
  quickPanel.append(viewNote);
  const fullPanel = document.createElement('div');
  fullPanel.className = 'range-view';
  fullPanel.append(createRangeTable(result.subnets));
  const fullNote = document.createElement('p');
  fullNote.className = 'range-note';
  fullNote.textContent = `Full sibling list: ${result.subnetCount} subnets inside ${result.parentNetworkAddress}/${result.parentPrefix ?? 0}.`;
  fullPanel.append(fullNote);
  makeViewGroup(ranges, [
    { id: 'nearby', label: 'Quick View', render: panel => panel.append(quickPanel) },
    { id: 'all', label: 'Full Subnet', render: panel => panel.append(fullPanel) },
  ], 'nearby');
  const note = document.createElement('p');
  note.className = 'range-note';
  note.textContent = result.prefix >= 31
    ? 'Special case: /31 is used for point-to-point links and has no broadcast address; /32 identifies one host route.'
    : 'For ordinary subnets, network and broadcast addresses are included in the total but cannot be assigned to hosts.';
  ranges.append(note);
}

form.addEventListener('submit', event => {
  event.preventDefault();
  error.textContent = '';
  try {
    render(calculateSubnet(input.value));
    input.removeAttribute('aria-invalid');
  } catch (exception) {
    output.replaceChildren();
    error.textContent = exception.message;
    input.setAttribute('aria-invalid', 'true');
  }
});

form.requestSubmit();
