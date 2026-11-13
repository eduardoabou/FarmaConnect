import type { RasterRow } from '@slastra/nblib';
import qrcode from 'qrcode-generator';
import type { NormalLabel } from '../labels/normalLabel';

export const normalLabelRasterSize = { width: 384, height: 240 } as const;
const contentOffsetY = 6;
const contentOffsetX = 10;

const glyphs: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '11001', '10101', '10011', '10011', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  6: ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  ':': ['00000', '00100', '00100', '00000', '00100', '00100', '00000'],
  '/': ['00001', '00010', '00100', '01000', '10000', '00000', '00000'],
  ',': ['00000', '00000', '00000', '00000', '00110', '00100', '01000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '$': ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

function clean(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function setPixel(rows: RasterRow[], x: number, y: number) {
  if (x >= 0 && x < normalLabelRasterSize.width && y >= 0 && y < normalLabelRasterSize.height) rows[y][x] = 1;
}

function drawText(
  rows: RasterRow[],
  value: string,
  x: number,
  y: number,
  scale: number,
  maxWidth: number,
  fixedAdvance?: number,
) {
  const advance = fixedAdvance ?? 6 * scale;
  const characterLimit = Math.floor((maxWidth - 5 * scale) / advance) + 1;
  clean(value).slice(0, characterLimit).split('').forEach((character, index) => {
    const glyph = glyphs[character] ?? glyphs[' '];
    glyph.forEach((line, row) => line.split('').forEach((pixel, column) => {
      if (pixel !== '1') return;
      for (let py = 0; py < scale; py += 1) for (let px = 0; px < scale; px += 1) setPixel(rows, x + index * advance + column * scale + px, y + row * scale + py);
    }));
  });
}

function drawMediumText(
  rows: RasterRow[],
  value: string,
  x: number,
  y: number,
  maxWidth: number,
) {
  const glyphWidth = 8;
  const glyphHeight = 11;
  const advance = 9;
  const characterLimit = Math.floor((maxWidth - glyphWidth) / advance) + 1;
  clean(value).slice(0, characterLimit).split('').forEach((character, index) => {
    const glyph = glyphs[character] ?? glyphs[' '];
    for (let py = 0; py < glyphHeight; py += 1) {
      const sourceRow = Math.floor(py * 7 / glyphHeight);
      for (let px = 0; px < glyphWidth; px += 1) {
        const sourceColumn = Math.floor(px * 5 / glyphWidth);
        if (glyph[sourceRow][sourceColumn] === '1') {
          setPixel(rows, x + index * advance + px, y + py);
        }
      }
    }
  });
}

function textWidth(value: string, scale: number) {
  return value.length === 0 ? 0 : (value.length - 1) * 6 * scale + 5 * scale;
}

function drawBulaQrCode(rows: RasterRow[], bulaUrl: string) {
  const qr = qrcode(0, 'M');
  qr.addData(bulaUrl, 'Byte');
  qr.make();

  const quietZone = 4;
  const moduleScale = 2.2;
  const totalModules = qr.getModuleCount() + quietZone * 2;
  const moduleStart = (index: number) => Math.floor(index * moduleScale);
  const size = moduleStart(totalModules);
  // Keep the QR Code below the internal code, in the lower-left free area.
  // The price occupies the lower-right side of the label.
  const x = contentOffsetX - 4;
  const y = 125 + contentOffsetY;
  const bulaLabelX = x + size + 1;

  if (x < 0 || bulaLabelX + 8 > 145 || y + size > 239) {
    throw new Error('A URL da bula é longa demais para o QR Code da etiqueta.');
  }

  for (let row = 0; row < qr.getModuleCount(); row += 1) {
    for (let column = 0; column < qr.getModuleCount(); column += 1) {
      if (!qr.isDark(row, column)) continue;
      const top = moduleStart(row + quietZone);
      const bottom = moduleStart(row + quietZone + 1);
      const left = moduleStart(column + quietZone);
      const right = moduleStart(column + quietZone + 1);
      for (let py = top; py < bottom; py += 1) {
        for (let px = left; px < right; px += 1) {
          setPixel(
            rows,
            x + px,
            y + py,
          );
        }
      }
    }
  }

  'BULA'.split('').forEach((letter, index) => {
    drawMediumText(rows, letter, bulaLabelX, y + 17 + index * 21, 8);
  });
}

function drawPrice(rows: RasterRow[], price: string) {
  const [currency = 'R$', amount = price] = price.trim().split(/\s+/, 2);
  const [integer, decimal] = amount.split(',', 2);
  const fractional = decimal === undefined ? '' : `,${decimal}`;
  const integerScale = integer.length <= 2 ? 10 : 9;
  const fractionalScale = 4;
  const currencyScale = 2;
  const currencyGap = 8;
  const fractionalGap = fractional ? 2 : 0;
  const currencyWidth = textWidth(currency, currencyScale);
  const integerWidth = textWidth(integer, integerScale);
  const fractionalWidth = textWidth(fractional, fractionalScale);
  const x = 360 + contentOffsetX - currencyWidth - currencyGap - integerWidth - fractionalGap - fractionalWidth;
  drawText(
    rows,
    currency,
    x + 4,
    142 + contentOffsetY,
    currencyScale,
    currencyWidth,
  );
  drawText(
    rows,
    integer,
    x + currencyWidth + currencyGap,
    149 + contentOffsetY,
    integerScale,
    integerWidth,
  );
  if (fractional) {
    drawText(
      rows,
      fractional,
      x + currencyWidth + currencyGap + integerWidth + fractionalGap,
      142 + contentOffsetY,
      fractionalScale,
      fractionalWidth,
    );
  }
}

export function createNormalLabelRaster(label: NormalLabel): RasterRow[] {
  const rows = Array.from({ length: normalLabelRasterSize.height }, () => new Uint8Array(normalLabelRasterSize.width));
  const productName = clean(label.productName);
  const titleScale = productName.length <= 18 ? 3 : 2;
  const titleAdvance = Math.floor((368 - 5 * titleScale) / Math.max(1, productName.length - 1));
  drawText(rows, productName, contentOffsetX, 10 + contentOffsetY, titleScale, 368, titleAdvance);
  drawMediumText(rows, 'IMPRESSO:', contentOffsetX, 48 + contentOffsetY, 80);
  drawMediumText(rows, label.printedAt, 84 + contentOffsetX, 48 + contentOffsetY, 89);
  drawMediumText(rows, label.pharmacyName, contentOffsetX, 68 + contentOffsetY, 175);
  if (label.ean) drawMediumText(rows, `EAN ${label.ean}`, contentOffsetX, 88 + contentOffsetY, 175);
  drawMediumText(rows, `COD ${label.internalCode}`, contentOffsetX, 108 + contentOffsetY, 175);
  if (label.bulaUrl) drawBulaQrCode(rows, label.bulaUrl);
  drawPrice(rows, label.price);
  return rows;
}
