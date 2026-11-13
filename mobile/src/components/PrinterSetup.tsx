import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { State, type Device } from 'react-native-ble-plx';
import {
  getPrinterManager,
  rememberConnectedPrinter,
} from '../printer/printerSession';
import { theme } from '../theme';

type Printer = Pick<Device, 'id' | 'name' | 'localName' | 'rssi'>;

function deviceName(device: Printer) {
  return device.name ?? device.localName ?? 'NIIMBOT B1 (nome não anunciado)';
}

export function isNiimbotB1(device: Printer) {
  const name = `${device.name ?? ''} ${device.localName ?? ''}`.trim();
  return /NIIMBOT|\bB1[-_\s]/i.test(name);
}

async function requestBluetoothPermissions() {
  if (Platform.OS !== 'android') return true;
  const permissions =
    Platform.Version >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
  const result = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every(
    permission => result[permission] === PermissionsAndroid.RESULTS.GRANTED,
  );
}

export function PrinterSetup({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const manager = getPrinterManager();
  const [devices, setDevices] = useState<Printer[]>([]);
  const [status, setStatus] = useState('Procure a NIIMBOT B1 ligada e próxima.');
  const [scanning, setScanning] = useState(false);
  const [connectingId, setConnectingId] = useState<string>();
  const scanTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const stopScanning = () => {
    if (scanTimeout.current) {
      clearTimeout(scanTimeout.current);
      scanTimeout.current = undefined;
    }
    manager.stopDeviceScan();
    setScanning(false);
  };

  const scan = async () => {
    setDevices([]);
    const granted = await requestBluetoothPermissions();
    if (!granted) {
      setStatus('Autorize o Bluetooth para procurar a impressora.');
      return;
    }
    if ((await manager.state()) !== State.PoweredOn) {
      setStatus('Ative o Bluetooth do celular e tente novamente.');
      return;
    }
    setStatus('Procurando dispositivos Bluetooth...');
    setScanning(true);
    manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (error) {
        stopScanning();
        setStatus('Não foi possível procurar dispositivos.');
        return;
      }
      if (!device) return;
      if (!isNiimbotB1(device)) return;
      setDevices(current =>
        current.some(item => item.id === device.id) ? current : [...current, device],
      );
    });
    scanTimeout.current = setTimeout(() => {
      scanTimeout.current = undefined;
      manager.stopDeviceScan();
      setScanning(false);
      setStatus('Busca finalizada. Se a B1 não apareceu, confirme que ela está ligada e próxima.');
    }, 10000);
  };

  const connect = async (device: Printer) => {
    try {
      stopScanning();
      setConnectingId(device.id);
      setStatus(`Conectando a ${deviceName(device)}...`);
      const connected = await manager.connectToDevice(device.id, { timeout: 10000 });
      await connected.discoverAllServicesAndCharacteristics();
      rememberConnectedPrinter(connected.id);
      setStatus('Impressora conectada. Pronta para imprimir.');
      onClose();
    } catch {
      setStatus('Não foi possível conectar. Aproxime a B1 e tente novamente.');
    } finally {
      setConnectingId(undefined);
    }
  };

  useEffect(() => {
    if (!visible) {
      manager.stopDeviceScan();
      setScanning(false);
    }
    return () => {
      if (scanTimeout.current) {
        clearTimeout(scanTimeout.current);
        scanTimeout.current = undefined;
      }
      manager.stopDeviceScan();
    };
  }, [manager, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar conexão da impressora"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={styles.card} accessibilityViewIsModal>
          <ScrollView
            contentContainerStyle={styles.cardContent}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
          >
          <Text style={styles.title}>Impressora NIIMBOT B1</Text>
          <Text style={styles.description}>{status}</Text>
          <Pressable accessibilityRole="button" onPress={() => scan().catch(() => {})} style={styles.primary}>
            {scanning ? <ActivityIndicator color={theme.colors.white} /> : <Text style={styles.primaryText}>Procurar impressora</Text>}
          </Pressable>
          <View style={styles.deviceList}>
            {devices.map(device => (
              <Pressable key={device.id} accessibilityRole="button" disabled={Boolean(connectingId)} onPress={() => connect(device)} style={styles.device}>
                <Text style={styles.deviceName}>{deviceName(device)}</Text>
                <Text style={styles.deviceMeta}>
                  {connectingId === device.id ? 'Conectando...' : `ID: ${device.id} · Conectar`}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
            <Text style={styles.closeText}>Fechar</Text>
          </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  backdrop: StyleSheet.absoluteFill,
  card: { backgroundColor: theme.colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%' },
  cardContent: { padding: 24, gap: 12 },
  title: { color: theme.colors.text, fontSize: 23, fontWeight: '700' },
  description: { color: theme.colors.muted, fontSize: 15, lineHeight: 21 },
  primary: { minHeight: 48, backgroundColor: theme.colors.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: theme.colors.white, fontWeight: '700' },
  deviceList: { gap: 12 },
  device: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 14 },
  deviceName: { color: theme.colors.text, fontWeight: '700' },
  deviceMeta: { color: theme.colors.primary, marginTop: 3 },
  close: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: theme.colors.primary, fontWeight: '700' },
});
