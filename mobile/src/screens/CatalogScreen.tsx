import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DEMO_PHARMACY_ID, ensureDemoCatalog } from '../database/demoCatalog';
import { PrinterSetup } from '../components/PrinterSetup';
import { createNormalLabel } from '../labels/normalLabel';
import {
  PrinterNotConnectedError,
  printWithConnectedPrinter,
} from '../printer/printerSession';
import { createProductRepository } from '../database/repositories/products';
import { createSyncStateRepository } from '../database/repositories/syncState';
import { getDatabase } from '../database/sqlite';
import type { Product } from '../models/Product';
import { theme } from '../theme';
import { pharmacyTheme } from '../theme/pharmacyTheme';
import { supabase } from '../supabase/client';
import { getBulaPublicUrl } from '../bulas/publicUrl';

const categoryIcons: Record<string, string> = {
  Medicamentos: '💊',
  Higiene: '🧴',
  Vitaminas: '🍊',
  Cosméticos: '🧼',
  Infantil: '🧸',
  'Primeiros Socorros': '🩹',
};

export function formatPrice(priceCents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(priceCents / 100);
}

export function formatSyncTime(value: string): string {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
  }).format(date);
  const time = new Intl.DateTimeFormat('pt-BR', {
    timeStyle: 'short',
  }).format(date);
  return `${day} - ${time}`;
}

export function CatalogScreen({
  pharmacyId = DEMO_PHARMACY_ID,
  pharmacyName = 'FarmaConnect',
  onSignOut,
}: {
  pharmacyId?: string;
  pharmacyName?: string;
  onSignOut?: () => void;
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | undefined>();
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [printingProductId, setPrintingProductId] = useState<string>();
  const [bulkPrintProgress, setBulkPrintProgress] = useState<{
    current: number;
    total: number;
  }>();
  const [menuVisible, setMenuVisible] = useState(false);
  const [printerSetupVisible, setPrinterSetupVisible] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [revision, setRevision] = useState(0);
  const requestId = useRef(0);
  const syncInFlight = useRef(false);

  const loadLocal = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setState(previous => (previous === 'ready' ? previous : 'loading'));
    try {
      const database = await getDatabase();
      const repository = createProductRepository(database, pharmacyId);
      const syncState = createSyncStateRepository(database, pharmacyId);
      if (pharmacyId === DEMO_PHARMACY_ID) {
        await ensureDemoCatalog(database, pharmacyId);
      }
      const [nextCategories, nextProducts, nextLastSyncedAt] =
        await Promise.all([
          repository.categories(),
          repository.list({ search, category, limit: 100 }),
          syncState.lastSyncedAt(),
        ]);
      if (currentRequest === requestId.current) {
        setCategories(nextCategories);
        setProducts(nextProducts);
        setLastSyncedAt(nextLastSyncedAt);
        setState('ready');
      }
    } catch (error) {
      console.error('FarmaConnect: falha ao carregar catálogo local.', error);
      if (currentRequest === requestId.current) {
        setState('error');
      }
    }
  }, [category, pharmacyId, search]);

  const syncInBackground = useCallback(async () => {
    if (pharmacyId === DEMO_PHARMACY_ID) return;
    if (syncInFlight.current) return;
    syncInFlight.current = true;
    setSyncing(true);
    try {
      const database = await getDatabase();
      const repository = createProductRepository(database, pharmacyId);
      const { data, error } = await supabase
        .from('products')
        .select(
          'id, pharmacy_id, name, category, price_cents, description, manufacturer, dosage, ean, internal_code, bula_path, updated_at, deleted_at',
        )
        .order('name');
      if (error) throw error;
      await repository.saveBatch(
        (data ?? []).map(item => ({
          id: item.id,
          pharmacyId: item.pharmacy_id,
          name: item.name,
          category: item.category,
          priceCents: item.price_cents,
          description: item.description,
          manufacturer: item.manufacturer,
          dosage: item.dosage,
          ean: item.ean,
          internalCode: item.internal_code,
          bulaPath: item.bula_path,
          updatedAt: item.updated_at,
          deletedAt: item.deleted_at,
        })),
      );
      const syncedAt = await createSyncStateRepository(
        database,
        pharmacyId,
      ).markSynchronized(new Date().toISOString());
      setLastSyncedAt(syncedAt);
      setRevision(value => value + 1);
    } catch (error) {
      const database = await getDatabase();
      const repository = createProductRepository(database, pharmacyId);
      if ((await repository.count()) === 0) {
        console.error('FarmaConnect: falha ao sincronizar catálogo.', error);
        setState('error');
      }
    } finally {
      syncInFlight.current = false;
      setSyncing(false);
    }
  }, [pharmacyId]);

  const syncWhenOnline = useCallback(async () => {
    const network = await NetInfo.fetch();
    if (network.isConnected && network.isInternetReachable !== false) {
      await syncInBackground();
    }
  }, [syncInBackground]);

  const colors = pharmacyTheme(pharmacyName);

  const printProduct = useCallback(
    async (product: Product) => {
      if (printingProductId || bulkPrintProgress) return;
      setPrintingProductId(product.id);
      try {
        await printWithConnectedPrinter(
          createNormalLabel(
            product,
            pharmacyName,
            getBulaPublicUrl(supabase.storage, product.bulaPath),
          ),
        );
      } catch (error) {
        if (error instanceof PrinterNotConnectedError) {
          Alert.alert(
            'Impressora não conectada',
            'Abra o menu e conecte a NIIMBOT B1 antes de imprimir.',
          );
        } else {
          console.warn('FarmaConnect B1:', error);
          Alert.alert(
            'Não foi possível imprimir',
            'Confira a tampa, o papel e a conexão Bluetooth da NIIMBOT B1.',
          );
        }
      } finally {
        setPrintingProductId(undefined);
      }
    },
    [bulkPrintProgress, pharmacyName, printingProductId],
  );

  const printAllProducts = useCallback(async () => {
    if (bulkPrintProgress || printingProductId) return;
    try {
      const database = await getDatabase();
      const repository = createProductRepository(database, pharmacyId);
      const total = await repository.count();
      if (total === 0) {
        Alert.alert('Nenhuma etiqueta para imprimir', 'Esta farmácia ainda não possui produtos no catálogo.');
        return;
      }

      const allProducts: Product[] = [];
      for (let offset = 0; offset < total; offset += 100) {
        allProducts.push(...await repository.list({ limit: 100, offset }));
      }

      setBulkPrintProgress({ current: 0, total: allProducts.length });
      for (const [index, product] of allProducts.entries()) {
        setBulkPrintProgress({ current: index + 1, total: allProducts.length });
        await printWithConnectedPrinter(
          createNormalLabel(
            product,
            pharmacyName,
            getBulaPublicUrl(supabase.storage, product.bulaPath),
          ),
        );
      }
      Alert.alert('Etiquetas Impressas', `Todas as ${allProducts.length} etiquetas foram impressas.`);
    } catch (error) {
      if (error instanceof PrinterNotConnectedError) {
        Alert.alert('Impressora não conectada', 'Abra o menu e conecte a NIIMBOT B1 antes de imprimir tudo.');
      } else {
        console.warn('FarmaConnect B1:', error);
        Alert.alert('Impressão interrompida', 'Confira a tampa, o papel e a conexão Bluetooth da NIIMBOT B1.');
      }
    } finally {
      setBulkPrintProgress(undefined);
    }
  }, [bulkPrintProgress, pharmacyId, pharmacyName, printingProductId]);

  useEffect(() => {
    const timer = setTimeout(() => loadLocal().catch(() => {}), 0);
    return () => clearTimeout(timer);
  }, [loadLocal, revision]);

  useEffect(() => {
    if (pharmacyId === DEMO_PHARMACY_ID) return;
    const subscription = NetInfo.addEventListener(network => {
      if (network.isConnected && network.isInternetReachable !== false) {
        syncInBackground().catch(() => {});
      }
    });
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        syncWhenOnline().catch(() => {});
      }
    }, 15 * 60 * 1000);
    const appState = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        syncWhenOnline().catch(() => {});
      }
    });
    return () => {
      subscription();
      clearInterval(interval);
      appState.remove();
    };
  }, [pharmacyId, syncInBackground, syncWhenOnline]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.brand}>
          <View style={styles.brandIcon} accessibilityElementsHidden>
            <Text style={styles.cross}>+</Text>
          </View>
          <View>
            <Text style={styles.title} accessibilityRole="header">
              {pharmacyName}
            </Text>
            <Text style={styles.subtitle}>Catálogo local</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir menu"
          onPress={() => setMenuVisible(true)}
          style={styles.menuButton}
        >
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading} accessibilityRole="header">
          Produtos
        </Text>
        <Text style={styles.intro}>Consulte produtos mesmo sem internet.</Text>

        <View style={styles.searchBox}>
          <Text accessibilityElementsHidden style={styles.searchIcon}>
            ⌕
          </Text>
          <TextInput
            accessibilityLabel="Pesquisar produtos"
            placeholder="Pesquisar por nome ou categoria"
            placeholderTextColor={theme.colors.muted}
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categories}
        >
          <CategoryButton
            label="Todos"
            active={!category}
            onPress={() => setCategory(undefined)}
          />
          {categories.map(item => (
            <CategoryButton
              key={item}
              label={item}
              active={category === item}
              onPress={() => setCategory(item)}
            />
          ))}
        </ScrollView>

        {state === 'loading' && products.length === 0 ? (
          <View style={styles.feedback}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.feedbackText}>Carregando catálogo local…</Text>
          </View>
        ) : state === 'error' ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              Não foi possível carregar o catálogo
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                loadLocal().catch(() => {});
                syncWhenOnline().catch(() => {});
              }}
              style={styles.retry}
            >
              <Text style={styles.retryText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : products.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nenhum produto encontrado</Text>
            <Text style={styles.emptyText}>Tente outro nome ou categoria.</Text>
          </View>
        ) : (
          products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onInfo={() => setSelected(product)}
              printing={printingProductId === product.id}
              onPrint={() => printProduct(product).catch(() => {})}
            />
          ))
        )}

        {pharmacyId !== DEMO_PHARMACY_ID ? (
          <View style={styles.syncInfo}>
            <Text style={styles.syncInfoText}>
              {syncing
                ? 'Sincronizando com o Supabase…'
                : lastSyncedAt
                ? `Última sincronização com o banco de dados: ${formatSyncTime(
                    lastSyncedAt,
                  )}`
                : 'Catálogo ainda não foi sincronizado com o Supabase.'}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <ProductInfo
        product={selected}
        onClose={() => setSelected(null)}
      />
      <CatalogMenu
        visible={menuVisible}
        backgroundColor={colors.primary}
        onClose={() => setMenuVisible(false)}
        onPrinter={() => {
          setMenuVisible(false);
          setPrinterSetupVisible(true);
        }}
        onPrintAll={() => printAllProducts().catch(() => {})}
        printProgress={bulkPrintProgress}
        printingProduct={Boolean(printingProductId)}
        onSignOut={
          onSignOut
            ? () => {
                setMenuVisible(false);
                onSignOut();
              }
            : undefined
        }
      />
      <PrinterSetup
        visible={printerSetupVisible}
        onClose={() => {
          setPrinterSetupVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

function CategoryButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.category, active && styles.categoryActive]}
    >
      <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ProductCard({
  product,
  onInfo,
  onPrint,
  printing,
}: {
  product: Product;
  onInfo: () => void;
  onPrint: () => void;
  printing: boolean;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.productTop}>
        <View style={styles.productIcon}>
          <Text style={styles.emoji}>
            {categoryIcons[product.category] ?? '📦'}
          </Text>
        </View>
        <View style={styles.productText}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.dosage}>
            {product.dosage ?? 'Sem dosagem informada'}
          </Text>
          <Text style={styles.productCategory}>{product.category}</Text>
        </View>
      </View>
      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatPrice(product.priceCents)}</Text>
        {product.bulaPath ? <BulaIndicator /> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Informações sobre ${product.name}`}
        onPress={onInfo}
        style={({ pressed }) => [styles.infoButton, pressed && styles.pressed]}
      >
        <Text style={styles.infoButtonText}>INFO</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Imprimir etiqueta de ${product.name}`}
        disabled={printing}
        onPress={onPrint}
        style={({ pressed }) => [styles.printButton, pressed && styles.pressed]}
      >
        <Text style={styles.printButtonText}>
          {printing ? 'IMPRIMINDO...' : 'IMPRIMIR'}
        </Text>
      </Pressable>
    </View>
  );
}

function BulaIndicator() {
  return (
    <View
      accessible
      accessibilityLabel="Produto com QR Code da bula disponível"
      style={styles.bulaIndicator}
    >
      <Image
        source={require('../assets/qr-code-bula.png')}
        style={styles.qrCodeImage}
        resizeMode="contain"
      />
    </View>
  );
}

function ProductInfo({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={product !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={styles.modalCard}
          accessibilityViewIsModal
          accessibilityLabel="Informações do produto"
        >
          {product && (
            <>
              <Text style={styles.modalTitle} accessibilityRole="header">
                {product.name}
              </Text>
              <Info label="Categoria" value={product.category} />
              <Info label="Preço" value={formatPrice(product.priceCents)} />
              <Info label="Dosagem" value={product.dosage ?? 'Não informada'} />
              <Info label="Fabricante" value={product.manufacturer} />
              <Info label="Código" value={product.id} />
              <View style={styles.notice}>
                <Text style={styles.noticeText}>
                  Consulte sempre um profissional de saúde antes de usar
                  medicamentos.
                </Text>
              </View>
            </>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={styles.closeButton}
          >
            <Text style={styles.closeText}>Fechar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function CatalogMenu({
  visible,
  backgroundColor,
  onClose,
  onPrinter,
  onPrintAll,
  printProgress,
  printingProduct,
  onSignOut,
}: {
  visible: boolean;
  backgroundColor: string;
  onClose: () => void;
  onPrinter: () => void;
  onPrintAll: () => void;
  printProgress?: { current: number; total: number };
  printingProduct: boolean;
  onSignOut?: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.menuOverlay}>
        <Pressable accessibilityLabel="Fechar menu" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View
          style={[styles.menuDrawer, { backgroundColor }]}
          accessibilityViewIsModal
        >
          <SafeAreaView style={styles.menuSafeArea}>
            <Pressable
              accessibilityRole="button"
              disabled={Boolean(printProgress) || printingProduct}
              onPress={onPrinter}
              style={styles.menuPrinterAction}
            >
              <Text style={styles.menuPrinterText}>CONECTAR IMPRESSORA</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Imprimir todas as etiquetas"
              disabled={Boolean(printProgress) || printingProduct}
              onPress={onPrintAll}
              style={styles.menuPrintAllAction}
            >
              <Text style={styles.menuPrintAllText}>
                {printProgress
                  ? `IMPRIMINDO ${printProgress.current} DE ${printProgress.total}`
                  : 'IMPRIMIR TUDO'}
              </Text>
            </Pressable>
            {onSignOut ? (
              <Pressable
                accessibilityRole="button"
                onPress={onSignOut}
                style={styles.menuSignOutAction}
              >
                <Text style={styles.menuSignOutText}>SAIR</Text>
              </Pressable>
            ) : null}
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Text style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}: </Text>
      {value}
    </Text>
  );
}

const { colors } = theme;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  brand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 12,
  },
  menuButton: {
    borderWidth: 1,
    borderColor: '#ffffff',
    borderRadius: 9,
    width: 48,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  menuLine: { width: 22, height: 2, borderRadius: 2, backgroundColor: colors.white },
  brandIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
  },
  cross: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 34,
    lineHeight: 40,
  },
  title: { color: colors.white, fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#e8f3f9', fontSize: 13, marginTop: 2 },
  content: {
    padding: 20,
    paddingBottom: 36,
    gap: 14,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  heading: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    marginTop: 4,
  },
  intro: { color: colors.muted, fontSize: 16, marginTop: -8 },
  searchBox: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    paddingHorizontal: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { color: colors.primary, fontSize: 26 },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 12,
  },
  categories: { gap: 8, paddingVertical: 2 },
  category: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  categoryActive: { backgroundColor: colors.primary },
  categoryText: { color: colors.primary, fontWeight: '600' },
  categoryTextActive: { color: colors.white },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 13,
  },
  productTop: { flexDirection: 'row', gap: 13 },
  productIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: { fontSize: 30 },
  productText: { flex: 1, gap: 3 },
  productName: { fontSize: 18, fontWeight: '700', color: colors.text },
  dosage: { color: colors.muted, fontSize: 14 },
  productCategory: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: { color: colors.green, fontSize: 25, fontWeight: '800' },
  bulaIndicator: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCodeImage: {
    width: 30,
    height: 30,
  },
  infoButton: {
    minHeight: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  infoButtonText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  printButton: {
    minHeight: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  printButtonText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  pressed: { opacity: 0.8 },
  feedback: { alignItems: 'center', gap: 12, padding: 30 },
  feedbackText: { color: colors.muted },
  empty: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    gap: 8,
  },
  emptyTitle: { color: colors.text, fontWeight: '700', fontSize: 18 },
  emptyText: { color: colors.muted, fontSize: 15 },
  retry: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  retryText: { color: colors.white, fontWeight: '700' },
  syncInfo: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  syncInfoText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    backgroundColor: colors.white,
    padding: 22,
    borderRadius: 22,
    gap: 11,
  },
  modalTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 23,
    paddingRight: 20,
  },
  infoLine: { color: colors.text, fontSize: 15, lineHeight: 22 },
  infoLabel: { color: colors.muted, fontWeight: '700' },
  notice: {
    backgroundColor: '#fff7e8',
    borderRadius: 12,
    padding: 13,
    marginTop: 4,
  },
  noticeText: { color: '#8a5700', fontSize: 14, lineHeight: 20 },
  closeButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },
  closeText: { color: colors.white, fontWeight: '700' },
  menuOverlay: {
    flex: 1,
    alignItems: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  menuDrawer: {
    position: 'absolute',
    top: 50,
    right: 0,
    bottom: 58,
    width: '46%',
    borderTopLeftRadius: 28,
    borderBottomLeftRadius: 28,
    elevation: 12,
    overflow: 'hidden',
  },
  menuSafeArea: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 18,
    paddingBottom: 12,
  },
  menuPrinterAction: {
    minHeight: 52,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.white,
    paddingHorizontal: 8,
  },
  menuPrinterText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 13,
    textAlign: 'center',
  },
  menuPrintAllAction: {
    minHeight: 52,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.white,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  menuPrintAllText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 13,
    textAlign: 'center',
  },
  menuSignOutAction: {
    minHeight: 52,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d92d20',
    marginTop: 'auto',
  },
  menuSignOutText: { color: colors.white, fontWeight: '800' },
});
