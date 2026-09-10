import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { safeFetchJson } from './safeFetch';
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
} from '../types';

export interface AppSyncPayload {
  companies?: Company[];
  activeCompanyId?: string;
  customers?: Customer[];
  products?: Product[];
  basketTemplates?: BasketTemplate[];
  sales?: Sale[];
  installments?: Installment[];
  purchases?: Purchase[];
  stockMovements?: StockMovement[];
  settings?: BusinessSettings;
}

/**
 * Pushes application state to the server backend (/api/data)
 * and asynchronously syncs with Supabase if online.
 */
export async function pushAppDataToServer(payload: AppSyncPayload): Promise<{ success: boolean; error?: string }> {
  await safeFetchJson('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // Also sync directly with Supabase
  if (isSupabaseConfigured()) {
    try {
      await syncDataToSupabase(payload);
    } catch (e: any) {
      console.warn('[SyncService] Supabase direct sync error:', e?.message);
    }
  }

  return { success: true };
}

/**
 * Fetches application state from the server backend (/api/data)
 */
export async function fetchAppDataFromServer(): Promise<AppSyncPayload | null> {
  const res = await safeFetchJson<{ success: boolean; data?: AppSyncPayload }>('/api/data');
  if (res.ok && res.data?.success && res.data.data) {
    return res.data.data;
  }
  return null;
}

/**
 * Direct sync of state items into Supabase tables
 */
export async function syncDataToSupabase(payload: AppSyncPayload): Promise<{ success: boolean; errors: string[] }> {
  const supabase = getSupabaseClient();
  const errors: string[] = [];
  if (!supabase) return { success: false, errors: ['Supabase não configurado'] };

  // 1. Companies
  if (payload.companies && payload.companies.length > 0) {
    try {
      const rows = payload.companies.map((c) => ({
        id: c.id,
        name: c.name,
        document: c.document || '',
        phone: c.phone || '',
        address: c.address || '',
        pix_key: c.pixKey || '',
        pix_key_type: c.pixKeyType || 'CNPJ',
        default_basket_price: c.defaultBasketPrice || 340,
        alert_days_notice: c.alertDaysNotice || 7,
        whatsapp_message_overdue: c.whatsappMessageOverdue || '',
        whatsapp_message_due_today: c.whatsappMessageDueToday || '',
        whatsapp_message_upcoming: c.whatsappMessageUpcoming || '',
        status: c.status || 'active',
        created_at: c.createdAt || new Date().toISOString(),
      }));
      const { error } = await supabase.from('companies').upsert(rows, { onConflict: 'id' });
      if (error) errors.push(`Empresas: ${error.message}`);
    } catch (err: any) {
      errors.push(`Empresas: ${err?.message}`);
    }
  }

  // 2. Customers
  if (payload.customers && payload.customers.length > 0) {
    try {
      const rows = payload.customers.map((c) => ({
        id: c.id,
        company_id: c.companyId || null,
        name: c.name,
        document: c.document || '',
        phone: c.phone || '',
        whatsapp: c.whatsapp || '',
        address: c.address || '',
        neighborhood: c.neighborhood || '',
        city: c.city || '',
        notes: c.notes || '',
        status: c.status || 'active',
        created_at: c.createdAt || new Date().toISOString(),
      }));
      const { error } = await supabase.from('customers').upsert(rows, { onConflict: 'id' });
      if (error) errors.push(`Clientes: ${error.message}`);
    } catch (err: any) {
      errors.push(`Clientes: ${err?.message}`);
    }
  }

  // 3. Products
  if (payload.products && payload.products.length > 0) {
    try {
      const rows = payload.products.map((p) => ({
        id: p.id,
        company_id: p.companyId || null,
        name: p.name,
        category: p.category || 'Geral',
        unit: p.unit || 'un',
        package_type: p.packageType || 'fardo',
        units_per_package: p.unitsPerPackage || 1,
        package_cost: p.packageCost || 0,
        stock: p.stock ?? 0,
        min_stock: p.minStock ?? 10,
        unit_cost: p.unitCost ?? 0,
        reference_price: p.referencePrice ?? p.refPrice ?? 0,
        status: p.status || 'active',
        created_at: p.createdAt || new Date().toISOString(),
      }));
      const { error } = await supabase.from('products').upsert(rows, { onConflict: 'id' });
      if (error) errors.push(`Produtos: ${error.message}`);
    } catch (err: any) {
      errors.push(`Produtos: ${err?.message}`);
    }
  }

  // 4. Basket Templates
  if (payload.basketTemplates && payload.basketTemplates.length > 0) {
    try {
      const rows = payload.basketTemplates.map((t) => ({
        id: t.id,
        company_id: t.companyId || null,
        name: t.name,
        description: t.description || '',
        default_sale_price: t.defaultSalePrice || 340,
        is_default: !!t.isDefault,
        items: t.items || [],
        created_at: t.createdAt || new Date().toISOString(),
      }));
      const { error } = await supabase.from('basket_templates').upsert(rows, { onConflict: 'id' });
      if (error) errors.push(`Modelos de Cestas: ${error.message}`);
    } catch (err: any) {
      errors.push(`Modelos: ${err?.message}`);
    }
  }

  // 5. Sales
  if (payload.sales && payload.sales.length > 0) {
    try {
      const rows = payload.sales.map((s) => ({
        id: s.id,
        company_id: s.companyId || null,
        sale_number: s.saleNumber || '',
        customer_id: s.customerId,
        customer_name: s.customerName,
        basket_name: s.basketName,
        items: s.items || [],
        total_cost: s.totalCost || 0,
        total_sale_value: s.totalSaleValue || 0,
        profit: s.profit || 0,
        profit_margin_pct: s.profitMarginPct || 0,
        payment_plan: s.paymentPlan || 'cash',
        installments_count: s.installmentsCount || 1,
        delivery_date: s.deliveryDate || null,
        notes: s.notes || '',
        status: s.status || 'completed',
        created_at: s.createdAt || new Date().toISOString(),
      }));
      const { error } = await supabase.from('sales').upsert(rows, { onConflict: 'id' });
      if (error) errors.push(`Vendas: ${error.message}`);
    } catch (err: any) {
      errors.push(`Vendas: ${err?.message}`);
    }
  }

  // 6. Installments
  if (payload.installments && payload.installments.length > 0) {
    try {
      const rows = payload.installments.map((inst) => ({
        id: inst.id,
        company_id: inst.companyId || null,
        sale_id: inst.saleId,
        customer_id: inst.customerId,
        customer_name: inst.customerName,
        customer_phone: inst.customerPhone || '',
        customer_whatsapp: inst.customerWhatsapp || '',
        installment_number: inst.installmentNumber || 1,
        total_installments: inst.totalInstallments || 1,
        amount: inst.amount || 0,
        due_date: inst.dueDate,
        status: inst.status || 'pending',
        paid_amount: inst.paidAmount || null,
        payment_date: inst.paymentDate || null,
        payment_method: inst.paymentMethod || null,
        notes: inst.notes || '',
        created_at: (inst as any).createdAt || new Date().toISOString(),
      }));
      const { error } = await supabase.from('sale_installments').upsert(rows, { onConflict: 'id' });
      if (error) errors.push(`Parcelas: ${error.message}`);
    } catch (err: any) {
      errors.push(`Parcelas: ${err?.message}`);
    }
  }

  // 7. Purchases
  if (payload.purchases && payload.purchases.length > 0) {
    try {
      const rows = payload.purchases.map((pur) => ({
        id: pur.id,
        company_id: pur.companyId || null,
        purchase_number: pur.purchaseNumber || '',
        supplier: pur.supplier || '',
        purchase_date: pur.purchaseDate,
        items: pur.items || [],
        total_cost: pur.totalCost || 0,
        payment_method: pur.paymentMethod || '',
        notes: pur.notes || '',
        created_at: pur.createdAt || new Date().toISOString(),
      }));
      const { error } = await supabase.from('purchases').upsert(rows, { onConflict: 'id' });
      if (error) errors.push(`Compras: ${error.message}`);
    } catch (err: any) {
      errors.push(`Compras: ${err?.message}`);
    }
  }

  // 8. Stock Movements
  if (payload.stockMovements && payload.stockMovements.length > 0) {
    try {
      const rows = payload.stockMovements.map((m) => ({
        id: m.id,
        company_id: m.companyId || null,
        product_id: m.productId,
        product_name: m.productName,
        type: m.type,
        quantity: m.quantity || 0,
        unit: m.unit || 'un',
        date: m.date,
        reason: m.reason || '',
        reference_id: m.referenceId || null,
        created_at: m.createdAt || new Date().toISOString(),
      }));
      const { error } = await supabase.from('stock_movements').upsert(rows, { onConflict: 'id' });
      if (error) errors.push(`Estoque: ${error.message}`);
    } catch (err: any) {
      errors.push(`Estoque: ${err?.message}`);
    }
  }

  return { success: errors.length === 0, errors };
}

/**
 * Fetch all records directly from Supabase tables and convert to frontend structures
 */
export async function fetchAllFromSupabase(): Promise<AppSyncPayload | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const [compRes, custRes, prodRes, tplRes, saleRes, instRes, purRes, movRes] = await Promise.all([
      supabase.from('companies').select('*'),
      supabase.from('customers').select('*'),
      supabase.from('products').select('*'),
      supabase.from('basket_templates').select('*'),
      supabase.from('sales').select('*'),
      supabase.from('sale_installments').select('*'),
      supabase.from('purchases').select('*'),
      supabase.from('stock_movements').select('*'),
    ]);

    const result: AppSyncPayload = {};
    let hasData = false;

    if (compRes.data && compRes.data.length > 0) {
      result.companies = compRes.data.map((c: any) => ({
        id: c.id,
        name: c.name,
        document: c.document,
        phone: c.phone || '',
        address: c.address || '',
        pixKey: c.pix_key || '',
        pixKeyType: c.pix_key_type || 'CNPJ',
        defaultBasketPrice: Number(c.default_basket_price) || 340,
        alertDaysNotice: Number(c.alert_days_notice) || 7,
        whatsappMessageOverdue: c.whatsapp_message_overdue || '',
        whatsappMessageDueToday: c.whatsapp_message_due_today || '',
        whatsappMessageUpcoming: c.whatsapp_message_upcoming || '',
        status: c.status || 'active',
        createdAt: c.created_at,
      }));
      hasData = true;
    }

    if (custRes.data && custRes.data.length > 0) {
      result.customers = custRes.data.map((c: any) => ({
        id: c.id,
        companyId: c.company_id || 'comp-1',
        name: c.name,
        document: c.document || '',
        phone: c.phone || '',
        whatsapp: c.whatsapp || '',
        address: c.address || '',
        neighborhood: c.neighborhood || '',
        city: c.city || '',
        notes: c.notes || '',
        status: c.status || 'active',
        createdAt: c.created_at,
      }));
      hasData = true;
    }

    if (prodRes.data && prodRes.data.length > 0) {
      result.products = prodRes.data.map((p: any) => ({
        id: p.id,
        companyId: p.company_id || 'comp-1',
        name: p.name,
        category: p.category || 'Geral',
        unit: p.unit || 'un',
        packageType: p.package_type || 'fardo',
        unitsPerPackage: Number(p.units_per_package) || 1,
        packageCost: Number(p.package_cost) || 0,
        stock: Number(p.stock) || 0,
        minStock: Number(p.min_stock) || 10,
        unitCost: Number(p.unit_cost) || 0,
        refPrice: Number(p.reference_price) || 0,
        referencePrice: Number(p.reference_price) || 0,
        status: p.status || 'active',
        createdAt: p.created_at,
      }));
      hasData = true;
    }

    if (tplRes.data && tplRes.data.length > 0) {
      result.basketTemplates = tplRes.data.map((t: any) => ({
        id: t.id,
        companyId: t.company_id || 'comp-1',
        name: t.name,
        description: t.description || '',
        defaultSalePrice: Number(t.default_sale_price) || 340,
        isDefault: !!t.is_default,
        items: t.items || [],
        createdAt: t.created_at,
      }));
      hasData = true;
    }

    if (saleRes.data && saleRes.data.length > 0) {
      result.sales = saleRes.data.map((s: any) => ({
        id: s.id,
        companyId: s.company_id || 'comp-1',
        saleNumber: s.sale_number,
        customerId: s.customer_id,
        customerName: s.customer_name,
        basketName: s.basket_name,
        items: s.items || [],
        totalCost: Number(s.total_cost) || 0,
        totalSaleValue: Number(s.total_sale_value) || 0,
        profit: Number(s.profit) || 0,
        profitMarginPct: Number(s.profit_margin_pct) || 0,
        paymentPlan: s.payment_plan,
        installmentsCount: Number(s.installments_count) || 1,
        deliveryDate: s.delivery_date || undefined,
        notes: s.notes || '',
        status: s.status || 'completed',
        createdAt: s.created_at,
      }));
      hasData = true;
    }

    if (instRes.data && instRes.data.length > 0) {
      result.installments = instRes.data.map((i: any) => ({
        id: i.id,
        companyId: i.company_id || 'comp-1',
        saleId: i.sale_id,
        customerId: i.customer_id,
        customerName: i.customer_name,
        customerPhone: i.customer_phone || '',
        customerWhatsapp: i.customer_whatsapp || '',
        installmentNumber: Number(i.installment_number) || 1,
        totalInstallments: Number(i.total_installments) || 1,
        amount: Number(i.amount) || 0,
        dueDate: i.due_date,
        status: i.status || 'pending',
        paidAmount: i.paid_amount ? Number(i.paid_amount) : undefined,
        paymentDate: i.payment_date || undefined,
        paymentMethod: i.payment_method || undefined,
        notes: i.notes || '',
        createdAt: i.created_at,
      }));
      hasData = true;
    }

    if (purRes.data && purRes.data.length > 0) {
      result.purchases = purRes.data.map((pu: any) => ({
        id: pu.id,
        companyId: pu.company_id || 'comp-1',
        purchaseNumber: pu.purchase_number || '',
        supplier: pu.supplier || '',
        date: pu.purchase_date || new Date().toISOString().split('T')[0],
        purchaseDate: pu.purchase_date || new Date().toISOString().split('T')[0],
        items: pu.items || [],
        totalCost: Number(pu.total_cost) || 0,
        paymentMethod: pu.payment_method || '',
        notes: pu.notes || '',
        createdAt: pu.created_at || new Date().toISOString(),
      }));
      hasData = true;
    }

    if (movRes.data && movRes.data.length > 0) {
      result.stockMovements = movRes.data.map((m: any) => ({
        id: m.id,
        companyId: m.company_id || 'comp-1',
        productId: m.product_id,
        productName: m.product_name,
        type: m.type,
        quantity: Number(m.quantity) || 0,
        unit: m.unit,
        date: m.date,
        reason: m.reason || '',
        referenceId: m.reference_id || undefined,
        createdAt: m.created_at,
      }));
      hasData = true;
    }

    return hasData ? result : null;
  } catch (err: any) {
    console.warn('[SyncService] Error reading from Supabase:', err?.message);
    return null;
  }
}
