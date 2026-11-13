import { BleManager } from 'react-native-ble-plx';
import type { NormalLabel } from '../labels/normalLabel';
import { printB1NormalLabel } from './b1Test';

let manager: BleManager | undefined;
let connectedDeviceId: string | undefined;

export class PrinterNotConnectedError extends Error {
  constructor() {
    super('A NIIMBOT B1 não está conectada.');
    this.name = 'PrinterNotConnectedError';
  }
}

export function getPrinterManager() {
  manager ??= new BleManager();
  return manager;
}

export function rememberConnectedPrinter(deviceId: string) {
  connectedDeviceId = deviceId;
}

export async function printWithConnectedPrinter(
  label: NormalLabel,
  status: (value: string) => void = () => {},
) {
  if (!connectedDeviceId) throw new PrinterNotConnectedError();
  const currentManager = getPrinterManager();
  if (!(await currentManager.isDeviceConnected(connectedDeviceId))) {
    connectedDeviceId = undefined;
    throw new PrinterNotConnectedError();
  }
  return printB1NormalLabel(currentManager, connectedDeviceId, label, status);
}
