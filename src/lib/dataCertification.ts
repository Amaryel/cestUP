import { getSupabaseClient } from './supabase';
import { logger } from './logger';

export interface IntegrityCheckItem {
  id: string;
  name: string;
  category: 'auth' | 'multi_tenancy' | 'foreign_keys' | 'data_hygiene';
  status: 'passed' | 'warning' | 'failed';
  description: string;
  details?: string;
  count?: number;
}

export interface IntegrityDiagnosticReport {
  timestamp: string;
  isAllPassed: boolean;
  score: number; // 0 to 100
  summary: {
    passed: number;
    warnings: number;
    failed: number;
    total: number;
  };
  checks: IntegrityCheckItem[];
  tablesCount: {
    companies: number;
    profiles: number;
    customers: number;
    products: number;
    basketTemplates: number;
    sales: number;
    saleInstallments: number;
    purchases: number;
    stockMovements: number;
  };
}

export async function runDataIntegrityDiagnostic(): Promise<IntegrityDiagnosticReport> {
  const checks: IntegrityCheckItem[] = [];
  const supabase = getSupabaseClient();

  const counts = {
    companies: 0,
    profiles: 0,
    customers: 0,
    products: 0,
    basketTemplates: 0,
    sales: 0,
    saleInstallments: 0,
    purchases: 0,
    stockMovements: 0,
  };

  if (!supabase) {
    checks.push({
      id: 'supabase_connection',
      name: 'Conexão Supabase Oficial',
      category: 'auth',
      status: 'failed',
      description: 'Cliente Supabase não inicializado ou credenciais ausentes.',
    });

    return {
      timestamp: new Date().toISOString(),
      isAllPassed: false,
      score: 0,
      summary: { passed: 0, warnings: 0, failed: 1, total: 1 },
      checks,
      tablesCount: counts,
    };
  }

  // 1. Check Supabase Auth Session
  try {
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) {
      checks.push({
        id: 'auth_session',
        name: 'Sessão Supabase Auth',
        category: 'auth',
        status: 'failed',
        description: 'Erro ao verificar sessão oficial de autenticação: ' + sessionErr.message,
      });
    } else if (sessionData.session?.user) {
      const user = sessionData.session.user;
      checks.push({
        id: 'auth_session',
        name: 'Sessão Supabase Auth Ativa',
        category: 'auth',
        status: 'passed',
        description: `Usuário autenticado via Supabase Auth (${user.email}).`,
        details: `ID: ${user.id}`,
      });

      // Check corresponding profile
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profErr || !profile) {
        checks.push({
          id: 'user_profile_sync',
          name: 'Perfil de Usuário em public.profiles',
          category: 'auth',
          status: 'warning',
          description: 'Registro em public.profiles não encontrado para o usuário autenticado.',
          details: profErr?.message || 'Perfil ausente na tabela profiles.',
        });
      } else {
        checks.push({
          id: 'user_profile_sync',
          name: 'Perfil de Usuário em public.profiles',
          category: 'auth',
          status: 'passed',
          description: `Perfil sincronizado: ${profile.username} (Papel: ${profile.role}, Status: ${profile.status}).`,
        });
      }
    } else {
      checks.push({
        id: 'auth_session',
        name: 'Sessão de Autenticação',
        category: 'auth',
        status: 'warning',
        description: 'Nenhum usuário logado no momento no Supabase Auth.',
      });
    }
  } catch (err: any) {
    checks.push({
      id: 'auth_session_catch',
      name: 'Verificação de Autenticação',
      category: 'auth',
      status: 'failed',
      description: err?.message || 'Falha ao consultar autenticação.',
    });
  }

  // 2. Fetch all tables from Supabase for cross-validation
  try {
    const [
      compRes,
      profRes,
      custRes,
      prodRes,
      tplRes,
      saleRes,
      instRes,
      purRes,
      movRes,
    ] = await Promise.all([
      supabase.from('companies').select('id, name, document, status'),
      supabase.from('profiles').select('id, email, username, role, status, company_id'),
      supabase.from('customers').select('id, name, company_id, document, phone'),
      supabase.from('products').select('id, name, company_id, stock, unit_cost'),
      supabase.from('basket_templates').select('id, name, company_id, items'),
      supabase.from('sales').select('id, sale_number, customer_id, company_id, total_sale_value'),
      supabase.from('sale_installments').select('id, sale_id, customer_id, company_id, amount, status'),
      supabase.from('purchases').select('id, purchase_number, company_id, total_cost'),
      supabase.from('stock_movements').select('id, product_id, company_id, quantity, type'),
    ]);

    const companies = compRes.data || [];
    const profiles = profRes.data || [];
    const customers = custRes.data || [];
    const products = prodRes.data || [];
    const templates = tplRes.data || [];
    const sales = saleRes.data || [];
    const installments = instRes.data || [];
    const purchases = purRes.data || [];
    const movements = movRes.data || [];

    counts.companies = companies.length;
    counts.profiles = profiles.length;
    counts.customers = customers.length;
    counts.products = products.length;
    counts.basketTemplates = templates.length;
    counts.sales = sales.length;
    counts.saleInstallments = installments.length;
    counts.purchases = purchases.length;
    counts.stockMovements = movements.length;

    const companyIds = new Set(companies.map((c) => c.id));
    const customerIds = new Set(customers.map((c) => c.id));
    const productIds = new Set(products.map((p) => p.id));
    const saleIds = new Set(sales.map((s) => s.id));

    // CHECK: Multi-tenancy - Companies
    if (companies.length === 0) {
      checks.push({
        id: 'companies_exist',
        name: 'Cadastro de Empresas',
        category: 'multi_tenancy',
        status: 'warning',
        description: 'Nenhuma empresa cadastrada no banco Supabase.',
      });
    } else {
      checks.push({
        id: 'companies_exist',
        name: 'Cadastro de Empresas (Multi-Tenancy)',
        category: 'multi_tenancy',
        status: 'passed',
        description: `${companies.length} empresa(s) ativa(s) registrada(s) no Supabase.`,
        count: companies.length,
      });
    }

    // CHECK: Customers company_id validity
    const orphanCustomers = customers.filter((c) => c.company_id && !companyIds.has(c.company_id));
    if (orphanCustomers.length > 0) {
      checks.push({
        id: 'orphan_customers',
        name: 'Vínculo de Clientes com Empresas',
        category: 'foreign_keys',
        status: 'failed',
        description: `${orphanCustomers.length} cliente(s) vinculados a empresa inexistente.`,
        details: `IDs: ${orphanCustomers.map((c) => c.id).slice(0, 5).join(', ')}`,
      });
    } else {
      checks.push({
        id: 'orphan_customers',
        name: 'Vínculo de Clientes com Empresas',
        category: 'foreign_keys',
        status: 'passed',
        description: `Todos os ${customers.length} cliente(s) possuem company_id válido.`,
        count: customers.length,
      });
    }

    // CHECK: Products company_id validity
    const orphanProducts = products.filter((p) => p.company_id && !companyIds.has(p.company_id));
    if (orphanProducts.length > 0) {
      checks.push({
        id: 'orphan_products',
        name: 'Vínculo de Produtos com Empresas',
        category: 'foreign_keys',
        status: 'failed',
        description: `${orphanProducts.length} produto(s) vinculados a empresa inexistente.`,
      });
    } else {
      checks.push({
        id: 'orphan_products',
        name: 'Vínculo de Produtos com Empresas',
        category: 'foreign_keys',
        status: 'passed',
        description: `Todos os ${products.length} produto(s) possuem company_id válido.`,
        count: products.length,
      });
    }

    // CHECK: Sales foreign keys
    const salesWithInvalidCustomer = sales.filter((s) => s.customer_id && !customerIds.has(s.customer_id));
    if (salesWithInvalidCustomer.length > 0) {
      checks.push({
        id: 'sales_customers_fk',
        name: 'Integridade de Vendas x Clientes',
        category: 'foreign_keys',
        status: 'warning',
        description: `${salesWithInvalidCustomer.length} venda(s) referenciam cliente inexistente ou removido.`,
      });
    } else {
      checks.push({
        id: 'sales_customers_fk',
        name: 'Integridade de Vendas x Clientes',
        category: 'foreign_keys',
        status: 'passed',
        description: `Todas as ${sales.length} venda(s) referenciam clientes válidos.`,
        count: sales.length,
      });
    }

    // CHECK: Installments foreign keys
    const orphanInstallments = installments.filter((i) => i.sale_id && !saleIds.has(i.sale_id));
    if (orphanInstallments.length > 0) {
      checks.push({
        id: 'orphan_installments',
        name: 'Integridade de Cobranças/Parcelas x Vendas',
        category: 'foreign_keys',
        status: 'warning',
        description: `${orphanInstallments.length} parcela(s) referenciam venda inexistente.`,
      });
    } else {
      checks.push({
        id: 'orphan_installments',
        name: 'Integridade de Cobranças/Parcelas x Vendas',
        category: 'foreign_keys',
        status: 'passed',
        description: `Todas as ${installments.length} parcela(s) estão corretamente vinculadas a vendas reais.`,
        count: installments.length,
      });
    }

    // CHECK: Stock movements foreign keys
    const orphanMovements = movements.filter((m) => m.product_id && !productIds.has(m.product_id));
    if (orphanMovements.length > 0) {
      checks.push({
        id: 'orphan_movements',
        name: 'Integridade de Movimentações de Estoque',
        category: 'foreign_keys',
        status: 'warning',
        description: `${orphanMovements.length} movimentação(ões) referenciam produto inexistente.`,
      });
    } else {
      checks.push({
        id: 'orphan_movements',
        name: 'Integridade de Movimentações de Estoque',
        category: 'foreign_keys',
        status: 'passed',
        description: `Todas as ${movements.length} movimentação(ões) de estoque estão vinculadas a produtos válidos.`,
        count: movements.length,
      });
    }

    // CHECK: Duplicate IDs
    const allIds = [
      ...companies.map((c) => ({ type: 'Empresa', id: c.id })),
      ...customers.map((c) => ({ type: 'Cliente', id: c.id })),
      ...products.map((p) => ({ type: 'Produto', id: p.id })),
      ...sales.map((s) => ({ type: 'Venda', id: s.id })),
      ...installments.map((i) => ({ type: 'Parcela', id: i.id })),
    ];
    const seenIds = new Set<string>();
    let duplicatesCount = 0;
    for (const item of allIds) {
      if (seenIds.has(item.id)) {
        duplicatesCount++;
      } else {
        seenIds.add(item.id);
      }
    }

    if (duplicatesCount > 0) {
      checks.push({
        id: 'duplicate_ids',
        name: 'Unicidade de Chaves Primárias',
        category: 'data_hygiene',
        status: 'failed',
        description: `${duplicatesCount} registro(s) com ID duplicado detectados no banco.`,
      });
    } else {
      checks.push({
        id: 'duplicate_ids',
        name: 'Unicidade de Chaves Primárias',
        category: 'data_hygiene',
        status: 'passed',
        description: 'Todos os registros possuem IDs únicos e estáveis no Supabase.',
      });
    }

    // CHECK: Fictitious / Mock data audit
    const hasFakeUsers = profiles.some(
      (p) =>
        p.email?.toLowerCase().includes('demo') ||
        p.username?.toLowerCase().includes('demo')
    );
    if (hasFakeUsers) {
      checks.push({
        id: 'mock_data_audit',
        name: 'Auditoria de Dados Fictícios / Demo',
        category: 'data_hygiene',
        status: 'warning',
        description: 'Existem usuários de teste/demonstração no cadastro de perfis.',
      });
    } else {
      checks.push({
        id: 'mock_data_audit',
        name: 'Auditoria de Dados Fictícios / Demo',
        category: 'data_hygiene',
        status: 'passed',
        description: 'Nenhum dado artificial ou de demonstração obrigatório detectado.',
      });
    }

  } catch (dbErr: any) {
    checks.push({
      id: 'db_query_error',
      name: 'Consulta ao Banco de Dados Supabase',
      category: 'foreign_keys',
      status: 'failed',
      description: 'Erro ao consultar tabelas do Supabase: ' + dbErr?.message,
    });
  }

  const passed = checks.filter((c) => c.status === 'passed').length;
  const warnings = checks.filter((c) => c.status === 'warning').length;
  const failed = checks.filter((c) => c.status === 'failed').length;
  const total = checks.length;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;

  logger.log({
    operation: 'DIAGNOSTIC',
    table: 'system',
    success: failed === 0,
    details: `Diagnóstico de Integridade executado: ${passed}/${total} checagens passaram (Score: ${score}%).`,
    errorMessage: failed > 0 ? `${failed} checagens falharam no diagnóstico.` : undefined,
  });

  return {
    timestamp: new Date().toISOString(),
    isAllPassed: failed === 0,
    score,
    summary: { passed, warnings, failed, total },
    checks,
    tablesCount: counts,
  };
}
