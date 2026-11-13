import { isNiimbotB1 } from '../../src/components/PrinterSetup';

test('aceita os nomes anunciados pela NIIMBOT B1 e ignora outros dispositivos Bluetooth', () => {
  expect(isNiimbotB1({ id: '1', name: 'B1-I331121693', localName: null, rssi: -45 })).toBe(true);
  expect(isNiimbotB1({ id: '2', name: 'NIIMBOT B1', localName: null, rssi: -50 })).toBe(true);
  expect(isNiimbotB1({ id: '3', name: 'Fone da sala', localName: null, rssi: -35 })).toBe(false);
  expect(isNiimbotB1({ id: '4', name: null, localName: null, rssi: -40 })).toBe(false);
});
