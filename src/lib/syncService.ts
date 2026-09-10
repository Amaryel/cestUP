import { getSupabaseClient } from './supabase';
import { logger } from './logger';
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

// ============================================================================
// CONVERTERS & MAPPERS: Frontend Model <-> Supabase DB Model
// ============================================================================

export function mapCompanyToDb(c: Company) {
  return {
    id: c.id,
    name: c.name,
    document: c.document || '',
    phone: c.phone || '',
    address: c.address || '',
    pix_key: c.pixKey || '',
    pix_key_type: c.pixKeyType || 'CNPJ',
    default_basket_price: Number(c.defaultBasketPrice) || 340,
    alert_days_notice: Number(c.alertDaysNotice) || 7,
    whatsapp_message_overdue: c.whatsappMessageOverdue || '',
    whatsapp_message_due_today: c.whatsappMessageDueToday || '',
    whatsapp_message_upcoming: c.whatsappMessageUpcoming || '',
    status: c.status || 'active',
    created_at: c.createdAt || new Date().toISOString(),
  };
}

export function mapDbToCompany(c: any): Company {
  return {
    id: c.id,
    name: c.name || 'Empresa',
    document: c.document || '',
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
    createdAt: c.created_at || new Date().toISOString(),
  };
}

export function mapCustomerToDb(c: Customer) {
  return {
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
  };
}

export function mapDbToCustomer(c: any): Customer {
  return {
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
    createdAt: c.created_at || new Date().toISOString(),
  };
}

export function mapProductToDb(p: Product) {
  return {
    id: p.id,
    company_id: p.companyId || null,
    name: p.name,
    category: p.category || 'Geral',
    unit: p.unit || 'un',
    package_type: p.packageType || 'fardo',
    units_per_package: Number(p.unitsPerPackage) || 1,
    package_cost: Number(p.packageCost) || 0,
    stock: Number(p.stock) ?? 0,
    min_stock: Number(p.minStock) ?? 10,
    unit_cost: Number(p.unitCost) ?? 0,
    reference_price: Number(p.referencePrice ?? p.refPrice ?? 0),
    status: p.status || 'active',
    created_at: p.createdAt || new Date().toISOString(),
  };
}

export function mapDbToProduct(p: any): Product {
  return {
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
    createdAt: p.created_at || new Date().toISOString(),
  };
}

export function mapBasketTemplateToDb(t: BasketTemplate) {
  return {
    id: t.id,
    company_id: t.companyId || null,
    name: t.name,
    description: t.description || '',
    default_sale_price: Number(t.defaultSalePrice) || 340,
    is_default: !!t.isDefault,
    items: t.items || [],
    created_at: t.createdAt || new Date().toISOString(),
  };
}

export function mapDbToBasketTemplate(t: any): BasketTemplate {
  return {
    id: t.id,
    companyId: t.company_id || 'comp-1',
    name: t.name,
    description: t.description || '',
    defaultSalePrice: Number(t.default_sale_price) || 340,
    isDefault: !!t.is_default,
    items: Array.isArray(t.items) ? t.items : [],
    createdAt: t.created_at || new Date().toISOString(),
  };
}

export function mapSaleToDb(s: Sale) {
  return {
    id: s.id,
    company_id: s.companyId || null,
    sale_number: s.saleNumber || '',
    customer_id: s.customerId,
    customer_name: s.customerName,
    basket_name: s.basketName,
    items: s.items || [],
    total_cost: Number(s.totalCost) || 0,
    total_sale_value: Number(s.totalSaleValue) || 0,
    profit: Number(s.profit) || 0,
    profit_margin_pct: Number(s.profitMarginPct) || 0,
    payment_plan: s.paymentPlan || 'cash',
    installments_count: Number(s.installmentsCount) || 1,
    delivery_date: s.deliveryDate || null,
    notes: s.notes || '',
    status: s.status || 'completed',
    created_at: s.createdAt || new Date().toISOString(),
  };
}

export function mapDbToSale(s: any): Sale {
  return {
    id: s.id,
    companyId: s.company_id || 'comp-1',
    saleNumber: s.sale_number,
    customerId: s.customer_id,
    customerName: s.customer_name,
    basketName: s.basket_name,
    items: Array.isArray(s.items) ? s.items : [],
    totalCost: Number(s.total_cost) || 0,
    totalSaleValue: Number(s.total_sale_value) || 0,
    profit: Number(s.profit) || 0,
    profitMarginPct: Number(s.profit_margin_pct) || 0,
    paymentPlan: s.payment_plan,
    installmentsCount: Number(s.installments_count) || 1,
    deliveryDate: s.delivery_date || undefined,
    notes: s.notes || '',
    status: s.status || 'completed',
    createdAt: s.created_at || new Date().toISOString(),
  };
}

export function mapInstallmentToDb(inst: Installment) {
  return {
    id: inst.id,
    company_id: inst.companyId || null,
    sale_id: inst.saleId,
    customer_id: inst.customerId,
    customer_name: inst.customerName,
    customer_phone: inst.customerPhone || '',
    customer_whatsapp: inst.customerWhatsapp || '',
    installment_number: Number(inst.installmentNumber) || 1,
    total_installments: Number(inst.totalInstallments) || 1,
    amount: Number(inst.amount) || 0,
    due_date: inst.dueDate,
    status: inst.status || 'pending',
    paid_amount: inst.paidAmount != null ? Number(inst.paidAmount) : null,
    payment_date: inst.paymentDate || null,
    payment_method: inst.paymentMethod || null,
    notes: inst.notes || '',
    created_at: new Date().toISOString(),
  };
}

export function mapDbToInstallment(i: any): Installment {
  return {
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
    paidAmount: i.paid_amount != null ? Number(i.paid_amount) : undefined,
    paymentDate: i.payment_date || undefined,
    paymentMethod: i.payment_method || undefined,
    notes: i.notes || '',
  };
}

export function mapPurchaseToDb(pu: Purchase) {
  return {
    id: pu.id,
    company_id: pu.companyId || null,
    purchase_number: pu.purchaseNumber || '',
    supplier: pu.supplier || (pu as any).supplierName || '',
    purchase_date: pu.purchaseDate || pu.date || new Date().toISOString().split('T')[0],
    items: pu.items || [],
    total_cost: Number(pu.totalCost) || Number((pu as any).totalAmount) || 0,
    payment_method: pu.paymentMethod || '',
    notes: pu.notes || '',
    created_at: pu.createdAt || new Date().toISOString(),
  };
}

export function mapDbToPurchase(pu: any): Purchase {
  return {
    id: pu.id,
    companyId: pu.company_id || 'comp-1',
    purchaseNumber: pu.purchase_number || '',
    supplier: pu.supplier || '',
    supplierName: pu.supplier || '',
    date: pu.purchase_date || new Date().toISOString().split('T')[0],
    purchaseDate: pu.purchase_date || new Date().toISOString().split('T')[0],
    items: Array.isArray(pu.items) ? pu.items : [],
    totalCost: Number(pu.total_cost) || 0,
    totalAmount: Number(pu.total_cost) || 0,
    paymentMethod: pu.payment_method || 'boleto',
    notes: pu.notes || '',
    createdAt: pu.created_at || new Date().toISOString(),
  };
}

export function mapStockMovementToDb(m: StockMovement) {
  return {
    id: m.id,
    company_id: m.companyId || null,
    product_id: m.productId,
    product_name: m.productName,
    type: m.type,
    quantity: Number(m.quantity) || 0,
    unit: m.unit || 'un',
    date: m.date || new Date().toISOString().split('T')[0],
    reason: m.reason || '',
    reference_id: m.referenceId || null,
    created_at: m.createdAt || new Date().toISOString(),
  };
}

export function mapDbToStockMovement(m: any): StockMovement {
  return {
    id: m.id,
    companyId: m.company_id || 'comp-1',
    productId: m.product_id,
    productName: m.product_name,
    type: m.type,
    quantity: Number(m.quantity) || 0,
    unit: m.unit || 'un',
    date: m.date || new Date().toISOString().split('T')[0],
    reason: m.reason || '',
    referenceId: m.reference_id || undefined,
    createdAt: m.created_at || new Date().toISOString(),
  };
}

// ============================================================================
// DIRECT CRUD OPERATIONS WITH SUPABASE AS SINGLE SOURCE OF TRUTH
// ============================================================================

export async function dbSaveCompany(company: Company): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase não inicializado.' };

  try {
    const row = mapCompanyToDb(company);
    const { error } = await supabase.from('companies').upsert(row, { onConflict: 'id' });
    if (error) {
      logger.log({
        operation: 'UPDATE',
        table: 'companies',
        recordId: company.id,
        companyId: company.id,
        success: false,
        errorMessage: error.message,
      });
      return { success: false, error: error.message };
    }
    logger.log({
      operation: 'UPDATE',
      table: 'companies',
      recordId: company.id,
      companyId: company.id,
      success: true,
      details: `Empresa salva: ${company.name}`,
    });
    return { success: true };
  } catch (err: any) {
    logger.log({
      operation: 'UPDATE',
      table: 'companies',
      recordId: company.id,
      success: false,
      errorMessage: err?.message,
    });
    return { success: false, error: err?.message };
  }
}

export async function dbDeleteCompany(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase não inicializado.' };

  try {
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (error) {
      logger.log({
        operation: 'DELETE',
        table: 'companies',
        recordId: id,
        success: false,
        errorMessage: error.message,
      });
      return { success: false, error: error.message };
    }
    logger.log({
      operation: 'DELETE',
      table: 'companies',
      recordId: id,
      success: true,
      details: `Empresa excluída: ${id}`,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function dbSaveCustomer(customer: Customer): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase não inicializado.' };

  try {
    const row = mapCustomerToDb(customer);
    const { error } = await supabase.from('customers').upsert(row, { onConflict: 'id' });
    if (error) {
      logger.log({
        operation: 'UPDATE',
        table: 'customers',
        recordId: customer.id,
        companyId: customer.companyId,
        success: false,
        errorMessage: error.message,
      });
      return { success: false, error: error.message };
    }
    logger.log({
      operation: 'UPDATE',
      table: 'customers',
      recordId: customer.id,
      companyId: customer.companyId,
      success: true,
      details: `Cliente salvo: ${customer.name}`,
    });
    return { success: true };
  } catch (err: any) {
    logger.log({
      operation: 'UPDATE',
      table: 'customers',
      recordId: customer.id,
      success: false,
      errorMessage: err?.message,
    });
    return { success: false, error: err?.message };
  }
}

export async function dbDeleteCustomer(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase não inicializado.' };

  try {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) {
      logger.log({
        operation: 'DELETE',
        table: 'customers',
        recordId: id,
        success: false,
        errorMessage: error.message,
      });
      return { success: false, error: error.message };
    }
    logger.log({
      operation: 'DELETE',
      table: 'customers',
      recordId: id,
      success: true,
      details: `Cliente excluído: ${id}`,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function dbSaveProduct(product: Product): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase não inicializado.' };

  try {
    const row = mapProductToDb(product);
    const { error } = await supabase.from('products').upsert(row, { onConflict: 'id' });
    if (error) {
      logger.log({
        operation: 'UPDATE',
        table: 'products',
        recordId: product.id,
        companyId: product.companyId,
        success: false,
        errorMessage: error.message,
      });
      return { success: false, error: error.message };
    }
    logger.log({
      operation: 'UPDATE',
      table: 'products',
      recordId: product.id,
      companyId: product.companyId,
      success: true,
      details: `Produto salvo: ${product.name}`,
    });
    return { success: true };
  } catch (err: any) {
    logger.log({
      operation: 'UPDATE',
      table: 'products',
      recordId: product.id,
      success: false,
      errorMessage: err?.message,
    });
    return { success: false, error: err?.message };
  }
}

export async function dbDeleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase não inicializado.' };

  try {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      logger.log({
        operation: 'DELETE',
        table: 'products',
        recordId: id,
        success: false,
        errorMessage: error.message,
      });
      return { success: false, error: error.message };
    }
    logger.log({
      operation: 'DELETE',
      table: 'products',
      recordId: id,
      success: true,
      details: `Produto excluído: ${id}`,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function dbSaveBasketTemplate(template: BasketTemplate): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase não inicializado.' };

  try {
    const row = mapBasketTemplateToDb(template);
    const { error } = await supabase.from('basket_templates').upsert(row, { onConflict: 'id' });
    if (error) {
      logger.log({
        operation: 'UPDATE',
        table: 'basket_templates',
        recordId: template.id,
        companyId: template.companyId,
        success: false,
        errorMessage: error.message,
      });
      return { success: false, error: error.message };
    }
    logger.log({
      operation: 'UPDATE',
      table: 'basket_templates',
      recordId: template.id,
      companyId: template.companyId,
      success: true,
      details: `Modelo de cesta salvo: ${template.name}`,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function dbDeleteBasketTemplate(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase não inicializado.' };

  try {
    const { error } = await supabase.from('basket_templates').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    logger.log({
      operation: 'DELETE',
      table: 'basket_templates',
      recordId: id,
      success: true,
      details: `Modelo de cesta excluído: ${id}`,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function dbSaveSaleWithInstallments(
  sale: Sale,
  installments: Installment[],
  stockMovements: StockMovement[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase não inicializado.' };

  try {
    // 1. Save Sale
    const saleRow = mapSaleToDb(sale);
    const { error: saleErr } = await supabase.from('sales').upsert(saleRow, { onConflict: 'id' });
    if (saleErr) {
      logger.log({
        operation: 'INSERT',
        table: 'sales',
        recordId: sale.id,
        companyId: sale.companyId,
        success: false,
        errorMessage: saleErr.message,
      });
      return { success: false, error: saleErr.message };
    }

    // 2. Save Installments
    if (installments.length > 0) {
      const instRows = installments.map(mapInstallmentToDb);
      const { error: instErr } = await supabase.from('sale_installments').upsert(instRows, { onConflict: 'id' });
      if (instErr) {
        logger.log({
          operation: 'INSERT',
          table: 'sale_installments',
          companyId: sale.companyId,
          success: false,
          errorMessage: instErr.message,
        });
        return { success: false, error: instErr.message };
      }
    }

    // 3. Save Stock Movements
    if (stockMovements.length > 0) {
      const movRows = stockMovements.map(mapStockMovementToDb);
      const { error: movErr } = await supabase.from('stock_movements').upsert(movRows, { onConflict: 'id' });
      if (movErr) {
        logger.log({
          operation: 'INSERT',
          table: 'stock_movements',
          companyId: sale.companyId,
          success: false,
          errorMessage: movErr.message,
        });
      }
    }

    logger.log({
      operation: 'INSERT',
      table: 'sales',
      recordId: sale.id,
      companyId: sale.companyId,
      success: true,
      details: `Venda ${sale.saleNumber} persistida com sucesso no Supabase!`,
    });
    return { success: true };
  } catch (err: any) {
    logger.log({
      operation: 'INSERT',
      table: 'sales',
      recordId: sale.id,
      success: false,
      errorMessage: err?.message,
    });
    return { success: false, error: err?.message };
  }
}

export async function dbUpdateSaleStatus(saleId: string, status: Sale['status']): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase não inicializado.' };

  try {
    const { error } = await supabase.from('sales').update({ status }).eq('id', saleId);
    if (error) return { success: false, error: error.message };

    if (status === 'cancelled') {
      await supabase.from('sale_installments').update({ status: 'cancelled' }).eq('sale_id', saleId);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function dbDeleteSale(saleId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase não inicializado.' };

  try {
    await supabase.from('sale_installments').delete().eq('sale_id', saleId);
    const { error } = await supabase.from('sales').delete().eq('id', saleId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function dbSaveInstallment(installment: Installment): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase não inicializado.' };

  try {
    const row = mapInstallmentToDb(installment);
    const { error } = await supabase.from('sale_installments').upsert(row, { onConflict: 'id' });
    if (error) {
      logger.log({
        operation: 'UPDATE',
        table: 'sale_installments',
        recordId: installment.id,
        companyId: installment.companyId,
        success: false,
        errorMessage: error.message,
      });
      return { success: false, error: error.message };
    }
    logger.log({
      operation: 'UPDATE',
      table: 'sale_installments',
      recordId: installment.id,
      companyId: installment.companyId,
      success: true,
      details: `Parcela atualizada (Status: ${installment.status})`,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function dbSavePurchaseWithStock(
  purchase: Purchase,
  stockMovements: StockMovement[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase não inicializado.' };

  try {
    const purRow = mapPurchaseToDb(purchase);
    const { error: purErr } = await supabase.from('purchases').upsert(purRow, { onConflict: 'id' });
    if (purErr) {
      logger.log({
        operation: 'INSERT',
        table: 'purchases',
        recordId: purchase.id,
        companyId: purchase.companyId,
        success: false,
        errorMessage: purErr.message,
      });
      return { success: false, error: purErr.message };
    }

    if (stockMovements.length > 0) {
      const movRows = stockMovements.map(mapStockMovementToDb);
      await supabase.from('stock_movements').upsert(movRows, { onConflict: 'id' });
    }

    logger.log({
      operation: 'INSERT',
      table: 'purchases',
      recordId: purchase.id,
      companyId: purchase.companyId,
      success: true,
      details: `Compra ${purchase.purchaseNumber} salva no Supabase.`,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function dbDeletePurchase(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase não inicializado.' };

  try {
    const { error } = await supabase.from('purchases').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function dbSaveStockMovement(movement: StockMovement): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase não inicializado.' };

  try {
    const row = mapStockMovementToDb(movement);
    const { error } = await supabase.from('stock_movements').upsert(row, { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Direct full sync of entire state items into Supabase tables
 */
export async function syncDataToSupabase(payload: AppSyncPayload): Promise<{ success: boolean; errors: string[] }> {
  const supabase = getSupabaseClient();
  const errors: string[] = [];
  if (!supabase) return { success: false, errors: ['Supabase não configurado'] };

  // 1. Companies
  if (payload.companies && payload.companies.length > 0) {
    try {
      const rows = payload.companies.map(mapCompanyToDb);
      const { error } = await supabase.from('companies').upsert(rows, { onConflict: 'id' });
      if (error) errors.push(`Empresas: ${error.message}`);
    } catch (err: any) {
      errors.push(`Empresas: ${err?.message}`);
    }
  }

  // 2. Customers
  if (payload.customers && payload.customers.length > 0) {
    try {
      const rows = payload.customers.map(mapCustomerToDb);
      const { error } = await supabase.from('customers').upsert(rows, { onConflict: 'id' });
      if (error) errors.push(`Clientes: ${error.message}`);
    } catch (err: any) {
      errors.push(`Clientes: ${err?.message}`);
    }
  }

  // 3. Products
  if (payload.products && payload.products.length > 0) {
    try {
      const rows = payload.products.map(mapProductToDb);
      const { error } = await supabase.from('products').upsert(rows, { onConflict: 'id' });
      if (error) errors.push(`Produtos: ${error.message}`);
    } catch (err: any) {
      errors.push(`Produtos: ${err?.message}`);
    }
  }

  // 4. Basket Templates
  if (payload.basketTemplates && payload.basketTemplates.length > 0) {
    try {
      const rows = payload.basketTemplates.map(mapBasketTemplateToDb);
      const { error } = await supabase.from('basket_templates').upsert(rows, { onConflict: 'id' });
      if (error) errors.push(`Modelos de Cestas: ${error.message}`);
    } catch (err: any) {
      errors.push(`Modelos: ${err?.message}`);
    }
  }

  // 5. Sales
  if (payload.sales && payload.sales.length > 0) {
    try {
      const rows = payload.sales.map(mapSaleToDb);
      const { error } = await supabase.from('sales').upsert(rows, { onConflict: 'id' });
      if (error) errors.push(`Vendas: ${error.message}`);
    } catch (err: any) {
      errors.push(`Vendas: ${err?.message}`);
    }
  }

  // 6. Installments
  if (payload.installments && payload.installments.length > 0) {
    try {
      const rows = payload.installments.map(mapInstallmentToDb);
      const { error } = await supabase.from('sale_installments').upsert(rows, { onConflict: 'id' });
      if (error) errors.push(`Parcelas: ${error.message}`);
    } catch (err: any) {
      errors.push(`Parcelas: ${err?.message}`);
    }
  }

  // 7. Purchases
  if (payload.purchases && payload.purchases.length > 0) {
    try {
      const rows = payload.purchases.map(mapPurchaseToDb);
      const { error } = await supabase.from('purchases').upsert(rows, { onConflict: 'id' });
      if (error) errors.push(`Compras: ${error.message}`);
    } catch (err: any) {
      errors.push(`Compras: ${err?.message}`);
    }
  }

  // 8. Stock Movements
  if (payload.stockMovements && payload.stockMovements.length > 0) {
    try {
      const rows = payload.stockMovements.map(mapStockMovementToDb);
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
      supabase.from('companies').select('*').order('name'),
      supabase.from('customers').select('*').order('name'),
      supabase.from('products').select('*').order('name'),
      supabase.from('basket_templates').select('*').order('name'),
      supabase.from('sales').select('*').order('created_at', { ascending: false }),
      supabase.from('sale_installments').select('*').order('due_date', { ascending: true }),
      supabase.from('purchases').select('*').order('created_at', { ascending: false }),
      supabase.from('stock_movements').select('*').order('created_at', { ascending: false }),
    ]);

    const result: AppSyncPayload = {
      companies: compRes.data ? compRes.data.map(mapDbToCompany) : [],
      customers: custRes.data ? custRes.data.map(mapDbToCustomer) : [],
      products: prodRes.data ? prodRes.data.map(mapDbToProduct) : [],
      basketTemplates: tplRes.data ? tplRes.data.map(mapDbToBasketTemplate) : [],
      sales: saleRes.data ? saleRes.data.map(mapDbToSale) : [],
      installments: instRes.data ? instRes.data.map(mapDbToInstallment) : [],
      purchases: purRes.data ? purRes.data.map(mapDbToPurchase) : [],
      stockMovements: movRes.data ? movRes.data.map(mapDbToStockMovement) : [],
    };

    return result;
  } catch (err: any) {
    logger.log({
      operation: 'SELECT',
      table: 'all_tables',
      success: false,
      errorMessage: err?.message,
    });
    return null;
  }
}
