import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  Company,
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
  INITIAL_COMPANIES,
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
import { useAuth } from './AuthContext';

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

export interface CatalogExportData {
  version: string;
  sourceCompanyId: string;
  sourceCompanyName: string;
  exportedAt: string;
  products: Product[];
  basketTemplates: BasketTemplate[];
}

interface AppContextType {
  // Companies / Multi-tenant (Multibanco)
  companies: Company[];
  activeCompanyId: string;
  activeCompany: Company;
  setActiveCompanyId: (companyId: string) => void;
  addCompany: (company: Omit<Company, 'id' | 'createdAt'>) => Company;
  updateCompany: (id: string, patch: Partial<Company>) => void;
  deleteCompany: (id: string) => { success: boolean; error?: string };

  // Export / Import between companies
  exportProductsCatalog: (companyId?: string) => string;
  importProductsCatalog: (
    jsonString: string,
    targetCompanyId?: string,
    mode?: 'merge' | 'replace'
  ) => { success: boolean; importedProductsCount: number; importedTemplatesCount: number; message: string };
  cloneProductsFromCompany: (
    sourceCompanyId: string,
    targetCompanyId?: string,
    mode?: 'merge' | 'replace'
  ) => { success: boolean; importedProductsCount: number; importedTemplatesCount: number; message: string };

  // Data Scoped to Active Company
  customers: Customer[];
  products: Product[];
  basketTemplates: BasketTemplate[];
  sales: Sale[];
  installments: Installment[];
  purchases: Purchase[];
  stockMovements: StockMovement[];
  settings: BusinessSettings;

  // View state
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

  // Summary Metrics (Scoped to Active Company)
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
  COMPANIES: 'cestup_companies_v4',
  ACTIVE_COMPANY: 'cestup_active_company_id_v4',
  CUSTOMERS: 'cestup_customers_v4',
  PRODUCTS: 'cestup_products_v4',
  TEMPLATES: 'cestup_templates_v4',
  SALES: 'cestup_sales_v4',
  INSTALLMENTS: 'cestup_installments_v4',
  PURCHASES: 'cestup_purchases_v4',
  MOVEMENTS: 'cestup_movements_v4',
  SETTINGS: 'cestup_settings_v4',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // 1. COMPANIES (Multibanco)
  const [companies, setCompanies] = useState<Company[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COMPANIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_COMPANIES;
  });

  const [activeCompanyId, setActiveCompanyIdState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_COMPANY);
      if (saved) return saved;
    } catch {}
    return 'comp-1';
  });

  // Keep active company in sync with user assignment if not superadmin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'superadmin' && currentUser.companyId) {
      setActiveCompanyIdState(currentUser.companyId);
    }
  }, [currentUser]);

  const setActiveCompanyId = (newId: string) => {
    // If regular user has a fixed companyId, they can't switch to another company
    if (currentUser && currentUser.role !== 'superadmin' && currentUser.companyId && currentUser.companyId !== newId) {
      return;
    }
    setActiveCompanyIdState(newId);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_COMPANY, newId);
  };

  const activeCompany: Company = useMemo(() => {
    const found = companies.find((c) => c.id === activeCompanyId);
    if (found) return found;
    if (companies.length > 0) return companies[0];
    return INITIAL_COMPANIES[0];
  }, [companies, activeCompanyId]);

  // Sync companies to storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_COMPANY, activeCompanyId);
  }, [activeCompanyId]);

  // 2. MASTER REPOSITORIES (Tagged with companyId)
  const [allCustomers, setAllCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      if (saved) return JSON.parse(saved);
      // Migration from v3
      const legacy = localStorage.getItem('cesta_customers_v3');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        return parsed.map((c: any) => ({ ...c, companyId: c.companyId || 'comp-1' }));
      }
    } catch {}
    return INITIAL_CUSTOMERS.map((c) => ({ ...c, companyId: c.companyId || 'comp-1' }));
  });

  const [allProducts, setAllProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (saved) return JSON.parse(saved);
      const legacy = localStorage.getItem('cesta_products_v3');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        return parsed.map((p: any) => ({ ...p, companyId: p.companyId || 'comp-1' }));
      }
    } catch {}
    return INITIAL_PRODUCTS.map((p) => ({ ...p, companyId: p.companyId || 'comp-1' }));
  });

  const [allBasketTemplates, setAllBasketTemplates] = useState<BasketTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
      if (saved) return JSON.parse(saved);
      const legacy = localStorage.getItem('cesta_templates_v3');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        return parsed.map((t: any) => ({ ...t, companyId: t.companyId || 'comp-1' }));
      }
    } catch {}
    return INITIAL_BASKET_TEMPLATES.map((t) => ({ ...t, companyId: t.companyId || 'comp-1' }));
  });

  const [allSales, setAllSales] = useState<Sale[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SALES);
      if (saved) return JSON.parse(saved);
      const legacy = localStorage.getItem('cesta_sales_v3');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        return parsed.map((s: any) => ({ ...s, companyId: s.companyId || 'comp-1' }));
      }
    } catch {}
    return INITIAL_SALES.map((s) => ({ ...s, companyId: s.companyId || 'comp-1' }));
  });

  const [allInstallments, setAllInstallments] = useState<Installment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INSTALLMENTS);
      const raw = saved ? JSON.parse(saved) : null;
      if (raw) {
        return raw.map((inst: Installment) => {
          const compId = inst.companyId || 'comp-1';
          if (inst.status !== 'paid' && inst.status !== 'cancelled') {
            const diff = getDaysDifference(inst.dueDate);
            if (diff < 0) return { ...inst, companyId: compId, status: 'overdue' as const };
            return { ...inst, companyId: compId, status: 'pending' as const };
          }
          return { ...inst, companyId: compId };
        });
      }
      const legacy = localStorage.getItem('cesta_installments_v3');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        return parsed.map((inst: any) => ({ ...inst, companyId: inst.companyId || 'comp-1' }));
      }
    } catch {}
    return INITIAL_INSTALLMENTS.map((i) => ({ ...i, companyId: i.companyId || 'comp-1' }));
  });

  const [allPurchases, setAllPurchases] = useState<Purchase[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PURCHASES);
      if (saved) return JSON.parse(saved);
      const legacy = localStorage.getItem('cesta_purchases_v3');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        return parsed.map((p: any) => ({ ...p, companyId: p.companyId || 'comp-1' }));
      }
    } catch {}
    return INITIAL_PURCHASES.map((p) => ({ ...p, companyId: p.companyId || 'comp-1' }));
  });

  const [allStockMovements, setAllStockMovements] = useState<StockMovement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
      if (saved) return JSON.parse(saved);
      const legacy = localStorage.getItem('cesta_movements_v3');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        return parsed.map((m: any) => ({ ...m, companyId: m.companyId || 'comp-1' }));
      }
    } catch {}
    return INITIAL_STOCK_MOVEMENTS.map((m) => ({ ...m, companyId: m.companyId || 'comp-1' }));
  });

  // Sync master lists to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(allCustomers));
  }, [allCustomers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(allProducts));
  }, [allProducts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(allBasketTemplates));
  }, [allBasketTemplates]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(allSales));
  }, [allSales]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INSTALLMENTS, JSON.stringify(allInstallments));
  }, [allInstallments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(allPurchases));
  }, [allPurchases]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(allStockMovements));
  }, [allStockMovements]);

  // 3. COMPUTED SCOPED ARRAYS FOR THE CURRENT ACTIVE COMPANY
  const customers = useMemo(() => {
    return allCustomers.filter((c) => (c.companyId || 'comp-1') === activeCompanyId);
  }, [allCustomers, activeCompanyId]);

  const products = useMemo(() => {
    return allProducts.filter((p) => (p.companyId || 'comp-1') === activeCompanyId);
  }, [allProducts, activeCompanyId]);

  const basketTemplates = useMemo(() => {
    return allBasketTemplates.filter((t) => (t.companyId || 'comp-1') === activeCompanyId);
  }, [allBasketTemplates, activeCompanyId]);

  const sales = useMemo(() => {
    return allSales.filter((s) => (s.companyId || 'comp-1') === activeCompanyId);
  }, [allSales, activeCompanyId]);

  const installments = useMemo(() => {
    return allInstallments.filter((i) => (i.companyId || 'comp-1') === activeCompanyId);
  }, [allInstallments, activeCompanyId]);

  const purchases = useMemo(() => {
    return allPurchases.filter((p) => (p.companyId || 'comp-1') === activeCompanyId);
  }, [allPurchases, activeCompanyId]);

  const stockMovements = useMemo(() => {
    return allStockMovements.filter((m) => (m.companyId || 'comp-1') === activeCompanyId);
  }, [allStockMovements, activeCompanyId]);

  // Scoped Settings synced with activeCompany
  const settings: BusinessSettings = useMemo(() => {
    return {
      businessName: activeCompany.name || INITIAL_BUSINESS_SETTINGS.businessName,
      document: activeCompany.document || INITIAL_BUSINESS_SETTINGS.document,
      phone: activeCompany.phone || INITIAL_BUSINESS_SETTINGS.phone,
      pixKey: activeCompany.pixKey || INITIAL_BUSINESS_SETTINGS.pixKey,
      pixKeyType: activeCompany.pixKeyType || INITIAL_BUSINESS_SETTINGS.pixKeyType,
      address: activeCompany.address || INITIAL_BUSINESS_SETTINGS.address,
      defaultBasketPrice: activeCompany.defaultBasketPrice || INITIAL_BUSINESS_SETTINGS.defaultBasketPrice,
      alertDaysNotice: activeCompany.alertDaysNotice || INITIAL_BUSINESS_SETTINGS.alertDaysNotice,
      whatsappMessageOverdue: activeCompany.whatsappMessageOverdue || INITIAL_BUSINESS_SETTINGS.whatsappMessageOverdue,
      whatsappMessageDueToday: activeCompany.whatsappMessageDueToday || INITIAL_BUSINESS_SETTINGS.whatsappMessageDueToday,
      whatsappMessageUpcoming: activeCompany.whatsappMessageUpcoming || INITIAL_BUSINESS_SETTINGS.whatsappMessageUpcoming,
    };
  }, [activeCompany]);

  // ==========================================
  // COMPANY MANAGEMENT ACTIONS
  // ==========================================
  const addCompany = (data: Omit<Company, 'id' | 'createdAt'>): Company => {
    const newCompanyId = 'comp-' + Date.now();
    const newCompany: Company = {
      ...data,
      id: newCompanyId,
      createdAt: new Date().toISOString(),
      status: data.status || 'active',
    };
    setCompanies((prev) => [...prev, newCompany]);
    return newCompany;
  };

  const updateCompany = (id: string, patch: Partial<Company>) => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  };

  const deleteCompany = (id: string): { success: boolean; error?: string } => {
    if (companies.length <= 1) {
      return { success: false, error: 'O sistema deve conter pelo menos uma empresa cadastrada.' };
    }
    if (id === 'comp-1') {
      return { success: false, error: 'A empresa Matriz padrão não pode ser excluída.' };
    }

    setCompanies((prev) => prev.filter((c) => c.id !== id));
    // Clean associated scoped records
    setAllCustomers((prev) => prev.filter((c) => c.companyId !== id));
    setAllProducts((prev) => prev.filter((p) => p.companyId !== id));
    setAllBasketTemplates((prev) => prev.filter((t) => t.companyId !== id));
    setAllSales((prev) => prev.filter((s) => s.companyId !== id));
    setAllInstallments((prev) => prev.filter((i) => i.companyId !== id));
    setAllPurchases((prev) => prev.filter((p) => p.companyId !== id));
    setAllStockMovements((prev) => prev.filter((m) => m.companyId !== id));

    if (activeCompanyId === id) {
      const fallback = companies.find((c) => c.id !== id)?.id || 'comp-1';
      setActiveCompanyId(fallback);
    }
    return { success: true };
  };

  // ==========================================
  // EXPORT / IMPORT / CLONE CATALOG
  // ==========================================
  const exportProductsCatalog = (companyId?: string): string => {
    const targetId = companyId || activeCompanyId;
    const targetComp = companies.find((c) => c.id === targetId) || activeCompany;
    const targetProducts = allProducts.filter((p) => (p.companyId || 'comp-1') === targetId);
    const targetTemplates = allBasketTemplates.filter((t) => (t.companyId || 'comp-1') === targetId);

    const exportPayload: CatalogExportData = {
      version: 'cestup-catalog-v1',
      sourceCompanyId: targetId,
      sourceCompanyName: targetComp.name,
      exportedAt: new Date().toISOString(),
      products: targetProducts,
      basketTemplates: targetTemplates,
    };

    return JSON.stringify(exportPayload, null, 2);
  };

  const importProductsCatalog = (
    jsonString: string,
    targetCompanyId?: string,
    mode: 'merge' | 'replace' = 'merge'
  ): { success: boolean; importedProductsCount: number; importedTemplatesCount: number; message: string } => {
    try {
      const data = JSON.parse(jsonString.trim());
      const incomingProducts: Product[] = Array.isArray(data)
        ? data
        : Array.isArray(data.products)
        ? data.products
        : [];
      const incomingTemplates: BasketTemplate[] = Array.isArray(data.basketTemplates) ? data.basketTemplates : [];

      if (incomingProducts.length === 0 && incomingTemplates.length === 0) {
        return {
          success: false,
          importedProductsCount: 0,
          importedTemplatesCount: 0,
          message: 'Nenhum produto ou modelo de cesta válido foi encontrado no arquivo JSON.',
        };
      }

      const destCompanyId = targetCompanyId || activeCompanyId;
      const now = new Date().toISOString();

      // Remap product IDs to avoid collisions and link to destCompanyId
      const idMap = new Map<string, string>();
      const mappedProducts: Product[] = incomingProducts.map((p, idx) => {
        const newId = 'prod-' + Date.now() + '-' + idx;
        idMap.set(p.id, newId);
        return {
          ...p,
          id: newId,
          companyId: destCompanyId,
          createdAt: now,
        };
      });

      // Remap template item product IDs
      const mappedTemplates: BasketTemplate[] = incomingTemplates.map((t, idx) => {
        const newTplId = 'tpl-' + Date.now() + '-' + idx;
        return {
          ...t,
          id: newTplId,
          companyId: destCompanyId,
          createdAt: now,
          items: t.items.map((it) => ({
            ...it,
            productId: idMap.get(it.productId) || it.productId,
          })),
        };
      });

      if (mode === 'replace') {
        // Remove existing for destCompanyId and insert new
        setAllProducts((prev) => [
          ...prev.filter((p) => (p.companyId || 'comp-1') !== destCompanyId),
          ...mappedProducts,
        ]);
        if (mappedTemplates.length > 0) {
          setAllBasketTemplates((prev) => [
            ...prev.filter((t) => (t.companyId || 'comp-1') !== destCompanyId),
            ...mappedTemplates,
          ]);
        }
      } else {
        // Merge: Add products that don't match existing names
        setAllProducts((prev) => {
          const currentCompanyProds = prev.filter((p) => (p.companyId || 'comp-1') === destCompanyId);
          const currentNames = new Set(currentCompanyProds.map((p) => p.name.trim().toLowerCase()));
          const newProdsToAdd = mappedProducts.filter((p) => !currentNames.has(p.name.trim().toLowerCase()));
          return [...prev, ...newProdsToAdd];
        });

        if (mappedTemplates.length > 0) {
          setAllBasketTemplates((prev) => {
            const currentCompanyTemplates = prev.filter((t) => (t.companyId || 'comp-1') === destCompanyId);
            const currentTemplateNames = new Set(currentCompanyTemplates.map((t) => t.name.trim().toLowerCase()));
            const newTemplatesToAdd = mappedTemplates.filter(
              (t) => !currentTemplateNames.has(t.name.trim().toLowerCase())
            );
            return [...prev, ...newTemplatesToAdd];
          });
        }
      }

      return {
        success: true,
        importedProductsCount: mappedProducts.length,
        importedTemplatesCount: mappedTemplates.length,
        message: `${mappedProducts.length} produtos e ${mappedTemplates.length} modelos de cestas importados com sucesso para a empresa!`,
      };
    } catch (err: any) {
      return {
        success: false,
        importedProductsCount: 0,
        importedTemplatesCount: 0,
        message: 'Erro ao interpretar JSON de importação: ' + (err.message || 'Formato inválido'),
      };
    }
  };

  const cloneProductsFromCompany = (
    sourceCompanyId: string,
    targetCompanyId?: string,
    mode: 'merge' | 'replace' = 'merge'
  ) => {
    const json = exportProductsCatalog(sourceCompanyId);
    return importProductsCatalog(json, targetCompanyId || activeCompanyId, mode);
  };

  // ==========================================
  // CRUD ACTIONS (SCOPED TO ACTIVE COMPANY)
  // ==========================================

  // Customer Actions
  const addCustomer = (data: Omit<Customer, 'id' | 'createdAt'>): Customer => {
    const newCustomer: Customer = {
      ...data,
      id: 'cust-' + Date.now(),
      companyId: activeCompanyId,
      createdAt: new Date().toISOString(),
    };
    setAllCustomers((prev) => [newCustomer, ...prev]);
    return newCustomer;
  };

  const updateCustomer = (id: string, patch: Partial<Customer>) => {
    setAllCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  };

  const deleteCustomer = (id: string) => {
    setAllCustomers((prev) => prev.filter((c) => c.id !== id));
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
      companyId: activeCompanyId,
      createdAt: new Date().toISOString(),
    };
    setAllProducts((prev) => [...prev, newProduct]);
    return newProduct;
  };

  const updateProduct = (id: string, patch: Partial<Product>) => {
    setAllProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  };

  const deleteProduct = (id: string) => {
    setAllProducts((prev) => prev.filter((p) => p.id !== id));
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
      companyId: activeCompanyId,
      productId,
      productName: prod.name,
      type,
      quantity: Math.abs(deltaQty),
      unit: prod.unit,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      reason,
    };

    setAllStockMovements((prev) => [movement, ...prev]);
  };

  const adjustStock = adjustProductStock;

  // Basket Template Actions
  const addBasketTemplate = (
    data: Omit<BasketTemplate, 'id' | 'createdAt'>
  ): BasketTemplate => {
    const newTemplate: BasketTemplate = {
      ...data,
      id: 'tpl-' + Date.now(),
      companyId: activeCompanyId,
      createdAt: new Date().toISOString(),
    };
    setAllBasketTemplates((prev) => [...prev, newTemplate]);
    return newTemplate;
  };

  const updateBasketTemplate = (id: string, patch: Partial<BasketTemplate>) => {
    setAllBasketTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
  };

  const deleteBasketTemplate = (id: string) => {
    setAllBasketTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const getDefaultBasketTemplate = (): BasketTemplate | undefined => {
    return basketTemplates.find((t) => t.isDefault) || basketTemplates[0];
  };

  // Calculate maximum complete baskets possible with current stock
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

  // Sale Actions
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
    const saleNumber = 'VND-' + (sales.length + 1001);

    const profit = params.totalSaleValue - params.totalCost;
    const profitMarginPct =
      params.totalSaleValue > 0 ? (profit / params.totalSaleValue) * 100 : 0;

    const newSale: Sale = {
      id: saleId,
      companyId: activeCompanyId,
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
      deliveryDate: getTodayDateString(),
      createdAt: new Date().toISOString(),
      notes: params.notes,
      status: 'completed',
    };

    // Auto-generate Installments
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
          id: 'inst-' + Date.now() + '-' + (idx + 1),
          companyId: activeCompanyId,
          saleId,
          customerId: params.customerId,
          customerName: customer ? customer.name : 'Cliente',
          customerPhone: customer ? customer.phone : '',
          customerWhatsapp: customer ? customer.whatsapp : '',
          installmentNumber: idx + 1,
          totalInstallments: params.installments.length,
          amount: inst.amount,
          dueDate: inst.dueDate,
          status,
          paidAmount: params.paymentPlan === 'cash' ? inst.amount : undefined,
          paymentDate:
            params.paymentPlan === 'cash' ? getTodayDateString() : undefined,
          paymentMethod: params.paymentPlan === 'cash' ? 'pix' : undefined,
          notes:
            params.paymentPlan === 'cash'
              ? 'Pagamento à vista na entrega'
              : `Parcela ${idx + 1}/${params.installments.length}`,
        };
      }
    );

    // Decrement stock for all items
    params.items.forEach((item) => {
      adjustProductStock(
        item.productId,
        -item.quantity,
        'sale',
        `Saída p/ montagem de cesta da Venda ${saleNumber}`
      );
    });

    setAllSales((prev) => [newSale, ...prev]);
    setAllInstallments((prev) => [...newInstallments, ...prev]);

    return newSale;
  };

  const cancelSale = (saleId: string) => {
    const sale = allSales.find((s) => s.id === saleId);
    if (!sale) return;

    // Refund stock
    sale.items.forEach((item) => {
      adjustProductStock(
        item.productId,
        item.quantity,
        'in_return',
        `Cancelamento da venda ${sale.saleNumber} (Estorno p/ estoque)`
      );
    });

    setAllSales((prev) =>
      prev.map((s) => (s.id === saleId ? { ...s, status: 'cancelled' } : s))
    );

    setAllInstallments((prev) =>
      prev.map((i) => (i.saleId === saleId ? { ...i, status: 'cancelled' } : i))
    );
  };

  const deleteSale = (saleId: string) => {
    setAllSales((prev) => prev.filter((s) => s.id !== saleId));
    setAllInstallments((prev) => prev.filter((i) => i.saleId !== saleId));
  };

  // Installment Actions
  const recordPayment = (
    installmentId: string,
    paidAmount: number,
    paymentMethod: Installment['paymentMethod'],
    notes?: string,
    paymentDate?: string
  ) => {
    setAllInstallments((prev) =>
      prev.map((inst) => {
        if (inst.id === installmentId) {
          return {
            ...inst,
            status: 'paid',
            paidAmount: paidAmount > 0 ? paidAmount : inst.amount,
            paymentDate: paymentDate || getTodayDateString(),
            paymentMethod: paymentMethod || 'pix',
            notes: notes ? `${inst.notes || ''} | ${notes}`.trim() : inst.notes,
          };
        }
        return inst;
      })
    );
  };

  const updateInstallment = (id: string, patch: Partial<Installment>) => {
    setAllInstallments((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...patch } : i))
    );
  };

  // Purchase Actions
  const createPurchase = (
    purchaseData:
      | Omit<Purchase, 'id' | 'purchaseNumber' | 'createdAt'>
      | {
          supplierName: string;
          purchaseDate: string;
          items: any[];
          totalAmount: number;
          paymentMethod: string;
          notes?: string;
        }
  ): Purchase => {
    const purchaseId = 'pur-' + Date.now();
    const purchaseNumber = 'CMP-' + (purchases.length + 501);

    const supplier = (purchaseData as any).supplierName || (purchaseData as any).supplier || 'Fornecedor Atacado';
    const date = (purchaseData as any).purchaseDate || (purchaseData as any).date || getTodayDateString();
    const totalCost = (purchaseData as any).totalAmount || (purchaseData as any).totalCost || 0;

    const newPurchase: Purchase = {
      id: purchaseId,
      companyId: activeCompanyId,
      purchaseNumber,
      supplier,
      supplierName: supplier,
      date,
      purchaseDate: date,
      items: purchaseData.items,
      totalCost,
      totalAmount: totalCost,
      paymentMethod: purchaseData.paymentMethod || 'boleto',
      notes: purchaseData.notes,
      createdAt: new Date().toISOString(),
    };

    // Increment inventory and recalculate unit costs
    purchaseData.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        const oldTotalValue = prod.stock * prod.unitCost;
        const newIncomingValue = item.totalCost || item.quantity * item.unitCost;
        const newTotalQty = prod.stock + item.quantity;
        const newWeightedUnitCost =
          newTotalQty > 0 ? (oldTotalValue + newIncomingValue) / newTotalQty : item.unitCost;

        updateProduct(prod.id, {
          stock: newTotalQty,
          unitCost: Math.round(newWeightedUnitCost * 100) / 100,
          packageType: item.packageType || prod.packageType,
          unitsPerPackage: item.unitsPerPackage || prod.unitsPerPackage,
          packageCost: item.packageCost || prod.packageCost,
        });

        const movement: StockMovement = {
          id: 'mov-' + Date.now() + '-' + prod.id,
          companyId: activeCompanyId,
          productId: prod.id,
          productName: prod.name,
          type: 'purchase',
          quantity: item.quantity,
          unit: prod.unit,
          date: date,
          createdAt: new Date().toISOString(),
          reason: `Entrada da Compra ${purchaseNumber} (${item.packageCount ? item.packageCount + ' ' + (item.packageType || 'emb') : item.quantity + ' ' + prod.unit})`,
          referenceId: purchaseId,
        };
        setAllStockMovements((prev) => [movement, ...prev]);
      }
    });

    setAllPurchases((prev) => [newPurchase, ...prev]);
    return newPurchase;
  };

  const deletePurchase = (id: string) => {
    setAllPurchases((prev) => prev.filter((p) => p.id !== id));
  };

  // Settings Actions
  const updateSettings = (newSettings: Partial<BusinessSettings>) => {
    updateCompany(activeCompanyId, {
      name: newSettings.businessName,
      document: newSettings.document,
      phone: newSettings.phone,
      pixKey: newSettings.pixKey,
      pixKeyType: newSettings.pixKeyType,
      address: newSettings.address,
      defaultBasketPrice: newSettings.defaultBasketPrice,
      alertDaysNotice: newSettings.alertDaysNotice,
      whatsappMessageOverdue: newSettings.whatsappMessageOverdue,
      whatsappMessageDueToday: newSettings.whatsappMessageDueToday,
      whatsappMessageUpcoming: newSettings.whatsappMessageUpcoming,
    });
  };

  const resetToDemoData = () => {
    generateFictitiousDatabase();
  };

  const resetToDefaults = () => {
    setAllProducts((prev) => [
      ...prev.filter((p) => (p.companyId || 'comp-1') !== activeCompanyId),
      ...INITIAL_PRODUCTS.map((p) => ({ ...p, companyId: activeCompanyId })),
    ]);
    setAllBasketTemplates((prev) => [
      ...prev.filter((t) => (t.companyId || 'comp-1') !== activeCompanyId),
      ...INITIAL_BASKET_TEMPLATES.map((t) => ({ ...t, companyId: activeCompanyId })),
    ]);
  };

  const clearAllData = () => {
    setAllCustomers((prev) => prev.filter((c) => (c.companyId || 'comp-1') !== activeCompanyId));
    setAllSales((prev) => prev.filter((s) => (s.companyId || 'comp-1') !== activeCompanyId));
    setAllInstallments((prev) => prev.filter((i) => (i.companyId || 'comp-1') !== activeCompanyId));
    setAllPurchases((prev) => prev.filter((p) => (p.companyId || 'comp-1') !== activeCompanyId));
    setAllStockMovements((prev) => prev.filter((m) => (m.companyId || 'comp-1') !== activeCompanyId));
  };

  const generateFictitiousDatabase = () => {
    const demoProducts: Product[] = INITIAL_PRODUCTS.map((p) => ({
      ...p,
      companyId: activeCompanyId,
      stock: p.stock > 0 ? p.stock : Math.floor(Math.random() * 40) + 30,
    }));

    const demoCustomers = INITIAL_CUSTOMERS.map((c) => ({ ...c, companyId: activeCompanyId }));
    const demoPurchases = INITIAL_PURCHASES.map((p) => ({ ...p, companyId: activeCompanyId }));
    const demoTemplates = INITIAL_BASKET_TEMPLATES.map((t) => ({ ...t, companyId: activeCompanyId }));
    const demoSales = INITIAL_SALES.map((s) => ({ ...s, companyId: activeCompanyId }));
    const demoInstallments = INITIAL_INSTALLMENTS.map((i) => ({ ...i, companyId: activeCompanyId }));
    const demoMovements = INITIAL_STOCK_MOVEMENTS.map((m) => ({ ...m, companyId: activeCompanyId }));

    setAllCustomers((prev) => [
      ...prev.filter((c) => (c.companyId || 'comp-1') !== activeCompanyId),
      ...demoCustomers,
    ]);
    setAllProducts((prev) => [
      ...prev.filter((p) => (p.companyId || 'comp-1') !== activeCompanyId),
      ...demoProducts,
    ]);
    setAllBasketTemplates((prev) => [
      ...prev.filter((t) => (t.companyId || 'comp-1') !== activeCompanyId),
      ...demoTemplates,
    ]);
    setAllPurchases((prev) => [
      ...prev.filter((p) => (p.companyId || 'comp-1') !== activeCompanyId),
      ...demoPurchases,
    ]);
    setAllSales((prev) => [
      ...prev.filter((s) => (s.companyId || 'comp-1') !== activeCompanyId),
      ...demoSales,
    ]);
    setAllInstallments((prev) => [
      ...prev.filter((i) => (i.companyId || 'comp-1') !== activeCompanyId),
      ...demoInstallments,
    ]);
    setAllStockMovements((prev) => [
      ...prev.filter((m) => (m.companyId || 'comp-1') !== activeCompanyId),
      ...demoMovements,
    ]);
  };

  const generateQuickTestSales = (count = 3) => {
    const customerList = customers.length > 0 ? customers : INITIAL_CUSTOMERS.map(c => ({ ...c, companyId: activeCompanyId }));
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
      const basketValue = activeCompany.defaultBasketPrice || 340.0;
      const basketCost = 170.0;

      let instList: Installment[] = [];
      if (plan === 'cash') {
        instList = [
          {
            id: 'inst-gen-' + Date.now() + '-' + i + '-1',
            companyId: activeCompanyId,
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
            companyId: activeCompanyId,
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
            companyId: activeCompanyId,
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
            companyId: activeCompanyId,
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
        companyId: activeCompanyId,
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

      template.items.forEach((item) => {
        newMovements.push({
          id: 'mov-gen-' + Date.now() + '-' + item.productId + '-' + i,
          companyId: activeCompanyId,
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

    setAllSales((prev) => [...newSales, ...prev]);
    setAllInstallments((prev) => [...newInstallments, ...prev]);
    setAllStockMovements((prev) => [...newMovements, ...prev]);
  };

  // Computed Summary Metrics (for active company)
  const summaryMetrics = useMemo(() => {
    const activeInstallments = installments.filter((i) => i.status !== 'cancelled');

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
        companies,
        activeCompanyId,
        activeCompany,
        setActiveCompanyId,
        addCompany,
        updateCompany,
        deleteCompany,
        exportProductsCatalog,
        importProductsCatalog,
        cloneProductsFromCompany,
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
