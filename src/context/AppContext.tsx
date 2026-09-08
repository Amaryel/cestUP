import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  Customer,
  Product,
  BasketTemplate,
  Sale,
  Installment,
  Purchase,
  StockMovement,
  BusinessSettings,
  SaleItem,
  PaymentPlanType,
  StockMovementType,
} from '../types';
import {
  INITIAL_CUSTOMERS,
  INITIAL_PRODUCTS,
  INITIAL_BASKET_TEMPLATES,
  INITIAL_SALES,
  INITIAL_INSTALLMENTS,
  INITIAL_PURCHASES,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_BUSINESS_SETTINGS,
} from '../data/initialData';
import { getDaysDifference, getTodayDateString } from '../utils/formatters';

export interface MaxBasketsCalculation {
  maxBaskets: number;
  limitingProduct: {
    id: string;
    name: string;
    currentStock: number;
    requiredPerBasket: number;
  } | null;
  itemsBreakdown: {
    productId: string;
    productName: string;
    currentStock: number;
    requiredPerBasket: number;
    unit: string;
    possibleBaskets: number;
  }[];
}

interface AppContextType {
  customers: Customer[];
  products: Product[];
  basketTemplates: BasketTemplate[];
  sales: Sale[];
  installments: Installment[];
  purchases: Purchase[];
  stockMovements: StockMovement[];
  settings: BusinessSettings;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;

  // Customer Actions
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Customer;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  getCustomerById: (id: string) => Customer | undefined;
  getCustomerStats: (id: string) => {
    totalPurchased: number;
    totalPaid: number;
    totalPending: number;
    totalOverdue: number;
    salesCount: number;
    basketsCount: number;
    hasOverdue: boolean;
  };

  // Product Actions
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Product;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  adjustProductStock: (
    productId: string,
    deltaQty: number,
    type: StockMovementType,
    reason: string
  ) => void;
  adjustStock: (
    productId: string,
    deltaQty: number,
    type: StockMovementType,
    reason: string
  ) => void;

  // Basket Template Actions
  addBasketTemplate: (template: Omit<BasketTemplate, 'id' | 'createdAt'>) => BasketTemplate;
  updateBasketTemplate: (id: string, template: Partial<BasketTemplate>) => void;
  deleteBasketTemplate: (id: string) => void;
  getDefaultBasketTemplate: () => BasketTemplate | undefined;
  calculateMaxBasketsPossible: (basketTemplateId?: string) => MaxBasketsCalculation;

  // Sale Actions
  createSale: (params: {
    customerId: string;
    basketTemplateId?: string;
    basketName: string;
    items: SaleItem[];
    totalCost: number;
    totalSaleValue: number;
    paymentPlan: PaymentPlanType;
    installments: { dueDate: string; amount: number }[];
    notes?: string;
  }) => Sale;
  cancelSale: (saleId: string) => void;
  deleteSale: (saleId: string) => void;

  // Installment / Collection Actions
  recordPayment: (
    installmentId: string,
    paidAmount: number,
    paymentMethod: Installment['paymentMethod'],
    notes?: string,
    paymentDate?: string
  ) => void;
  updateInstallment: (id: string, patch: Partial<Installment>) => void;

  // Purchase Actions
  createPurchase: (
    purchase:
      | Omit<Purchase, 'id' | 'purchaseNumber' | 'createdAt'>
      | {
          supplierName: string;
          purchaseDate: string;
          items: any[];
          totalAmount: number;
          paymentMethod: string;
          notes?: string;
        }
  ) => Purchase;
  deletePurchase: (id: string) => void;

  // Settings Actions
  updateSettings: (newSettings: Partial<BusinessSettings>) => void;
  resetToDemoData: () => void;
  resetToDefaults: () => void;
  clearAllData: () => void;
  generateFictitiousDatabase: () => void;
  generateQuickTestSales: (count?: number) => void;

  // Summary Metrics
  summaryMetrics: {
    totalReceivable: number;
    totalReceived: number;
    totalOverdue: number;
    totalDueToday: number;
    totalNext7Days: number;
    dueTodayList: Installment[];
    overdueList: Installment[];
    next7DaysList: Installment[];
    defaultersCount: number;
    lowStockProducts: Product[];
    monthlySalesCount: number;
    monthlyRevenue: number;
    monthlyCost: number;
    monthlyProfit: number;
    monthlyProfitMargin: number;
    allTimeSalesCount: number;
    allTimeRevenue: number;
    allTimeCost: number;
    allTimeProfit: number;
    allTimeProfitMargin: number;
    averageTicket: number;
  };
}

const STORAGE_KEYS = {
  CUSTOMERS: 'cesta_customers_v3',
  PRODUCTS: 'cesta_products_v3',
  TEMPLATES: 'cesta_templates_v3',
  SALES: 'cesta_sales_v3',
  INSTALLMENTS: 'cesta_installments_v3',
  PURCHASES: 'cesta_purchases_v3',
  MOVEMENTS: 'cesta_movements_v3',
  SETTINGS: 'cesta_settings_v3',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Initialize from LocalStorage or Fallback to Initial Seed Data
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [basketTemplates, setBasketTemplates] = useState<BasketTemplate[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    return saved ? JSON.parse(saved) : INITIAL_BASKET_TEMPLATES;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SALES);
    return saved ? JSON.parse(saved) : INITIAL_SALES;
  });

  const [installments, setInstallments] = useState<Installment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.INSTALLMENTS);
    const raw = saved ? JSON.parse(saved) : INITIAL_INSTALLMENTS;
    return raw.map((inst: Installment) => {
      if (inst.status !== 'paid' && inst.status !== 'cancelled') {
        const diff = getDaysDifference(inst.dueDate);
        if (diff < 0) {
          return { ...inst, status: 'overdue' as const };
        } else {
          return { ...inst, status: 'pending' as const };
        }
      }
      return inst;
    });
  });

  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PURCHASES);
    return saved ? JSON.parse(saved) : INITIAL_PURCHASES;
  });

  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
    return saved ? JSON.parse(saved) : INITIAL_STOCK_MOVEMENTS;
  });

  const [settings, setSettings] = useState<BusinessSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return saved ? JSON.parse(saved) : INITIAL_BUSINESS_SETTINGS;
  });

  // Sync state changes to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(basketTemplates));
  }, [basketTemplates]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INSTALLMENTS, JSON.stringify(installments));
  }, [installments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases));
  }, [purchases]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(stockMovements));
  }, [stockMovements]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // Customer Actions
  const addCustomer = (data: Omit<Customer, 'id' | 'createdAt'>): Customer => {
    const newCustomer: Customer = {
      ...data,
      id: 'cust-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    return newCustomer;
  };

  const updateCustomer = (id: string, patch: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  };

  const deleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  const getCustomerById = (id: string): Customer | undefined => {
    return customers.find((c) => c.id === id);
  };

  const getCustomerStats = (id: string) => {
    const customerSales = sales.filter(
      (s) => s.customerId === id && s.status === 'completed'
    );
    const customerInstallments = installments.filter(
      (i) => i.customerId === id && i.status !== 'cancelled'
    );

    const totalPurchased = customerSales.reduce(
      (acc, s) => acc + s.totalSaleValue,
      0
    );
    const totalPaid = customerInstallments
      .filter((i) => i.status === 'paid')
      .reduce((acc, i) => acc + (i.paidAmount || i.amount), 0);

    const pendingInstallments = customerInstallments.filter(
      (i) => i.status === 'pending'
    );
    const overdueInstallments = customerInstallments.filter(
      (i) => i.status === 'overdue' || (i.status !== 'paid' && getDaysDifference(i.dueDate) < 0)
    );

    const totalPending = pendingInstallments.reduce((acc, i) => acc + i.amount, 0);
    const totalOverdue = overdueInstallments.reduce((acc, i) => acc + i.amount, 0);

    return {
      totalPurchased,
      totalPaid,
      totalPending,
      totalOverdue,
      salesCount: customerSales.length,
      basketsCount: customerSales.length,
      hasOverdue: overdueInstallments.length > 0,
    };
  };

  // Product Actions
  const addProduct = (data: Omit<Product, 'id' | 'createdAt'>): Product => {
    const newProduct: Product = {
      ...data,
      id: 'prod-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    setProducts((prev) => [...prev, newProduct]);
    return newProduct;
  };

  const updateProduct = (id: string, patch: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const adjustProductStock = (
    productId: string,
    deltaQty: number,
    type: StockMovementType,
    reason: string
  ) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const newStock = Math.max(0, prod.stock + deltaQty);
    updateProduct(productId, { stock: newStock });

    const movement: StockMovement = {
      id: 'mov-' + Date.now(),
      productId,
      productName: prod.name,
      type,
      quantity: Math.abs(deltaQty),
      unit: prod.unit,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      reason,
    };

    setStockMovements((prev) => [movement, ...prev]);
  };

  const adjustStock = adjustProductStock;

  // Basket Template Actions
  const addBasketTemplate = (
    data: Omit<BasketTemplate, 'id' | 'createdAt'>
  ): BasketTemplate => {
    const newTemplate: BasketTemplate = {
      ...data,
      id: 'tpl-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    setBasketTemplates((prev) => [...prev, newTemplate]);
    return newTemplate;
  };

  const updateBasketTemplate = (id: string, patch: Partial<BasketTemplate>) => {
    setBasketTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
  };

  const deleteBasketTemplate = (id: string) => {
    setBasketTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const getDefaultBasketTemplate = (): BasketTemplate | undefined => {
    return basketTemplates.find((t) => t.isDefault) || basketTemplates[0];
  };

  // Calculate maximum complete baskets possible with current stock (Section 8 of prompt)
  const calculateMaxBasketsPossible = (
    basketTemplateId?: string
  ): MaxBasketsCalculation => {
    const template = basketTemplateId
      ? basketTemplates.find((t) => t.id === basketTemplateId)
      : getDefaultBasketTemplate();

    if (!template || template.items.length === 0) {
      return {
        maxBaskets: 0,
        limitingProduct: null,
        itemsBreakdown: [],
      };
    }

    let minPossible = Infinity;
    let limitingItem: MaxBasketsCalculation['limitingProduct'] = null;

    const itemsBreakdown = template.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      const currentStock = product ? product.stock : 0;
      const possible =
        item.quantity > 0 ? Math.floor(currentStock / item.quantity) : 0;

      if (possible < minPossible) {
        minPossible = possible;
        limitingItem = {
          id: item.productId,
          name: item.productName,
          currentStock,
          requiredPerBasket: item.quantity,
        };
      }

      return {
        productId: item.productId,
        productName: item.productName,
        currentStock,
        requiredPerBasket: item.quantity,
        unit: item.unit,
        possibleBaskets: possible,
      };
    });

    return {
      maxBaskets: minPossible === Infinity ? 0 : minPossible,
      limitingProduct: limitingItem,
      itemsBreakdown,
    };
  };

  // Sale Operations
  const createSale = (params: {
    customerId: string;
    basketTemplateId?: string;
    basketName: string;
    items: SaleItem[];
    totalCost: number;
    totalSaleValue: number;
    paymentPlan: PaymentPlanType;
    installments: { dueDate: string; amount: number }[];
    notes?: string;
  }): Sale => {
    const customer = getCustomerById(params.customerId);
    const saleId = 'sale-' + Date.now();
    const saleNumber = 'VEN-' + (100 + sales.length + 1);
    const nowIso = new Date().toISOString();

    const profit = params.totalSaleValue - params.totalCost;
    const profitMarginPct =
      params.totalSaleValue > 0 ? (profit / params.totalSaleValue) * 100 : 0;

    const newSale: Sale = {
      id: saleId,
      saleNumber,
      customerId: params.customerId,
      customerName: customer ? customer.name : 'Cliente',
      basketTemplateId: params.basketTemplateId,
      basketName: params.basketName,
      items: params.items,
      totalCost: params.totalCost,
      totalSaleValue: params.totalSaleValue,
      profit,
      profitMarginPct,
      paymentPlan: params.paymentPlan,
      installmentsCount: params.installments.length,
      createdAt: nowIso,
      notes: params.notes,
      status: 'completed',
    };

    // Deduct stock for all items sold and record audit stock movements
    const movementsToAdd: StockMovement[] = [];
    setProducts((prev) =>
      prev.map((p) => {
        const saleItem = params.items.find((i) => i.productId === p.id);
        if (saleItem) {
          const newQty = Math.max(0, p.stock - saleItem.quantity);
          movementsToAdd.push({
            id: 'mov-' + Date.now() + '-' + p.id,
            productId: p.id,
            productName: p.name,
            type: 'out_sale',
            quantity: saleItem.quantity,
            unit: p.unit,
            date: nowIso,
            createdAt: nowIso,
            reason: `Saída Venda ${saleNumber} (${customer?.name || 'Cliente'})`,
            referenceId: saleId,
          });
          return { ...p, stock: newQty };
        }
        return p;
      })
    );

    setStockMovements((prev) => [...movementsToAdd, ...prev]);

    // Generate installments
    const newInstallments: Installment[] = params.installments.map(
      (inst, idx) => {
        const diff = getDaysDifference(inst.dueDate);
        const status: Installment['status'] =
          params.paymentPlan === 'cash'
            ? 'paid'
            : diff < 0
            ? 'overdue'
            : 'pending';

        return {
          id: `inst-${saleId}-${idx + 1}`,
          saleId,
          customerId: params.customerId,
          customerName: customer ? customer.name : 'Cliente',
          customerPhone: customer?.phone || '',
          customerWhatsapp: customer?.whatsapp || customer?.phone || '',
          installmentNumber: idx + 1,
          totalInstallments: params.installments.length,
          amount: inst.amount,
          dueDate: inst.dueDate,
          status,
          paidAmount: params.paymentPlan === 'cash' ? inst.amount : 0,
          paymentDate:
            params.paymentPlan === 'cash' ? getTodayDateString() : undefined,
          paymentMethod: params.paymentPlan === 'cash' ? 'pix' : undefined,
        };
      }
    );

    setInstallments((prev) => [...newInstallments, ...prev]);
    setSales((prev) => [newSale, ...prev]);

    return newSale;
  };

  const cancelSale = (saleId: string) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale || sale.status === 'cancelled') return;

    const nowIso = new Date().toISOString();
    const movementsToAdd: StockMovement[] = [];

    // Return stock
    setProducts((prev) =>
      prev.map((p) => {
        const saleItem = sale.items.find((i) => i.productId === p.id);
        if (saleItem) {
          movementsToAdd.push({
            id: 'mov-' + Date.now() + '-' + p.id,
            productId: p.id,
            productName: p.name,
            type: 'in_return',
            quantity: saleItem.quantity,
            unit: p.unit,
            date: nowIso,
            createdAt: nowIso,
            reason: `Estorno de Venda Cancelada ${sale.saleNumber}`,
            referenceId: saleId,
          });
          return {
            ...p,
            stock: p.stock + saleItem.quantity,
          };
        }
        return p;
      })
    );

    setStockMovements((prev) => [...movementsToAdd, ...prev]);

    // Cancel installments
    setInstallments((prev) =>
      prev.map((i) =>
        i.saleId === saleId ? { ...i, status: 'cancelled' as const } : i
      )
    );

    // Mark sale cancelled
    setSales((prev) =>
      prev.map((s) =>
        s.id === saleId ? { ...s, status: 'cancelled' as const } : s
      )
    );
  };

  const deleteSale = (saleId: string) => {
    cancelSale(saleId);
    setSales((prev) => prev.filter((s) => s.id !== saleId));
    setInstallments((prev) => prev.filter((i) => i.saleId !== saleId));
  };

  // Payment Recording
  const recordPayment = (
    installmentId: string,
    paidAmount: number,
    paymentMethod: Installment['paymentMethod'],
    notes?: string,
    paymentDate?: string
  ) => {
    setInstallments((prev) =>
      prev.map((inst) => {
        if (inst.id === installmentId) {
          const isFullyPaid = paidAmount >= inst.amount;
          return {
            ...inst,
            status: (isFullyPaid ? 'paid' : inst.status) as Installment['status'],
            paidAmount: (inst.paidAmount || 0) + paidAmount,
            paymentDate: paymentDate || getTodayDateString(),
            paymentMethod: paymentMethod || inst.paymentMethod || 'pix',
            notes: notes ? (inst.notes ? `${inst.notes} | ${notes}` : notes) : inst.notes,
          };
        }
        return inst;
      })
    );
  };

  const updateInstallment = (id: string, patch: Partial<Installment>) => {
    setInstallments((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...patch } : i))
    );
  };

  // Purchases Operations
  const createPurchase = (data: any): Purchase => {
    const purchaseId = 'pur-' + Date.now();
    const purchaseNumber = 'CMP-' + (500 + purchases.length + 1);
    const nowIso = new Date().toISOString();

    const supplier = data.supplier || data.supplierName || 'Fornecedor';
    const date = data.date || data.purchaseDate || getTodayDateString();
    const totalCost = data.totalCost || data.totalAmount || 0;

    const newPurchase: Purchase = {
      id: purchaseId,
      purchaseNumber,
      supplier,
      supplierName: supplier,
      date,
      purchaseDate: date,
      items: data.items,
      totalCost,
      totalAmount: totalCost,
      paymentMethod: data.paymentMethod || 'pix',
      notes: data.notes,
      createdAt: nowIso,
    };

    // Update product stock and costs + register movements
    const movementsToAdd: StockMovement[] = [];
    setProducts((prev) =>
      prev.map((p) => {
        const item = data.items.find((i: any) => i.productId === p.id);
        if (item) {
          movementsToAdd.push({
            id: 'mov-' + Date.now() + '-' + p.id,
            productId: p.id,
            productName: p.name,
            type: 'in_purchase',
            quantity: item.quantity,
            unit: p.unit,
            date: nowIso,
            createdAt: nowIso,
            reason: `Compra ${purchaseNumber} (${supplier})`,
            referenceId: purchaseId,
          });

          return {
            ...p,
            stock: p.stock + item.quantity,
            unitCost: item.unitCost, // Update unit cost to real purchase cost
            packageType: item.packageType || p.packageType,
            unitsPerPackage: item.unitsPerPackage || p.unitsPerPackage,
            packageCost: item.packageCost || p.packageCost,
          };
        }
        return p;
      })
    );

    setStockMovements((prev) => [...movementsToAdd, ...prev]);
    setPurchases((prev) => [newPurchase, ...prev]);

    return newPurchase;
  };

  const deletePurchase = (id: string) => {
    setPurchases((prev) => prev.filter((p) => p.id !== id));
  };

  // Settings
  const updateSettings = (patch: Partial<BusinessSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const resetToDemoData = () => {
    setCustomers(INITIAL_CUSTOMERS);
    setProducts(INITIAL_PRODUCTS);
    setBasketTemplates(INITIAL_BASKET_TEMPLATES);
    setSales(INITIAL_SALES);
    setInstallments(INITIAL_INSTALLMENTS);
    setPurchases(INITIAL_PURCHASES);
    setStockMovements(INITIAL_STOCK_MOVEMENTS);
    setSettings(INITIAL_BUSINESS_SETTINGS);
  };

  const resetToDefaults = resetToDemoData;

  const clearAllData = () => {
    setCustomers([]);
    setProducts(INITIAL_PRODUCTS.map((p) => ({ ...p, stock: 0 })));
    setBasketTemplates(INITIAL_BASKET_TEMPLATES);
    setSales([]);
    setInstallments([]);
    setPurchases([]);
    setStockMovements([]);
  };

  const generateFictitiousDatabase = () => {
    // 1. Reset products with healthy initial inventory
    const demoProducts: Product[] = INITIAL_PRODUCTS.map((p) => ({
      ...p,
      stock: p.stock > 0 ? p.stock : Math.floor(Math.random() * 40) + 30,
    }));

    // 2. Base Customers
    const demoCustomers = INITIAL_CUSTOMERS;

    // 3. Base Purchases
    const demoPurchases = INITIAL_PURCHASES;

    // 4. Base Basket Templates
    const demoTemplates = INITIAL_BASKET_TEMPLATES;

    // 5. Restore full demo state with realistic transactions
    setCustomers(demoCustomers);
    setProducts(demoProducts);
    setBasketTemplates(demoTemplates);
    setPurchases(demoPurchases);
    setSales(INITIAL_SALES);
    setInstallments(INITIAL_INSTALLMENTS);
    setStockMovements(INITIAL_STOCK_MOVEMENTS);
    setSettings(INITIAL_BUSINESS_SETTINGS);
  };

  const generateQuickTestSales = (count = 3) => {
    if (customers.length === 0) {
      setCustomers(INITIAL_CUSTOMERS);
    }
    const customerList = customers.length > 0 ? customers : INITIAL_CUSTOMERS;
    const template = basketTemplates[0] || INITIAL_BASKET_TEMPLATES[0];

    const todayStr = getTodayDateString();
    const newSales: Sale[] = [];
    const newInstallments: Installment[] = [];
    const newMovements: StockMovement[] = [];

    const planTypes: PaymentPlanType[] = ['cash', 'installments_1', 'installments_2'];

    for (let i = 0; i < count; i++) {
      const cust = customerList[Math.floor(Math.random() * customerList.length)];
      const plan = planTypes[i % planTypes.length];
      const saleId = 'sale-gen-' + Date.now() + '-' + i;
      const saleNum = 'VEN-' + (sales.length + i + 100);
      const basketValue = 340.0;
      const basketCost = 170.0;

      let instList: Installment[] = [];
      if (plan === 'cash') {
        instList = [
          {
            id: 'inst-gen-' + Date.now() + '-' + i + '-1',
            saleId,
            customerId: cust.id,
            customerName: cust.name,
            customerPhone: cust.phone,
            customerWhatsapp: cust.whatsapp,
            installmentNumber: 1,
            totalInstallments: 1,
            dueDate: todayStr,
            amount: basketValue,
            status: 'paid',
            paidAmount: basketValue,
            paymentDate: todayStr,
            paymentMethod: 'pix',
            notes: 'Pagamento à vista via PIX',
          },
        ];
      } else if (plan === 'installments_1') {
        const isOverdue = i % 2 === 0;
        const dueOffset = isOverdue ? -5 : 25;
        const d = new Date();
        d.setDate(d.getDate() + dueOffset);
        const dueStr = d.toISOString().split('T')[0];

        instList = [
          {
            id: 'inst-gen-' + Date.now() + '-' + i + '-1',
            saleId,
            customerId: cust.id,
            customerName: cust.name,
            customerPhone: cust.phone,
            customerWhatsapp: cust.whatsapp,
            installmentNumber: 1,
            totalInstallments: 1,
            dueDate: dueStr,
            amount: basketValue,
            status: isOverdue ? 'overdue' : 'pending',
            notes: 'Parcela única de 30 dias',
          },
        ];
      } else {
        const d1 = new Date();
        d1.setDate(d1.getDate() - 10);
        const due1Str = d1.toISOString().split('T')[0];

        const d2 = new Date();
        d2.setDate(d2.getDate() + 20);
        const due2Str = d2.toISOString().split('T')[0];

        instList = [
          {
            id: 'inst-gen-' + Date.now() + '-' + i + '-1',
            saleId,
            customerId: cust.id,
            customerName: cust.name,
            customerPhone: cust.phone,
            customerWhatsapp: cust.whatsapp,
            installmentNumber: 1,
            totalInstallments: 2,
            dueDate: due1Str,
            amount: basketValue / 2,
            status: 'paid',
            paidAmount: basketValue / 2,
            paymentDate: due1Str,
            paymentMethod: 'pix',
            notes: '1ª Parcela (30 dias) - Paga',
          },
          {
            id: 'inst-gen-' + Date.now() + '-' + i + '-2',
            saleId,
            customerId: cust.id,
            customerName: cust.name,
            customerPhone: cust.phone,
            customerWhatsapp: cust.whatsapp,
            installmentNumber: 2,
            totalInstallments: 2,
            dueDate: due2Str,
            amount: basketValue / 2,
            status: 'pending',
            notes: '2ª Parcela (60 dias) - A Vencer',
          },
        ];
      }

      const saleRecord: Sale = {
        id: saleId,
        saleNumber: saleNum,
        customerId: cust.id,
        customerName: cust.name,
        basketTemplateId: template.id,
        basketName: template.name,
        items: template.items.map((it) => ({
          productId: it.productId,
          productName: it.productName,
          quantity: it.quantity,
          unit: it.unit,
          unitCost: it.unitCost,
          totalCost: it.unitCost * it.quantity,
        })),
        totalCost: basketCost,
        totalSaleValue: basketValue,
        profit: basketValue - basketCost,
        profitMarginPct: ((basketValue - basketCost) / basketValue) * 100,
        paymentPlan: plan,
        installmentsCount: instList.length,
        deliveryDate: todayStr,
        createdAt: new Date().toISOString(),
        notes: 'Venda de teste gerada automaticamente.',
        status: 'completed',
      };

      newSales.push(saleRecord);
      newInstallments.push(...instList);

      // Movements
      template.items.forEach((item) => {
        newMovements.push({
          id: 'mov-gen-' + Date.now() + '-' + item.productId + '-' + i,
          productId: item.productId,
          productName: item.productName,
          type: 'sale',
          quantity: item.quantity,
          unit: item.unit,
          date: todayStr,
          reason: `Saída p/ montagem da venda ${saleNum}`,
          referenceId: saleId,
          createdAt: new Date().toISOString(),
        });
      });
    }

    setSales((prev) => [...newSales, ...prev]);
    setInstallments((prev) => [...newInstallments, ...prev]);
    setStockMovements((prev) => [...newMovements, ...prev]);
  };

  // Computed Summary Metrics
  const summaryMetrics = useMemo(() => {
    const activeInstallments = installments.filter(
      (i) => i.status !== 'cancelled'
    );

    const totalReceived = activeInstallments
      .filter((i) => i.status === 'paid')
      .reduce((acc, i) => acc + (i.paidAmount || i.amount), 0);

    const totalReceivable = activeInstallments
      .filter((i) => i.status === 'pending' || i.status === 'overdue')
      .reduce((acc, i) => acc + i.amount, 0);

    const overdueList = activeInstallments.filter((i) => {
      if (i.status === 'paid' || i.status === 'cancelled') return false;
      return getDaysDifference(i.dueDate) < 0;
    });

    const totalOverdue = overdueList.reduce((acc, i) => acc + i.amount, 0);

    const dueTodayList = activeInstallments.filter((i) => {
      if (i.status === 'paid' || i.status === 'cancelled') return false;
      return getDaysDifference(i.dueDate) === 0;
    });

    const totalDueToday = dueTodayList.reduce((acc, i) => acc + i.amount, 0);

    const next7DaysList = activeInstallments.filter((i) => {
      if (i.status === 'paid' || i.status === 'cancelled') return false;
      const diff = getDaysDifference(i.dueDate);
      return diff > 0 && diff <= (settings.alertDaysNotice || 7);
    });

    const totalNext7Days = next7DaysList.reduce((acc, i) => acc + i.amount, 0);

    const defaulterCustomerIds = new Set(overdueList.map((i) => i.customerId));
    const defaultersCount = defaulterCustomerIds.size;

    const lowStockProducts = products.filter(
      (p) => p.status === 'active' && p.stock <= p.minStock
    );

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const monthlyCompletedSales = sales.filter((s) => {
      if (s.status !== 'completed') return false;
      const saleDate = new Date(s.createdAt);
      return (
        saleDate.getFullYear() === currentYear &&
        saleDate.getMonth() === currentMonth
      );
    });

    const monthlySalesCount = monthlyCompletedSales.length;
    const monthlyRevenue = monthlyCompletedSales.reduce(
      (acc, s) => acc + s.totalSaleValue,
      0
    );
    const monthlyCost = monthlyCompletedSales.reduce(
      (acc, s) => acc + s.totalCost,
      0
    );
    const monthlyProfit = monthlyRevenue - monthlyCost;
    const monthlyProfitMargin =
      monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0;
    const averageTicket =
      monthlySalesCount > 0 ? monthlyRevenue / monthlySalesCount : 0;

    const allTimeCompletedSales = sales.filter((s) => s.status === 'completed');
    const allTimeSalesCount = allTimeCompletedSales.length;
    const allTimeRevenue = allTimeCompletedSales.reduce((acc, s) => acc + s.totalSaleValue, 0);
    const allTimeCost = allTimeCompletedSales.reduce((acc, s) => acc + s.totalCost, 0);
    const allTimeProfit = allTimeRevenue - allTimeCost;
    const allTimeProfitMargin = allTimeRevenue > 0 ? (allTimeProfit / allTimeRevenue) * 100 : 0;

    return {
      totalReceivable,
      totalReceived,
      totalOverdue,
      totalDueToday,
      totalNext7Days,
      dueTodayList,
      overdueList,
      next7DaysList,
      defaultersCount,
      lowStockProducts,
      monthlySalesCount,
      monthlyRevenue,
      monthlyCost,
      monthlyProfit,
      monthlyProfitMargin,
      allTimeSalesCount,
      allTimeRevenue,
      allTimeCost,
      allTimeProfit,
      allTimeProfitMargin,
      averageTicket,
    };
  }, [installments, sales, products, settings.alertDaysNotice]);

  return (
    <AppContext.Provider
      value={{
        customers,
        products,
        basketTemplates,
        sales,
        installments,
        purchases,
        stockMovements,
        settings,
        activeTab,
        setActiveTab,
        selectedCustomerId,
        setSelectedCustomerId,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        getCustomerById,
        getCustomerStats,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustProductStock,
        adjustStock,
        addBasketTemplate,
        updateBasketTemplate,
        deleteBasketTemplate,
        getDefaultBasketTemplate,
        calculateMaxBasketsPossible,
        createSale,
        cancelSale,
        deleteSale,
        recordPayment,
        updateInstallment,
        createPurchase,
        deletePurchase,
        updateSettings,
        resetToDemoData,
        resetToDefaults,
        clearAllData,
        generateFictitiousDatabase,
        generateQuickTestSales,
        summaryMetrics,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
