export interface Company {
  id: string;
  name: string;
  tradeName?: string;
  document: string; // CNPJ
  email?: string;
  phone: string;
  address: string;
  pixKey: string;
  pixKeyType: string;
  defaultBasketPrice: number;
  alertDaysNotice: number;
  whatsappMessageOverdue?: string;
  whatsappMessageDueToday?: string;
  whatsappMessageUpcoming?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Customer {
  id: string;
  companyId?: string;
  name: string;
  document: string; // CPF or CNPJ
  phone: string;
  whatsapp: string;
  address: string;
  neighborhood?: string;
  city?: string;
  notes: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export type UnitType = 'un' | 'kg' | 'g' | 'pct' | 'lt' | 'cx' | 'lata' | 'fardo' | 'saco';

export type PackageType = 'fardo' | 'caixa' | 'pacote' | 'saco' | 'lata' | 'unidade' | string;

export interface Product {
  id: string;
  companyId?: string;
  name: string;
  category: string;
  unit: UnitType; // Unidade de estoque (ex: kg, un)
  
  // Embalagem de compra no atacado
  packageType?: PackageType; // ex: 'fardo', 'caixa', 'pacote', 'saco'
  unitsPerPackage?: number; // ex: 30 (kg por fardo), 10 (un por fardo), 24 (un por caixa)
  packageCost?: number; // Custo total da embalagem (ex: R$ 120,00)
  
  stock: number; // Saldo em unidade de estoque (ex: 60 kg, 30 un)
  minStock: number;
  unitCost: number; // Custo unitário de estoque (R$/kg ou R$/un), calculado ou informado
  refPrice?: number; // in BRL (suggested single price)
  referencePrice?: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface BasketTemplateItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: UnitType;
  unitCost: number;
}

export interface BasketTemplate {
  id: string;
  companyId?: string;
  name: string;
  description: string;
  defaultSalePrice: number;
  items: BasketTemplateItem[];
  isDefault: boolean;
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: UnitType;
  unitCost: number; // Snapshot of cost at sale time
  totalCost: number; // quantity * unitCost
}

export type PaymentPlanType = 'cash' | 'installments_1' | 'installments_2' | 'custom';

export type InstallmentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface Installment {
  id: string;
  companyId?: string;
  saleId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerWhatsapp: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  status: InstallmentStatus;
  paidAmount?: number;
  paymentDate?: string;
  paymentMethod?: 'pix' | 'dinheiro' | 'cartao_debito' | 'cartao_credito' | 'transferencia' | 'outro';
  notes?: string;
}

export interface Sale {
  id: string;
  companyId?: string;
  saleNumber: string;
  customerId: string;
  customerName: string;
  basketTemplateId?: string;
  basketName: string;
  items: SaleItem[];
  totalCost: number; // Sum of all item costs at sale time
  totalSaleValue: number; // Price charged to customer (default R$ 340,00)
  profit: number; // totalSaleValue - totalCost
  profitMarginPct: number; // (profit / totalSaleValue) * 100
  paymentPlan: PaymentPlanType;
  installmentsCount: number;
  deliveryDate?: string;
  createdAt: string;
  notes?: string;
  status: 'completed' | 'cancelled';
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number; // Quantidade adicionada ao estoque (em kg ou un)
  unit?: UnitType; // Unidade de estoque (ex: kg, un)
  
  // Detalhes da embalagem de compra (opcional se comprado em fardo/caixa)
  packageCount?: number; // ex: 2 fardos
  packageType?: PackageType; // ex: 'fardo', 'caixa'
  unitsPerPackage?: number; // ex: 30 (kg por fardo)
  packageCost?: number; // ex: R$ 120,00 por fardo
  
  unitCost: number; // Custo unitário de estoque (ex: R$ 4,00/kg)
  totalCost: number; // Custo total da linha (ex: R$ 240,00)
}

export interface Purchase {
  id: string;
  companyId?: string;
  purchaseNumber: string;
  supplier: string;
  supplierName?: string;
  date: string;
  purchaseDate?: string;
  items: PurchaseItem[];
  totalCost: number;
  totalAmount?: number;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
}

export type StockMovementType =
  | 'purchase'
  | 'sale'
  | 'adj_positive'
  | 'adj_negative'
  | 'in_purchase'
  | 'out_sale'
  | 'in_adjustment'
  | 'out_adjustment'
  | 'out_loss'
  | 'in_return';

export interface StockMovement {
  id: string;
  companyId?: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  quantity: number;
  unit: UnitType;
  date: string;
  createdAt?: string;
  reason: string;
  referenceId?: string; // saleId or purchaseId
}

export interface BusinessSettings {
  businessName: string;
  document: string;
  phone: string;
  pixKey: string;
  pixKeyType: string;
  address: string;
  defaultBasketPrice: number;
  alertDaysNotice: number;
  whatsappMessageTemplateReminder?: string;
  whatsappMessageTemplateToday?: string;
  whatsappMessageTemplateOverdue?: string;
  whatsappMessageOverdue?: string;
  whatsappMessageDueToday?: string;
  whatsappMessageUpcoming?: string;
}

export type UserRole = 'superadmin' | 'admin' | 'operator';
export type UserStatus = 'active' | 'blocked' | 'pending';

export interface AppUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  companyId?: string; // ID da empresa vinculada ao usuário (ou vazio para SuperAdmin)
  companyName?: string;
  createdAt: string;
  lastLoginAt?: string;
  avatarUrl?: string;
  isMasterSuperAdmin?: boolean;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}


