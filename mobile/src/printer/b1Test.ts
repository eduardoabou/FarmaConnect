/* eslint-disable no-bitwise, no-div-regex */
import type { BleManager, Characteristic, Subscription } from 'react-native-ble-plx';
import { buildPage, Cmd, exchange, handshake, LabelType, NoReplyError, parsePackets, printJob, type Link, type Packet, type RasterRow } from '@slastra/nblib';
import type { NormalLabel } from '../labels/normalLabel';
import { createNormalLabelRaster } from './normalLabelRaster';

const service = 'e7810a71-73ae-499d-8c15-faa9aef0c3f2';
const characteristic = 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f';
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function base64(bytes: Uint8Array) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += alphabet[(n >> 18) & 63] + alphabet[(n >> 12) & 63] + (i + 1 < bytes.length ? alphabet[(n >> 6) & 63] : '=') + (i + 2 < bytes.length ? alphabet[n & 63] : '=');
  }
  return out;
}
function unbase64(value: string) {
  const bytes: number[] = []; let n = 0; let bits = 0;
  for (const c of value.replace(/=+$/, '')) { n = (n << 6) | alphabet.indexOf(c); bits += 6; if (bits >= 8) { bits -= 8; bytes.push((n >> bits) & 255); } }
  return new Uint8Array(bytes);
}
class B1Link implements Link {
  private queue: Packet[] = []; private rest = new Uint8Array(); private listener: Subscription;
  constructor(private manager: BleManager, private id: string) {
    this.listener = manager.monitorCharacteristicForDevice(id, service, characteristic, (_error, value: Characteristic | null) => {
      if (!value?.value) return;
      const incoming = unbase64(value.value); const all = new Uint8Array(this.rest.length + incoming.length);
      all.set(this.rest); all.set(incoming, this.rest.length); const parsed = parsePackets(all); this.rest = new Uint8Array(parsed.rest); this.queue.push(...parsed.packets);
    });
  }
  async send(bytes: Uint8Array) {
    for (let i = 0; i < bytes.length; i += 180) { await this.manager.writeCharacteristicWithoutResponseForDevice(this.id, service, characteristic, base64(bytes.slice(i, i + 180))); if (i + 180 < bytes.length) await wait(10); }
  }
  async receive(commands: number[], timeout: number) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) { const i = this.queue.findIndex(item => commands.includes(item.cmd)); if (i >= 0) return this.queue.splice(i, 1)[0]; await wait(15); }
    return null;
  }
  close() { this.listener.remove(); }
}
async function printB1Rows(
  manager: BleManager,
  deviceId: string,
  rows: RasterRow[],
  sendingStatus: string,
  completeStatus: string,
  status: (value: string) => void,
) {
  const link = new B1Link(manager, deviceId);
  try {
    status('Preparando comunicação com a B1...'); await handshake(link); await wait(80);
    await exchange(link, Cmd.PrinterStatusData, [1]); await wait(80);
    try {
      for (const code of [8, 11, 13, 10, 7, 3, 12, 9]) {
        await exchange(link, Cmd.PrinterInfo, [code]);
        await wait(80);
      }
    } catch (error) {
      // Some B1 firmware revisions accept the protocol-3 connection but do
      // not implement the optional PrinterInfo queries. Printing itself does
      // not depend on these metadata responses.
      if (!(error instanceof NoReplyError)) throw error;
    }
    await exchange(link, Cmd.Heartbeat, [4]); status(sendingStatus);
    const page = buildPage(rows, { align: 'center' });
    await printJob(link, [async () => page], { density: 3, labelType: LabelType.WithGaps }); status(completeStatus);
  } finally { link.close(); }
}

export async function printB1NormalLabel(
  manager: BleManager,
  deviceId: string,
  label: NormalLabel,
  status: (value: string) => void,
) {
  return printB1Rows(
    manager,
    deviceId,
    createNormalLabelRaster(label),
    `Enviando etiqueta de ${label.productName}...`,
    'Etiqueta enviada para a impressora.',
    status,
  );
}
