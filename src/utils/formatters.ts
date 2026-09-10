export const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatNumber = (value: number | undefined | null, decimals: number = 0): string => {
  if (value === undefined || value === null || isNaN(value)) return '0';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return '-';
  try {
    const [year, month, day] = dateString.split('T')[0].split('-');
    if (!year || !month || !day) return dateString;
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString: string | undefined | null): string => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

export const getDaysDifference = (targetDateString: string): number => {
  // Returns negative if past due, 0 if today, positive if in future
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [y, m, d] = targetDateString.split('T')[0].split('-').map(Number);
  const target = new Date(y, m - 1, d);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

export const getDaysOverdue = (targetDateString: string): number => {
  const diff = getDaysDifference(targetDateString);
  return diff < 0 ? Math.abs(diff) : 0;
};

export const isToday = (dateString: string): boolean => {
  return getDaysDifference(dateString) === 0;
};

export const isOverdue = (dateString: string): boolean => {
  return getDaysDifference(dateString) < 0;
};

export const formatPhone = (phone: string): string => {
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return phone;
};

export const formatDocument = (doc: string): string => {
  const clean = doc.replace(/\D/g, '');
  if (clean.length === 11) {
    // CPF
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
  }
  if (clean.length === 14) {
    // CNPJ
    return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12)}`;
  }
  return doc;
};

export const buildWhatsAppUrl = (
  phone: string,
  message: string
): string => {
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = cleanPhone.replace(/^0+/, '');
  }
  // If Brazilian standard number (10 or 11 digits without 55 country code)
  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
    cleanPhone = `55${cleanPhone}`;
  }
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};

export const generateWhatsAppChargeMessage = (
  template: string | undefined | null,
  data: {
    cliente: string;
    valor: string;
    vencimento: string;
    parcela: string;
    empresa: string;
    pix: string;
    diasAtraso?: number;
  }
): string => {
  const fallback =
    (data.diasAtraso && data.diasAtraso > 0)
      ? 'Olá, {cliente}. Notamos que sua parcela ({parcela}) no valor de {valor} está com vencimento pendente desde {vencimento} ({dias_atraso} dias em atraso). Segue nossa chave PIX: {pix}. - {empresa}'
      : 'Olá, {cliente}! Lembramos que sua parcela ({parcela}) no valor de {valor} da cesta básica vence em {vencimento}. Chave PIX: {pix}. Obrigado! - {empresa}';

  let msg = (template && template.trim().length > 0 ? template : fallback)
    .replace(/{cliente}/g, data.cliente || 'Cliente')
    .replace(/{valor}/g, data.valor || 'R$ 0,00')
    .replace(/{vencimento}/g, data.vencimento || '-')
    .replace(/{parcela}/g, data.parcela || '1/1')
    .replace(/{empresa}/g, data.empresa || 'Nossa Empresa')
    .replace(/{pix}/g, data.pix || 'Consulte-nos');

  const dias = data.diasAtraso !== undefined ? String(data.diasAtraso) : '0';
  msg = msg.replace(/{dias_atraso}/g, dias).replace(/{dias}/g, dias);

  return msg;
};

export const addDaysToDate = (startDate: string, days: number): string => {
  const [y, m, d] = startDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const getTodayDateString = (): string => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};
