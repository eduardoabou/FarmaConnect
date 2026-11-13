/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('../src/screens/CatalogScreen', () => ({
  CatalogScreen: () => null,
}));
jest.mock('../src/components/AuthGate', () => ({
  AuthGate: () => null,
}));
jest.mock('../src/database/sqlite', () => ({
  getDatabase: jest.fn().mockResolvedValue({}),
}));

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
