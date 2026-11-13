export const Cmd = { PrinterStatusData: 0xa5, PrinterInfo: 0x40, Heartbeat: 0xdc };
export const LabelType = { WithGaps: 1 };
export class NoReplyError extends Error {}
export const parsePackets = () => ({ packets: [], rest: new Uint8Array() });
export const handshake = jest.fn();
export const exchange = jest.fn();
export const printJob = jest.fn();
export const buildPage = jest.fn();
