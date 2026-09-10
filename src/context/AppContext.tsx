import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react';
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
import { INITIAL_BUSINESS_SETTINGS } from '../data/initialData';
import { getDaysDifference, getTodayDateString } from '../utils/formatters';
import { useAuth } from './AuthContext';
import { logger } from '../lib/logger';
import {
  fetchAllFromSupabase,
  syncDataToSupabase,
  dbSaveCompany,
  dbDeleteCompany,
  dbSaveCustomer,
  dbDeleteCustomer,
  dbSaveProduct,
  dbDeleteProduct,
  dbSaveBasketTemplate,
  dbDeleteBasketTemplate,
  dbSaveSaleWithInstallments,
  dbUpdateSaleStatus,
  dbDeleteSale,
  dbSaveInstallment,
  dbSavePurchaseWithStock,
  dbDeletePurchase,
  dbSaveStockMovement,
  AppSyncPayload,
} from '../lib/syncService';

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
  addCompany: (company: Omit<Company, 'id' | 'createdAt'>) => Promise<Company>;
  updateCompany: (id: string, patch: Partial<Company>) => Promise<void>;
  deleteCompany: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Export / Import between companies
  exportProductsCatalog: (companyId?: string) => string;
  importProductsCatalog: (
    jsonString: string,
    targetCompanyId?: string,
    mode?: 'merge' | 'replace'
  ) => Promise<{ success: boolean; importedProductsCount: number; importedTemplatesCount: number; message: string }>;
  cloneProductsFromCompany: (
    sourceCompanyId: string,
    targetCompanyId?: string,
    mode?: 'merge' | 'replace'
  ) => Promise<{ success: boolean; importedProductsCount: number; importedTemplatesCount: number; message: string }>;

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
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Promise<Customer>;
  updateCustomer: (id: string, customer: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
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
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<Product>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  adjustProductStock: (
    productId: string,
    deltaQty: number,
    type: StockMovementType,
    reason: string
  ) => Promise<void>;
  adjustStock: (
    productId: string,
    deltaQty: number,
    type: StockMovementType,
    reason: string
  ) => Promise<void>;

  // Basket Template Actions
  addBasketTemplate: (template: Omit<BasketTemplate, 'id' | 'createdAt'>) => Promise<BasketTemplate>;
  updateBasketTemplate: (id: string, template: Partial<BasketTemplate>) => Promise<void>;
  deleteBasketTemplate: (id: string) => Promise<void>;
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
  }) => Promise<Sale>;
  cancelSale: (saleId: string) => Promise<void>;
  deleteSale: (saleId: string) => Promise<void>;

  // Installment / Collection Actions
  recordPayment: (
    installmentId: string,
    paidAmount: number,
    paymentMethod: Installment['paymentMethod'],
    notes?: string,
    paymentDate?: string
  ) => Promise<void>;
  updateInstallment: (id: string, patch: Partial<Installment>) => Promise<void>;

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
  ) => Promise<Purchase>;
  deletePurchase: (id: string) => Promise<void>;

  // Settings Actions
  updateSettings: (newSettings: Partial<BusinessSettings>) => Promise<void>;
  resetToDemoData?: () => void;
  resetToDefaults?: () => void;
  clearAllData?: () => void;
  generateFictitiousDatabase?: () => void;
  generateQuickTestSales?: (count?: number) => void;

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

  // Cloud & Multi-Device Sync
  isSyncingData: boolean;
  lastSyncAt: string | null;
  syncErrors: string[];
  triggerFullSync: () => Promise<{ success: boolean; message: string }>;
  reloadAllData: () => Promise<void>;
}

const STORAGE_KEYS = {
  ACTIVE_COMPANY: 'cestup_active_company_id_v5',
  COMPANIES_CACHE: 'cestup_cache_companies_v5',
};

const DEFAULT_FALLBACK_COMPANY: Company = {
  id: 'comp-1',
  name: 'CestUP Distribuidora Matriz',
  document: '42.819.394/0001-85',
  phone: '(11) 98765-4321',
  address: 'Av. Paulista, 1000 - São Paulo - SP',
  pixKey: 'contato@cestup.com.br',
  pixKeyType: 'Email',
  defaultBasketPrice: 340,
  alertDaysNotice: 7,
  status: 'active',
  createdAt: '2025-01-01T00:00:00.000Z',
  whatsappMessageOverdue: 'Olá, {cliente}. Notamos que sua parcela ({parcela}) no valor de {valor} da cesta básica está pendente desde {vencimento} ({dias_atraso} dias em atraso). Chave PIX: {pix}. - {empresa}',
  whatsappMessageDueToday: 'Olá, {cliente}! Lembramos que sua parcela ({parcela}) no valor de {valor} da cesta básica VENCE HOJE ({vencimento}). Chave PIX: {pix}. Obrigado! - {empresa}',
  whatsappMessageUpcoming: 'Olá, {cliente}! Passando para lembrar que sua parcela ({parcela}) no valor de {valor} da cesta básica vencerá em {vencimento}. Chave PIX: {pix}. - {empresa}',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // 1. COMPANIES (Multibanco)
  const [companies, setCompanies] = useState<Company[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.COMPANIES_CACHE);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [DEFAULT_FALLBACK_COMPANY];
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
    return DEFAULT_FALLBACK_COMPANY;
  }, [companies, activeCompanyId]);

  // 2. MASTER REPOSITORIES (Pure State, populated directly from Supabase)
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allBasketTemplates, setAllBasketTemplates] = useState<BasketTemplate[]>([]);
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [allInstallments, setAllInstallments] = useState<Installment[]>([]);
  const [allPurchases, setAllPurchases] = useState<Purchase[]>([]);
  const [allStockMovements, setAllStockMovements] = useState<StockMovement[]>([]);

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
  // SUPABASE SYNCHRONIZATION
  // ==========================================
  const [isSyncingData, setIsSyncingData] = useState<boolean>(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);

  // Function to reload all data directly from Supabase
  const reloadAllData = async (): Promise<void> => {
    setIsSyncingData(true);
    try {
      const remote = await fetchAllFromSupabase();
      if (remote) {
        if (Array.isArray(remote.companies) && remote.companies.length > 0) {
          setCompanies(remote.companies);
          try {
            localStorage.setItem(STORAGE_KEYS.COMPANIES_CACHE, JSON.stringify(remote.companies));
          } catch {}
        }
        if (Array.isArray(remote.customers)) {
          setAllCustomers(remote.customers);
        }
        if (Array.isArray(remote.products)) {
          setAllProducts(remote.products);
        }
        if (Array.isArray(remote.basketTemplates)) {
          setAllBasketTemplates(remote.basketTemplates);
        }
        if (Array.isArray(remote.sales)) {
          setAllSales(remote.sales);
        }
        if (Array.isArray(remote.installments)) {
          setAllInstallments(remote.installments);
        }
        if (Array.isArray(remote.purchases)) {
          setAllPurchases(remote.purchases);
        }
        if (Array.isArray(remote.stockMovements)) {
          setAllStockMovements(remote.stockMovements);
        }

        setLastSyncAt(new Date().toLocaleTimeString('pt-BR'));
        setSyncErrors([]);
      }
    } catch (err: any) {
      logger.log({
        operation: 'SELECT',
        table: 'all_tables',
        success: false,
        errorMessage: err?.message || 'Falha ao carregar dados do Supabase',
      });
      setSyncErrors([err?.message || 'Erro ao consultar Supabase']);
    } finally {
      setIsSyncingData(false);
    }
  };

  // Initial Load from Supabase on mount
  useEffect(() => {
    reloadAllData();
  }, []);

  // Trigger full sync
  const triggerFullSync = async (): Promise<{ success: boolean; message: string }> => {
    setIsSyncingData(true);
    try {
      const payload: AppSyncPayload = {
        companies,
        activeCompanyId,
        customers: allCustomers,
        products: allProducts,
        basketTemplates: allBasketTemplates,
        sales: allSales,
        installments: allInstallments,
        purchases: allPurchases,
        stockMovements: allStockMovements,
        settings,
      };

      const supaResult = await syncDataToSupabase(payload);
      if (supaResult.errors.length > 0) {
        setSyncErrors(supaResult.errors);
        return { success: false, message: `Erros no Supabase: ${supaResult.errors.join('; ')}` };
      }

      setSyncErrors([]);
      setLastSyncAt(new Date().toLocaleTimeString('pt-BR'));
      await reloadAllData();
      return {
        success: true,
        message: 'Dados sincronizados com sucesso no Supabase!',
      };
    } catch (err: any) {
      const msg = err?.message || 'Erro durante a sincronização';
      setSyncErrors([msg]);
      return { success: false, message: msg };
    } finally {
      setIsSyncingData(false);
    }
  };

  // ==========================================
  // COMPANY MANAGEMENT ACTIONS (Direct to Supabase)
  // ==========================================
  const addCompany = async (data: Omit<Company, 'id' | 'createdAt'>): Promise<Company> => {
    const newCompanyId = 'comp-' + Date.now();
    const newCompany: Company = {
      ...data,
      id: newCompanyId,
      createdAt: new Date().toISOString(),
      status: data.status || 'active',
    };

    const res = await dbSaveCompany(newCompany);
    if (!res.success) {
      throw new Error(`Erro ao criar empresa no Supabase: ${res.error}`);
    }

    setCompanies((prev) => [...prev, newCompany]);
    return newCompany;
  };

  const updateCompany = async (id: string, patch: Partial<Company>): Promise<void> => {
    const current = companies.find((c) => c.id === id);
    if (!current) return;

    const updated = { ...current, ...patch };
    const res = await dbSaveCompany(updated);
    if (!res.success) {
      throw new Error(`Erro ao atualizar empresa no Supabase: ${res.error}`);
    }

    setCompanies((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  const deleteCompany = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (companies.length <= 1) {
      return { success: false, error: 'O sistema deve conter pelo menos uma empresa cadastrada.' };
    }
    if (id === 'comp-1') {
      return { success: false, error: 'A empresa Matriz padrão não pode ser excluída.' };
    }

    const res = await dbDeleteCompany(id);
    if (!res.success) {
      return { success: false, error: res.error };
    }

    setCompanies((prev) => prev.filter((c) => c.id !== id));
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

  const importProductsCatalog = async (
    jsonString: string,
    targetCompanyId?: string,
    mode: 'merge' | 'replace' = 'merge'
  ): Promise<{ success: boolean; importedProductsCount: number; importedTemplatesCount: number; message: string }> => {
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

      // Save each to Supabase
      for (const p of mappedProducts) {
        await dbSaveProduct(p);
      }
      for (const t of mappedTemplates) {
        await dbSaveBasketTemplate(t);
      }

      await reloadAllData();

      return {
        success: true,
        importedProductsCount: mappedProducts.length,
        importedTemplatesCount: mappedTemplates.length,
        message: `${mappedProducts.length} produtos e ${mappedTemplates.length} modelos de cestas importados e persistidos no Supabase!`,
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

  const cloneProductsFromCompany = async (
    sourceCompanyId: string,
    targetCompanyId?: string,
    mode: 'merge' | 'replace' = 'merge'
  ) => {
    const json = exportProductsCatalog(sourceCompanyId);
    return importProductsCatalog(json, targetCompanyId || activeCompanyId, mode);
  };

  // ==========================================
  // CRUD ACTIONS (SCOPED TO ACTIVE COMPANY & SUPABASE)
  // ==========================================

  // Customer Actions
  const addCustomer = async (data: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> => {
    const newCustomer: Customer = {
      ...data,
      id: 'cust-' + Date.now(),
      companyId: activeCompanyId,
      createdAt: new Date().toISOString(),
    };

    const res = await dbSaveCustomer(newCustomer);
    if (!res.success) {
      throw new Error(`Erro ao salvar cliente no Supabase: ${res.error}`);
    }

    setAllCustomers((prev) => [newCustomer, ...prev]);
    return newCustomer;
  };

  const updateCustomer = async (id: string, patch: Partial<Customer>): Promise<void> => {
    const current = allCustomers.find((c) => c.id === id);
    if (!current) return;

    const updated = { ...current, ...patch };
    const res = await dbSaveCustomer(updated);
    if (!res.success) {
      throw new Error(`Erro ao atualizar cliente no Supabase: ${res.error}`);
    }

    setAllCustomers((prev) =>
      prev.map((c) => (c.id === id ? updated : c))
    );
  };

  const deleteCustomer = async (id: string): Promise<void> => {
    const res = await dbDeleteCustomer(id);
    if (!res.success) {
      throw new Error(`Erro ao excluir cliente no Supabase: ${res.error}`);
    }
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
  const addProduct = async (data: Omit<Product, 'id' | 'createdAt'>): Promise<Product> => {
    const newProduct: Product = {
      ...data,
      id: 'prod-' + Date.now(),
      companyId: activeCompanyId,
      createdAt: new Date().toISOString(),
    };

    const res = await dbSaveProduct(newProduct);
    if (!res.success) {
      throw new Error(`Erro ao cadastrar produto no Supabase: ${res.error}`);
    }

    setAllProducts((prev) => [...prev, newProduct]);
    return newProduct;
  };

  const updateProduct = async (id: string, patch: Partial<Product>): Promise<void> => {
    const current = allProducts.find((p) => p.id === id);
    if (!current) return;

    const updated = { ...current, ...patch };
    const res = await dbSaveProduct(updated);
    if (!res.success) {
      throw new Error(`Erro ao atualizar produto no Supabase: ${res.error}`);
    }

    setAllProducts((prev) =>
      prev.map((p) => (p.id === id ? updated : p))
    );
  };

  const deleteProduct = async (id: string): Promise<void> => {
    const res = await dbDeleteProduct(id);
    if (!res.success) {
      throw new Error(`Erro ao excluir produto no Supabase: ${res.error}`);
    }
    setAllProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const adjustProductStock = async (
    productId: string,
    deltaQty: number,
    type: StockMovementType,
    reason: string
  ): Promise<void> => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const newStock = Math.max(0, prod.stock + deltaQty);
    const updatedProd = { ...prod, stock: newStock };

    const movement: StockMovement = {
      id: 'mov-' + Date.now(),
      companyId: activeCompanyId,
      productId,
      productName: prod.name,
      type,
      quantity: Math.abs(deltaQty),
      unit: prod.unit,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      reason,
    };

    // Save both product stock and movement to Supabase
    await dbSaveProduct(updatedProd);
    await dbSaveStockMovement(movement);

    setAllProducts((prev) => prev.map((p) => (p.id === productId ? updatedProd : p)));
    setAllStockMovements((prev) => [movement, ...prev]);
  };

  const adjustStock = adjustProductStock;

  // Basket Template Actions
  const addBasketTemplate = async (
    data: Omit<BasketTemplate, 'id' | 'createdAt'>
  ): Promise<BasketTemplate> => {
    const newTemplate: BasketTemplate = {
      ...data,
      id: 'tpl-' + Date.now(),
      companyId: activeCompanyId,
      createdAt: new Date().toISOString(),
    };

    const res = await dbSaveBasketTemplate(newTemplate);
    if (!res.success) {
      throw new Error(`Erro ao salvar modelo de cesta no Supabase: ${res.error}`);
    }

    setAllBasketTemplates((prev) => [...prev, newTemplate]);
    return newTemplate;
  };

  const updateBasketTemplate = async (id: string, patch: Partial<BasketTemplate>): Promise<void> => {
    const current = allBasketTemplates.find((t) => t.id === id);
    if (!current) return;

    const updated = { ...current, ...patch };
    const res = await dbSaveBasketTemplate(updated);
    if (!res.success) {
      throw new Error(`Erro ao atualizar modelo de cesta no Supabase: ${res.error}`);
    }

    setAllBasketTemplates((prev) =>
      prev.map((t) => (t.id === id ? updated : t))
    );
  };

  const deleteBasketTemplate = async (id: string): Promise<void> => {
    const res = await dbDeleteBasketTemplate(id);
    if (!res.success) {
      throw new Error(`Erro ao excluir modelo de cesta no Supabase: ${res.error}`);
    }
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

  // Sale Actions (Direct to Supabase)
  const createSale = async (params: {
    customerId: string;
    basketTemplateId?: string;
    basketName: string;
    items: SaleItem[];
    totalCost: number;
    totalSaleValue: number;
    paymentPlan: PaymentPlanType;
    installments: { dueDate: string; amount: number }[];
    notes?: string;
  }): Promise<Sale> => {
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

    // Stock movements for all items
    const movements: StockMovement[] = params.items.map((item, idx) => ({
      id: 'mov-' + Date.now() + '-' + idx,
      companyId: activeCompanyId,
      productId: item.productId,
      productName: item.productName,
      type: 'sale',
      quantity: item.quantity,
      unit: item.unit,
      date: getTodayDateString(),
      createdAt: new Date().toISOString(),
      reason: `Saída p/ montagem de cesta da Venda ${saleNumber}`,
      referenceId: saleId,
    }));

    // Persist Sale, Installments, and Movements directly to Supabase
    const res = await dbSaveSaleWithInstallments(newSale, newInstallments, movements);
    if (!res.success) {
      throw new Error(`Erro ao registrar venda no Supabase: ${res.error}`);
    }

    // Decrement stock in memory & db
    for (const item of params.items) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        const newStock = Math.max(0, prod.stock - item.quantity);
        const updated = { ...prod, stock: newStock };
        await dbSaveProduct(updated);
        setAllProducts((prev) => prev.map((p) => (p.id === prod.id ? updated : p)));
      }
    }

    setAllSales((prev) => [newSale, ...prev]);
    setAllInstallments((prev) => [...newInstallments, ...prev]);
    setAllStockMovements((prev) => [...movements, ...prev]);

    return newSale;
  };

  const cancelSale = async (saleId: string): Promise<void> => {
    const sale = allSales.find((s) => s.id === saleId);
    if (!sale) return;

    const res = await dbUpdateSaleStatus(saleId, 'cancelled');
    if (!res.success) {
      throw new Error(`Erro ao cancelar venda no Supabase: ${res.error}`);
    }

    // Refund stock
    for (const item of sale.items) {
      await adjustProductStock(
        item.productId,
        item.quantity,
        'in_return',
        `Cancelamento da venda ${sale.saleNumber} (Estorno p/ estoque)`
      );
    }

    setAllSales((prev) =>
      prev.map((s) => (s.id === saleId ? { ...s, status: 'cancelled' } : s))
    );
    setAllInstallments((prev) =>
      prev.map((i) => (i.saleId === saleId ? { ...i, status: 'cancelled' } : i))
    );
  };

  const deleteSale = async (saleId: string): Promise<void> => {
    const res = await dbDeleteSale(saleId);
    if (!res.success) {
      throw new Error(`Erro ao excluir venda no Supabase: ${res.error}`);
    }
    setAllSales((prev) => prev.filter((s) => s.id !== saleId));
    setAllInstallments((prev) => prev.filter((i) => i.saleId !== saleId));
  };

  // Installment Actions (Direct to Supabase)
  const recordPayment = async (
    installmentId: string,
    paidAmount: number,
    paymentMethod: Installment['paymentMethod'],
    notes?: string,
    paymentDate?: string
  ): Promise<void> => {
    const inst = allInstallments.find((i) => i.id === installmentId);
    if (!inst) return;

    const updated: Installment = {
      ...inst,
      status: 'paid',
      paidAmount: paidAmount > 0 ? paidAmount : inst.amount,
      paymentDate: paymentDate || getTodayDateString(),
      paymentMethod: paymentMethod || 'pix',
      notes: notes ? `${inst.notes || ''} | ${notes}`.trim() : inst.notes,
    };

    const res = await dbSaveInstallment(updated);
    if (!res.success) {
      throw new Error(`Erro ao registrar pagamento no Supabase: ${res.error}`);
    }

    setAllInstallments((prev) =>
      prev.map((i) => (i.id === installmentId ? updated : i))
    );
  };

  const updateInstallment = async (id: string, patch: Partial<Installment>): Promise<void> => {
    const inst = allInstallments.find((i) => i.id === id);
    if (!inst) return;

    const updated = { ...inst, ...patch };
    const res = await dbSaveInstallment(updated);
    if (!res.success) {
      throw new Error(`Erro ao atualizar parcela no Supabase: ${res.error}`);
    }

    setAllInstallments((prev) =>
      prev.map((i) => (i.id === id ? updated : i))
    );
  };

  // Purchase Actions (Direct to Supabase)
  const createPurchase = async (
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
  ): Promise<Purchase> => {
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

    const movements: StockMovement[] = [];

    // Increment inventory and recalculate unit costs
    for (const item of purchaseData.items) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        const oldTotalValue = prod.stock * prod.unitCost;
        const newIncomingValue = item.totalCost || item.quantity * item.unitCost;
        const newTotalQty = prod.stock + item.quantity;
        const newWeightedUnitCost =
          newTotalQty > 0 ? (oldTotalValue + newIncomingValue) / newTotalQty : item.unitCost;

        const updatedProd: Product = {
          ...prod,
          stock: newTotalQty,
          unitCost: Math.round(newWeightedUnitCost * 100) / 100,
          packageType: item.packageType || prod.packageType,
          unitsPerPackage: item.unitsPerPackage || prod.unitsPerPackage,
          packageCost: item.packageCost || prod.packageCost,
        };

        await dbSaveProduct(updatedProd);
        setAllProducts((prev) => prev.map((p) => (p.id === prod.id ? updatedProd : p)));

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
          reason: `Entrada da Compra ${purchaseNumber}`,
          referenceId: purchaseId,
        };
        movements.push(movement);
      }
    }

    const res = await dbSavePurchaseWithStock(newPurchase, movements);
    if (!res.success) {
      throw new Error(`Erro ao salvar compra no Supabase: ${res.error}`);
    }

    setAllPurchases((prev) => [newPurchase, ...prev]);
    setAllStockMovements((prev) => [...movements, ...prev]);
    return newPurchase;
  };

  const deletePurchase = async (id: string): Promise<void> => {
    const res = await dbDeletePurchase(id);
    if (!res.success) {
      throw new Error(`Erro ao excluir compra no Supabase: ${res.error}`);
    }
    setAllPurchases((prev) => prev.filter((p) => p.id !== id));
  };

  // Settings Actions
  const updateSettings = async (newSettings: Partial<BusinessSettings>): Promise<void> => {
    await updateCompany(activeCompanyId, {
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
        summaryMetrics,
        isSyncingData,
        lastSyncAt,
        syncErrors,
        triggerFullSync,
        reloadAllData,
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
