import {
  Customer,
  Product,
  BasketTemplate,
  Sale,
  Installment,
  Purchase,
  StockMovement,
  BusinessSettings,
} from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  // ================= ALIMENTOS (16 PRODUTOS) =================
  {
    id: 'prod-1',
    name: 'Arroz',
    category: 'Alimentos',
    unit: 'kg',
    packageType: 'fardo',
    unitsPerPackage: 30, // 30 kg por fardo
    packageCost: 120.00, // R$ 120,00 por fardo
    unitCost: 4.00, // R$ 4,00 por kg (120 / 30)
    stock: 240,
    minStock: 60,
    refPrice: 6.50,
    status: 'active',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'prod-2',
    name: 'Flocão de milho',
    category: 'Alimentos',
    unit: 'un',
    packageType: 'fardo',
    unitsPerPackage: 20, // 20 unidades por fardo
    packageCost: 40.00, // R$ 40,00 por fardo
    unitCost: 2.00, // R$ 2,00 por unidade
    stock: 80,
    minStock: 20,
    refPrice: 3.50,
    status: 'active',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'prod-3',
    name: 'Açúcar',
    category: 'Alimentos',
    unit: 'kg',
    packageType: 'fardo',
    unitsPerPackage: 30, // 30 kg por fardo (ou 30 pacotes de 1kg)
    packageCost: 105.00, // R$ 105,00 por fardo
    unitCost: 3.50, // R$ 3,50 por kg
    stock: 90,
    minStock: 25,
    refPrice: 5.20,
    status: 'active',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'prod-4',
    name: 'Feijão',
    category: 'Alimentos',
    unit: 'kg',
    packageType: 'fardo',
    unitsPerPackage: 30, // 30 kg por fardo
    packageCost: 210.00, // R$ 210,00 por fardo
    unitCost: 7.00, // R$ 7,00 por kg
    stock: 90,
    minStock: 20,
    refPrice: 10.00,
    status: 'active',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'prod-5',
    name: 'Goma de tapioca',
    category: 'Alimentos',
    unit: 'kg',
    packageType: 'fardo',
    unitsPerPackage: 10, // 10 kg por fardo
    packageCost: 55.00, // R$ 55,00 por fardo
    unitCost: 5.50, // R$ 5,50 por kg
    stock: 50,
    minStock: 15,
    refPrice: 8.50,
    status: 'active',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'prod-6',
    name: 'Biscoito Cream Cracker',
    category: 'Alimentos',
    unit: 'un',
    packageType: 'caixa',
    unitsPerPackage: 20, // 20 unidades por caixa
    packageCost: 68.00, // R$ 68,00 por caixa
    unitCost: 3.40, // R$ 3,40 por unidade
    stock: 60,
    minStock: 20,
    refPrice: 5.00,
    status: 'active',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'prod-7',
    name: 'Biscoito Maria',
    category: 'Alimentos',
    unit: 'un',
    packageType: 'caixa',
    unitsPerPackage: 20, // 20 unidades por caixa
    packageCost: 64.00, // R$ 64,00 por caixa
    unitCost: 3.20, // R$ 3,20 por unidade
    stock: 60,
    minStock: 20,
    refPrice: 4.80,
    status: 'active',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'prod-8',
    name: 'Leite em pó',
    category: 'Alimentos',
    unit: 'un',
    packageType: 'fardo',
    unitsPerPackage: 24, // 24 unidades por fardo
    packageCost: 180.00, // R$ 180,00 por fardo
    unitCost: 7.50, // R$ 7,50 por unidade
    stock: 72,
    minStock: 24,
    refPrice: 11.00,
    status: 'active',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'prod-9',
    name: 'Café',
    category: 'Alimentos',
    unit: 'un',
    packageType: 'fardo',
    unitsPerPackage: 10, // 10 unidades por fardo
    packageCost: 140.00, // R$ 140,00 por fardo
    unitCost: 14.00, // R$ 14,00 por unidade
    stock: 60,
    minStock: 20,
    refPrice: 20.00,
    status: 'active',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'prod-10',
    name: 'Macarrão',
    category: 'Alimentos',
    unit: 'un',
    packageType: 'fardo',
    unitsPerPackage: 20, // 20 unidades por fardo
    packageCost: 60.00, // R$ 60,00 por fardo
    unitCost: 3.00, // R$ 3,00 por unidade
    stock: 90,
    minStock: 30,
    refPrice: 4.50,
    status: 'active',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'prod-11',
    name: 'Sal',
    category: 'Alimentos',
    unit: 'kg',
    packageType: 'fardo',
    unitsPerPackage: 30, // 30 kg por fardo
    packageCost: 45.00, // R$ 45,00 por fardo
    unitCost: 1.50, // R$ 1,50 por kg
    stock: 60,
    minStock: 15,
    refPrice: 2.50,
    status: 'active',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'prod-12',
    name: 'Condimento / Pimenta',
    category: 'Alimentos',
    unit: 'un',
    packageType: 'fardo',
    unitsPerPackage: 20, // 20 unidades por fardo
    packageCost: 30.00, // R$ 30,00 por fardo
    unitCost: 1.50, // R$ 1,50 por unidade
    stock: 50,
    minStock: 15,
    refPrice: 2.50,
    status: 'active',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'prod-13',
    name: 'Corante',
    category: 'Alimentos',
    unit: 'un',
    packageType: 'fardo',
    unitsPerPackage: 20, // 20 unidades por fardo
    packageCost: 30.00, // R$ 30,00 por fardo
    unitCost: 1.50, // R$ 1,50 por unidade
    stock: 50,
    minStock: 15,
    refPrice: 2.50,
    status: 'active',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'prod-14',
    name: 'Óleo',
    category: 'Alimentos',
    unit: 'un',
    packageType: 'caixa',
    unitsPerPackage: 20, // 20 unidades por caixa
    packageCost: 130.00, // R$ 130,00 por caixa
    unitCost: 6.50, // R$ 6,50 por unidade
    stock: 70,
    minStock: 20,
    refPrice: 9.50,
    status: 'active',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'prod-15',
    name: 'Doce de goiaba',
    category: 'Alimentos',
    unit: 'un',
    packageType: 'caixa',
    unitsPerPackage: 24, // 24 unidades por caixa
    packageCost: 84.00, // R$ 84,00 por caixa
    unitCost: 3.50, // R$ 3,50 por unidade
    stock: 48,
    minStock: 15,
    refPrice: 5.50,
    status: 'active',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'prod-16',
    name: 'Manteiga',
    category: 'Alimentos',
    unit: 'un',
    packageType: 'caixa',
    unitsPerPackage: 24, // 24 unidades por caixa
    packageCost: 192.00, // R$ 192,00 por caixa
    unitCost: 8.00, // R$ 8,00 por unidade
    stock: 48,
    minStock: 15,
    refPrice: 12.00,
    status: 'active',
    createdAt: '2026-08-01T10:00:00.000Z',
  },

  // ================= LIMPEZA E HIGIENE (8 PRODUTOS) =================
  {
    id: 'prod-17',
    name: 'Bucha de lavar roupa',
    category: 'Limpeza e Higiene',
    unit: 'un',
    packageType: 'fardo',
    unitsPerPackage: 24, // 24 unidades por pacote/fardo
    packageCost: 36.00, // R$ 36,00 por fardo
    unitCost: 1.50, // R$ 1,50 por unidade
    stock: 60,
    minStock: 20,
    refPrice: 2.80,
    status: 'active',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'prod-18',
    name: 'Sabão em pó',
    category: 'Limpeza e Higiene',
    unit: 'un',
    packageType: 'caixa',
    unitsPerPackage: 20, // 20 unidades por caixa
    packageCost: 130.00, // R$ 130,00 por caixa
    unitCost: 6.50, // R$ 6,50 por unidade
    stock: 50,
    minStock: 15,
    refPrice: 9.90,
    status: 'active',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'prod-19',
    name: 'Sabão em barra',
    category: 'Limpeza e Higiene',
    unit: 'un',
    packageType: 'fardo',
    unitsPerPackage: 10, // 10 unidades por fardo
    packageCost: 30.00, // R$ 30,00 por fardo
    unitCost: 3.00, // R$ 3,00 por unidade (R$ 1,50 por meio sabão)
    stock: 40,
    minStock: 10,
    refPrice: 4.50,
    status: 'active',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'prod-20',
    name: 'Sabonete',
    category: 'Limpeza e Higiene',
    unit: 'un',
    packageType: 'caixa',
    unitsPerPackage: 48, // 48 unidades por caixa
    packageCost: 96.00, // R$ 96,00 por caixa
    unitCost: 2.00, // R$ 2,00 por unidade
    stock: 96,
    minStock: 25,
    refPrice: 3.50,
    status: 'active',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'prod-21',
    name: 'Pasta de dente',
    category: 'Limpeza e Higiene',
    unit: 'un',
    packageType: 'caixa',
    unitsPerPackage: 24, // 24 unidades por caixa
    packageCost: 72.00, // R$ 72,00 por caixa
    unitCost: 3.00, // R$ 3,00 por unidade
    stock: 48,
    minStock: 15,
    refPrice: 4.90,
    status: 'active',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'prod-22',
    name: 'Detergente Ypê',
    category: 'Limpeza e Higiene',
    unit: 'un',
    packageType: 'caixa',
    unitsPerPackage: 24, // 24 unidades por caixa
    packageCost: 54.00, // R$ 54,00 por caixa
    unitCost: 2.25, // R$ 2,25 por unidade
    stock: 72,
    minStock: 20,
    refPrice: 3.50,
    status: 'active',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'prod-23',
    name: 'Papel higiênico',
    category: 'Limpeza e Higiene',
    unit: 'un',
    packageType: 'fardo',
    unitsPerPackage: 16, // 16 unidades por fardo
    packageCost: 48.00, // R$ 48,00 por fardo
    unitCost: 3.00, // R$ 3,00 por unidade
    stock: 48,
    minStock: 15,
    refPrice: 5.00,
    status: 'active',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'prod-24',
    name: 'Água sanitária',
    category: 'Limpeza e Higiene',
    unit: 'un',
    packageType: 'fardo',
    unitsPerPackage: 12, // 12 garrafas por fardo
    packageCost: 36.00, // R$ 36,00 por fardo
    unitCost: 3.00, // R$ 3,00 por garrafa/un
    stock: 48,
    minStock: 15,
    refPrice: 4.50,
    status: 'active',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
];

// Cesta Básica Padrão Oficial Única com os 24 itens da composição exata
export const INITIAL_BASKET_TEMPLATES: BasketTemplate[] = [
  {
    id: 'basket-standard',
    name: 'Cesta Básica Padrão',
    description: 'Composição oficial com 24 itens essenciais (16 alimentos e 8 itens de limpeza e higiene). Pode ser personalizada por cliente no momento da venda.',
    defaultSalePrice: 340.00,
    isDefault: true,
    createdAt: '2026-08-01T10:00:00.000Z',
    items: [
      // Alimentos
      { productId: 'prod-1', productName: 'Arroz', quantity: 12, unit: 'kg', unitCost: 4.00 }, // 48.00
      { productId: 'prod-2', productName: 'Flocão de milho', quantity: 3, unit: 'un', unitCost: 2.00 }, // 6.00
      { productId: 'prod-3', productName: 'Açúcar', quantity: 3, unit: 'kg', unitCost: 3.50 }, // 10.50
      { productId: 'prod-4', productName: 'Feijão', quantity: 1, unit: 'kg', unitCost: 7.00 }, // 7.00
      { productId: 'prod-5', productName: 'Goma de tapioca', quantity: 1, unit: 'kg', unitCost: 5.50 }, // 5.50
      { productId: 'prod-6', productName: 'Biscoito Cream Cracker', quantity: 1, unit: 'un', unitCost: 3.40 }, // 3.40
      { productId: 'prod-7', productName: 'Biscoito Maria', quantity: 1, unit: 'un', unitCost: 3.20 }, // 3.20
      { productId: 'prod-8', productName: 'Leite em pó', quantity: 2, unit: 'un', unitCost: 7.50 }, // 15.00
      { productId: 'prod-9', productName: 'Café', quantity: 2, unit: 'un', unitCost: 14.00 }, // 28.00
      { productId: 'prod-10', productName: 'Macarrão', quantity: 2, unit: 'un', unitCost: 3.00 }, // 6.00
      { productId: 'prod-11', productName: 'Sal', quantity: 1, unit: 'kg', unitCost: 1.50 }, // 1.50
      { productId: 'prod-12', productName: 'Condimento / Pimenta', quantity: 1, unit: 'un', unitCost: 1.50 }, // 1.50
      { productId: 'prod-13', productName: 'Corante', quantity: 1, unit: 'un', unitCost: 1.50 }, // 1.50
      { productId: 'prod-14', productName: 'Óleo', quantity: 2, unit: 'un', unitCost: 6.50 }, // 13.00
      { productId: 'prod-15', productName: 'Doce de goiaba', quantity: 1, unit: 'un', unitCost: 3.50 }, // 3.50
      { productId: 'prod-16', productName: 'Manteiga', quantity: 1, unit: 'un', unitCost: 8.00 }, // 8.00

      // Limpeza e Higiene
      { productId: 'prod-17', productName: 'Bucha de lavar roupa', quantity: 2, unit: 'un', unitCost: 1.50 }, // 3.00
      { productId: 'prod-18', productName: 'Sabão em pó', quantity: 1, unit: 'un', unitCost: 6.50 }, // 6.50
      { productId: 'prod-19', productName: 'Sabão em barra', quantity: 0.5, unit: 'un', unitCost: 3.00 }, // 1.50 (meio sabão)
      { productId: 'prod-20', productName: 'Sabonete', quantity: 2, unit: 'un', unitCost: 2.00 }, // 4.00
      { productId: 'prod-21', productName: 'Pasta de dente', quantity: 1, unit: 'un', unitCost: 3.00 }, // 3.00
      { productId: 'prod-22', productName: 'Detergente Ypê', quantity: 1, unit: 'un', unitCost: 2.25 }, // 2.25
      { productId: 'prod-23', productName: 'Papel higiênico', quantity: 1, unit: 'un', unitCost: 3.00 }, // 3.00
      { productId: 'prod-24', productName: 'Água sanitária', quantity: 1, unit: 'un', unitCost: 3.00 }, // 3.00
      // Custo Total Estimado = R$ 180,35 | Venda Sugerida = R$ 340,00 | Lucro = R$ 159,65 (47%)
    ],
  },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Maria Helena dos Santos',
    document: '284.918.472-91',
    phone: '11987654321',
    whatsapp: '11987654321',
    address: 'Rua das Flores, 142 - Apto 32',
    neighborhood: 'Jardim Paulista',
    city: 'São Paulo - SP',
    notes: 'Cliente pontual, prefere pagar no dia 10 de cada mês.',
    status: 'active',
    createdAt: '2026-07-15T09:00:00.000Z',
  },
  {
    id: 'cust-2',
    name: 'Carlos Eduardo Oliveira',
    document: '192.837.465-10',
    phone: '11971234567',
    whatsapp: '11971234567',
    address: 'Av. Brasil, 1580 - Casa 2',
    neighborhood: 'Centro',
    city: 'Guarulhos - SP',
    notes: 'Pediu para avisar 2 dias antes do vencimento via WhatsApp.',
    status: 'active',
    createdAt: '2026-07-20T14:30:00.000Z',
  },
  {
    id: 'cust-3',
    name: 'Juliana Paes Ferreira',
    document: '381.726.495-88',
    phone: '11964553322',
    whatsapp: '11964553322',
    address: 'Rua Bela Vista, 89',
    neighborhood: 'Vila Nova',
    city: 'Osasco - SP',
    notes: 'Costuma comprar 2 cestas no começo do mês para a família.',
    status: 'active',
    createdAt: '2026-08-05T11:20:00.000Z',
  },
  {
    id: 'cust-4',
    name: 'Antônio Marcos Silveira',
    document: '472.938.102-44',
    phone: '11953218877',
    whatsapp: '11953218877',
    address: 'Rua São Jorge, 450',
    neighborhood: 'Bela Vista',
    city: 'São Bernardo do Campo - SP',
    notes: 'Atrasou parcela no último mês, cobrar com cordialidade.',
    status: 'active',
    createdAt: '2026-08-10T16:00:00.000Z',
  },
  {
    id: 'cust-5',
    name: 'Fernanda Lima Ribeiro',
    document: '519.827.364-77',
    phone: '11942337711',
    whatsapp: '11942337711',
    address: 'Alameda dos Ipês, 730',
    neighborhood: 'Parque das Nações',
    city: 'Santo André - SP',
    notes: 'Gosta de trocar café por leite extra na composição.',
    status: 'active',
    createdAt: '2026-08-18T10:15:00.000Z',
  },
];

// Helper to generate dynamic dates relative to current date (e.g. today, -5 days, +3 days, +30 days)
const getDateOffset = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const INITIAL_SALES: Sale[] = [
  {
    id: 'sale-1001',
    saleNumber: 'VND-1001',
    customerId: 'cust-1',
    customerName: 'Maria Helena dos Santos',
    basketTemplateId: 'basket-standard',
    basketName: 'Cesta Básica Padrão CestUP',
    items: [
      { productId: 'prod-1', productName: 'Arroz', quantity: 12, unit: 'kg', unitCost: 4.00, totalCost: 48.00 },
      { productId: 'prod-2', productName: 'Flocão de milho', quantity: 3, unit: 'un', unitCost: 2.00, totalCost: 6.00 },
      { productId: 'prod-3', productName: 'Feijão', quantity: 1, unit: 'kg', unitCost: 7.00, totalCost: 7.00 },
      { productId: 'prod-7', productName: 'Leite em pó', quantity: 2, unit: 'un', unitCost: 7.50, totalCost: 15.00 },
      { productId: 'prod-8', productName: 'Café', quantity: 2, unit: 'un', unitCost: 14.00, totalCost: 28.00 },
      { productId: 'prod-9', productName: 'Macarrão', quantity: 3, unit: 'un', unitCost: 3.00, totalCost: 9.00 },
      { productId: 'prod-13', productName: 'Óleo', quantity: 2, unit: 'un', unitCost: 6.50, totalCost: 13.00 },
      { productId: 'prod-15', productName: 'Manteiga', quantity: 1, unit: 'un', unitCost: 8.00, totalCost: 8.00 },
      { productId: 'prod-16', productName: 'Sabão em pó', quantity: 1, unit: 'un', unitCost: 6.50, totalCost: 6.50 },
      { productId: 'prod-17', productName: 'Sabão em barra', quantity: 0.5, unit: 'un', unitCost: 3.00, totalCost: 1.50 },
      { productId: 'prod-18', productName: 'Sabonete', quantity: 2, unit: 'un', unitCost: 2.00, totalCost: 4.00 },
      { productId: 'prod-20', productName: 'Detergente Ypê', quantity: 1, unit: 'un', unitCost: 2.25, totalCost: 2.25 },
    ],
    totalCost: 148.25,
    totalSaleValue: 340.00,
    profit: 191.75,
    profitMarginPct: 56.40,
    paymentPlan: 'installments_2',
    installmentsCount: 2,
    createdAt: getDateOffset(-35) + 'T14:00:00.000Z',
    status: 'completed',
    notes: 'Entregue na residência.',
  },
  {
    id: 'sale-1002',
    saleNumber: 'VND-1002',
    customerId: 'cust-2',
    customerName: 'Carlos Eduardo Oliveira',
    basketTemplateId: 'basket-standard',
    basketName: 'Cesta Básica Padrão (Personalizada)',
    items: [
      { productId: 'prod-1', productName: 'Arroz', quantity: 12, unit: 'kg', unitCost: 4.00, totalCost: 48.00 },
      { productId: 'prod-2', productName: 'Flocão de milho', quantity: 3, unit: 'un', unitCost: 2.00, totalCost: 6.00 },
      { productId: 'prod-3', productName: 'Feijão', quantity: 2, unit: 'kg', unitCost: 7.00, totalCost: 14.00 },
      { productId: 'prod-8', productName: 'Café', quantity: 3, unit: 'un', unitCost: 14.00, totalCost: 42.00 },
      { productId: 'prod-13', productName: 'Óleo', quantity: 2, unit: 'un', unitCost: 6.50, totalCost: 13.00 },
      { productId: 'prod-16', productName: 'Sabão em pó', quantity: 1, unit: 'un', unitCost: 6.50, totalCost: 6.50 },
    ],
    totalCost: 129.50,
    totalSaleValue: 340.00,
    profit: 210.50,
    profitMarginPct: 61.91,
    paymentPlan: 'installments_2',
    installmentsCount: 2,
    createdAt: getDateOffset(-20) + 'T10:30:00.000Z',
    status: 'completed',
    notes: 'Personalizou com mais café e feijão.',
  },
  {
    id: 'sale-1003',
    saleNumber: 'VND-1003',
    customerId: 'cust-3',
    customerName: 'Juliana Paes Ferreira',
    basketTemplateId: 'basket-standard',
    basketName: 'Cesta Básica Padrão CestUP',
    items: [
      { productId: 'prod-1', productName: 'Arroz', quantity: 12, unit: 'kg', unitCost: 4.00, totalCost: 48.00 },
      { productId: 'prod-2', productName: 'Flocão de milho', quantity: 3, unit: 'un', unitCost: 2.00, totalCost: 6.00 },
      { productId: 'prod-3', productName: 'Feijão', quantity: 1, unit: 'kg', unitCost: 7.00, totalCost: 7.00 },
      { productId: 'prod-7', productName: 'Leite em pó', quantity: 2, unit: 'un', unitCost: 7.50, totalCost: 15.00 },
      { productId: 'prod-8', productName: 'Café', quantity: 2, unit: 'un', unitCost: 14.00, totalCost: 28.00 },
      { productId: 'prod-13', productName: 'Óleo', quantity: 2, unit: 'un', unitCost: 6.50, totalCost: 13.00 },
    ],
    totalCost: 117.00,
    totalSaleValue: 340.00,
    profit: 223.00,
    profitMarginPct: 65.59,
    paymentPlan: 'cash',
    installmentsCount: 1,
    createdAt: getDateOffset(-2) + 'T09:15:00.000Z',
    status: 'completed',
    notes: 'Pagamento à vista via PIX na entrega.',
  },
  {
    id: 'sale-1004',
    saleNumber: 'VND-1004',
    customerId: 'cust-4',
    customerName: 'Antônio Marcos Silveira',
    basketTemplateId: 'basket-standard',
    basketName: 'Cesta Básica Padrão CestUP',
    items: [
      { productId: 'prod-1', productName: 'Arroz', quantity: 12, unit: 'kg', unitCost: 4.00, totalCost: 48.00 },
      { productId: 'prod-2', productName: 'Flocão de milho', quantity: 3, unit: 'un', unitCost: 2.00, totalCost: 6.00 },
      { productId: 'prod-3', productName: 'Feijão', quantity: 1, unit: 'kg', unitCost: 7.00, totalCost: 7.00 },
      { productId: 'prod-8', productName: 'Café', quantity: 2, unit: 'un', unitCost: 14.00, totalCost: 28.00 },
      { productId: 'prod-13', productName: 'Óleo', quantity: 2, unit: 'un', unitCost: 6.50, totalCost: 13.00 },
    ],
    totalCost: 102.00,
    totalSaleValue: 340.00,
    profit: 238.00,
    profitMarginPct: 70.00,
    paymentPlan: 'installments_2',
    installmentsCount: 2,
    createdAt: getDateOffset(-40) + 'T15:00:00.000Z',
    status: 'completed',
    notes: '2 parcelas de R$ 170,00.',
  },
  {
    id: 'sale-1005',
    saleNumber: 'VND-1005',
    customerId: 'cust-5',
    customerName: 'Fernanda Lima Ribeiro',
    basketTemplateId: 'basket-standard',
    basketName: 'Cesta Básica (Customizada)',
    items: [
      { productId: 'prod-1', productName: 'Arroz', quantity: 12, unit: 'kg', unitCost: 4.00, totalCost: 48.00 },
      { productId: 'prod-2', productName: 'Flocão de milho', quantity: 3, unit: 'un', unitCost: 2.00, totalCost: 6.00 },
      { productId: 'prod-3', productName: 'Feijão', quantity: 1, unit: 'kg', unitCost: 7.00, totalCost: 7.00 },
      { productId: 'prod-7', productName: 'Leite em pó', quantity: 4, unit: 'un', unitCost: 7.50, totalCost: 30.00 },
      { productId: 'prod-9', productName: 'Macarrão', quantity: 3, unit: 'un', unitCost: 3.00, totalCost: 9.00 },
      { productId: 'prod-13', productName: 'Óleo', quantity: 2, unit: 'un', unitCost: 6.50, totalCost: 13.00 },
    ],
    totalCost: 113.00,
    totalSaleValue: 340.00,
    profit: 227.00,
    profitMarginPct: 66.76,
    paymentPlan: 'installments_1',
    installmentsCount: 1,
    createdAt: getDateOffset(-5) + 'T11:00:00.000Z',
    status: 'completed',
    notes: 'Trocou café por leite em pó extra como solicitado.',
  },
];

export const INITIAL_INSTALLMENTS: Installment[] = [
  // Sale 1001: 2x 170.00 (1 paid, 1 due in 25 days)
  {
    id: 'inst-1',
    saleId: 'sale-1001',
    customerId: 'cust-1',
    customerName: 'Maria Helena dos Santos',
    customerPhone: '11987654321',
    customerWhatsapp: '11987654321',
    installmentNumber: 1,
    totalInstallments: 2,
    amount: 170.00,
    dueDate: getDateOffset(-5),
    status: 'paid',
    paidAmount: 170.00,
    paymentDate: getDateOffset(-5),
    paymentMethod: 'pix',
    notes: 'Pago no prazo via PIX.',
  },
  {
    id: 'inst-2',
    saleId: 'sale-1001',
    customerId: 'cust-1',
    customerName: 'Maria Helena dos Santos',
    customerPhone: '11987654321',
    customerWhatsapp: '11987654321',
    installmentNumber: 2,
    totalInstallments: 2,
    amount: 170.00,
    dueDate: getDateOffset(25),
    status: 'pending',
  },

  // Sale 1002: 2x 170.00 (1 due TODAY, 1 in 40 days)
  {
    id: 'inst-3',
    saleId: 'sale-1002',
    customerId: 'cust-2',
    customerName: 'Carlos Eduardo Oliveira',
    customerPhone: '11971234567',
    customerWhatsapp: '11971234567',
    installmentNumber: 1,
    totalInstallments: 2,
    amount: 170.00,
    dueDate: getDateOffset(0), // DUE TODAY!
    status: 'pending',
    notes: 'Lembrar de cobrar hoje de manhã.',
  },
  {
    id: 'inst-4',
    saleId: 'sale-1002',
    customerId: 'cust-2',
    customerName: 'Carlos Eduardo Oliveira',
    customerPhone: '11971234567',
    customerWhatsapp: '11971234567',
    installmentNumber: 2,
    totalInstallments: 2,
    amount: 170.00,
    dueDate: getDateOffset(30),
    status: 'pending',
  },

  // Sale 1003: Cash (Paid)
  {
    id: 'inst-5',
    saleId: 'sale-1003',
    customerId: 'cust-3',
    customerName: 'Juliana Paes Ferreira',
    customerPhone: '11964553322',
    customerWhatsapp: '11964553322',
    installmentNumber: 1,
    totalInstallments: 1,
    amount: 340.00,
    dueDate: getDateOffset(-2),
    status: 'paid',
    paidAmount: 340.00,
    paymentDate: getDateOffset(-2),
    paymentMethod: 'pix',
    notes: 'Pago à vista no ato da entrega.',
  },

  // Sale 1004: 2x 170.00 (1 OVERDUE by 10 days, 2nd due in 20 days)
  {
    id: 'inst-6',
    saleId: 'sale-1004',
    customerId: 'cust-4',
    customerName: 'Antônio Marcos Silveira',
    customerPhone: '11953218877',
    customerWhatsapp: '11953218877',
    installmentNumber: 1,
    totalInstallments: 2,
    amount: 170.00,
    dueDate: getDateOffset(-10), // OVERDUE 10 days
    status: 'overdue',
    notes: 'Cliente prometeu pagar esta semana.',
  },
  {
    id: 'inst-7',
    saleId: 'sale-1004',
    customerId: 'cust-4',
    customerName: 'Antônio Marcos Silveira',
    customerPhone: '11953218877',
    customerWhatsapp: '11953218877',
    installmentNumber: 2,
    totalInstallments: 2,
    amount: 170.00,
    dueDate: getDateOffset(20),
    status: 'pending',
  },

  // Sale 1005: 1x 340.00 (DUE in 4 days)
  {
    id: 'inst-8',
    saleId: 'sale-1005',
    customerId: 'cust-5',
    customerName: 'Fernanda Lima Ribeiro',
    customerPhone: '11942337711',
    customerWhatsapp: '11942337711',
    installmentNumber: 1,
    totalInstallments: 1,
    amount: 340.00,
    dueDate: getDateOffset(4),
    status: 'pending',
  },
];

export const INITIAL_PURCHASES: Purchase[] = [
  {
    id: 'pur-501',
    purchaseNumber: 'CMP-501',
    supplier: 'Distribuidora Central de Alimentos Ltda',
    supplierName: 'Distribuidora Central de Alimentos Ltda',
    date: getDateOffset(-25),
    purchaseDate: getDateOffset(-25),
    paymentMethod: 'pix',
    items: [
      {
        productId: 'prod-1',
        productName: 'Arroz',
        quantity: 120, // 4 fardos x 30kg = 120kg
        unit: 'kg',
        packageCount: 4,
        packageType: 'fardo',
        unitsPerPackage: 30,
        packageCost: 120.00,
        unitCost: 4.00,
        totalCost: 480.00,
      },
      {
        productId: 'prod-3',
        productName: 'Feijão',
        quantity: 60, // 2 fardos x 30kg = 60kg
        unit: 'kg',
        packageCount: 2,
        packageType: 'fardo',
        unitsPerPackage: 30,
        packageCost: 210.00,
        unitCost: 7.00,
        totalCost: 420.00,
      },
      {
        productId: 'prod-8',
        productName: 'Café',
        quantity: 50, // 5 fardos x 10un = 50un
        unit: 'un',
        packageCount: 5,
        packageType: 'fardo',
        unitsPerPackage: 10,
        packageCost: 140.00,
        unitCost: 14.00,
        totalCost: 700.00,
      },
    ],
    totalCost: 1600.00,
    totalAmount: 1600.00,
    notes: 'Compra de fardos de arroz, feijão e café no atacado.',
    createdAt: getDateOffset(-25) + 'T08:30:00.000Z',
  },
  {
    id: 'pur-502',
    purchaseNumber: 'CMP-502',
    supplier: 'Atacadão Laticínios e Mercearia',
    supplierName: 'Atacadão Laticínios e Mercearia',
    date: getDateOffset(-12),
    purchaseDate: getDateOffset(-12),
    paymentMethod: 'boleto',
    items: [
      {
        productId: 'prod-7',
        productName: 'Leite em pó',
        quantity: 48, // 2 fardos x 24un = 48un
        unit: 'un',
        packageCount: 2,
        packageType: 'fardo',
        unitsPerPackage: 24,
        packageCost: 180.00,
        unitCost: 7.50,
        totalCost: 360.00,
      },
      {
        productId: 'prod-13',
        productName: 'Óleo',
        quantity: 40, // 2 caixas x 20un = 40un
        unit: 'un',
        packageCount: 2,
        packageType: 'caixa',
        unitsPerPackage: 20,
        packageCost: 130.00,
        unitCost: 6.50,
        totalCost: 260.00,
      },
      {
        productId: 'prod-9',
        productName: 'Macarrão',
        quantity: 60, // 3 fardos x 20un = 60un
        unit: 'un',
        packageCount: 3,
        packageType: 'fardo',
        unitsPerPackage: 20,
        packageCost: 60.00,
        unitCost: 3.00,
        totalCost: 180.00,
      },
    ],
    totalCost: 800.00,
    totalAmount: 800.00,
    notes: 'Reposição de leite em pó, óleo e massas.',
    createdAt: getDateOffset(-12) + 'T14:10:00.000Z',
  },
];

export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [
  {
    id: 'mov-1',
    productId: 'prod-1',
    productName: 'Arroz',
    type: 'purchase',
    quantity: 120,
    unit: 'kg',
    date: getDateOffset(-25) + 'T08:30:00.000Z',
    reason: 'Compra CMP-501 (4 fardos de 30kg)',
    referenceId: 'pur-501',
  },
  {
    id: 'mov-2',
    productId: 'prod-1',
    productName: 'Arroz',
    type: 'sale',
    quantity: -12,
    unit: 'kg',
    date: getDateOffset(-20) + 'T10:30:00.000Z',
    reason: 'Venda VND-1002 (Carlos Eduardo)',
    referenceId: 'sale-1002',
  },
  {
    id: 'mov-3',
    productId: 'prod-3',
    productName: 'Feijão',
    type: 'sale',
    quantity: -2,
    unit: 'kg',
    date: getDateOffset(-20) + 'T10:30:00.000Z',
    reason: 'Venda VND-1002 (Carlos Eduardo)',
    referenceId: 'sale-1002',
  },
];

export const INITIAL_BUSINESS_SETTINGS: BusinessSettings = {
  businessName: 'CestUP Distribuidora de Alimentos',
  document: '42.819.394/0001-85',
  phone: '(11) 98765-4321',
  pixKey: 'contato@cestup.com.br',
  pixKeyType: 'E-mail',
  address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
  defaultBasketPrice: 340.00,
  alertDaysNotice: 7,
  whatsappMessageTemplateReminder: 'Olá, {cliente}! Tudo bem? Passando para lembrar que sua parcela ({parcela}) no valor de {valor} da sua cesta básica vence em {vencimento}. Chave PIX: {pix}. Qualquer dúvida estamos à disposição! - {empresa}',
  whatsappMessageTemplateToday: 'Olá, {cliente}! Tudo bem? Lembramos que sua parcela ({parcela}) no valor de {valor} da cesta básica VENCE HOJE ({vencimento}). Para facilitar, nossa chave PIX é: {pix}. Favor nos enviar o comprovante assim que efetuar. Obrigado! - {empresa}',
  whatsappMessageTemplateOverdue: 'Olá, {cliente}. Notamos que sua parcela ({parcela}) no valor de {valor} referente à sua cesta básica está com vencimento pendente desde {vencimento} ({dias_atraso} dias em atraso). Poderia verificar o pagamento? Chave PIX: {pix}. Agradecemos o contato para regularização! - {empresa}',
};
