import openapi from '../../../api-contract/openapi.yaml?raw';
import { sampleAppointment, sampleCustomer, sampleUser } from './types';

const yaml = openapi.split(/\r?\n/);

function schemaBlock(name: string): string[] {
  const start = yaml.findIndex((line) => line === `    ${name}:`);
  if (start < 0) throw new Error(`Şema bulunamadı: ${name}`);
  const block: string[] = [];
  for (const line of yaml.slice(start + 1)) {
    if (/^ {0,4}\S/.test(line)) break;
    block.push(line);
  }
  return block;
}

// Her `properties:` satırının doğrudan altındaki alan adlarını, bulunma sırasıyla döndürür.
function propertyGroups(block: string[]): string[][] {
  const groups: string[][] = [];
  block.forEach((line, i) => {
    const match = line.match(/^(\s*)properties:\s*$/);
    if (!match) return;
    const childIndent = match[1].length + 2;
    const names: string[] = [];
    for (const next of block.slice(i + 1)) {
      const indent = next.length - next.trimStart().length;
      if (next.trim() === '') continue;
      if (indent < childIndent) break;
      const key = next.match(new RegExp(`^ {${childIndent}}(\\w+):`));
      if (key) names.push(key[1]);
    }
    groups.push(names);
  });
  return groups;
}

const sorted = (values: string[]) => [...values].sort();

test('User keys match the contract', () => {
  expect(sorted(Object.keys(sampleUser))).toEqual(sorted(propertyGroups(schemaBlock('User'))[0]));
});

test('Customer keys match the contract', () => {
  const input = propertyGroups(schemaBlock('CustomerInput'))[0];
  const own = propertyGroups(schemaBlock('Customer'))[0];
  expect(sorted(Object.keys(sampleCustomer))).toEqual(sorted([...input, ...own]));
});

test('Appointment keys, including the nested customer, match the contract', () => {
  const input = propertyGroups(schemaBlock('AppointmentInput'))[0];
  const [own, nested] = propertyGroups(schemaBlock('Appointment'));
  expect(sorted(Object.keys(sampleAppointment))).toEqual(sorted([...input, ...own]));
  expect(sorted(Object.keys(sampleAppointment.customer))).toEqual(sorted(nested));
});
