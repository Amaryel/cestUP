export interface Customer {
  id: string;
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

export type UnitType = 'un' | 'kg' | 'g' | 'pct' | 'lt' | 'cx' | 'lata';

export interface Product {
  id: string;
  name: string;
  category: string;
  unit: UnitType;
  stock: number;
  minStock: number;
  unitCost: number; // in BRL
  refPrice: number; // in BRL (suggested single price)
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
  quantity: number;
  unit?: UnitType;
  unitCost: number;
  totalCost: number;
}

export interface Purchase {
  id: string;
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
