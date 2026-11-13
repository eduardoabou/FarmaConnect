export const State = { PoweredOn: 'PoweredOn' };

export class BleManager {
  state = jest.fn().mockResolvedValue(State.PoweredOn);
  stopDeviceScan = jest.fn();
  startDeviceScan = jest.fn();
  connectToDevice = jest.fn();
  destroy = jest.fn().mockResolvedValue(undefined);
}
