import React from 'react';
import { MessageCircle } from 'lucide-react';
import { buildWhatsAppUrl, generateWhatsAppChargeMessage, formatCurrency, formatDate } from '../../utils/formatters';
import { Installment, BusinessSettings } from '../../types';

interface WhatsAppButtonProps {
  installment: Installment;
  settings: BusinessSettings;
  daysOverdue?: number;
  variant?: 'solid' | 'outline' | 'subtle' | 'compact';
  customText?: string;
  className?: string;
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  installment,
  settings,
  daysOverdue = 0,
  variant = 'solid',
  customText,
  className = '',
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    let template = settings.whatsappMessageTemplateReminder;
    if (daysOverdue > 0 || installment.status === 'overdue') {
      template = settings.whatsappMessageTemplateOverdue;
    } else if (installment.status === 'pending' && daysOverdue === 0) {
      template = settings.whatsappMessageTemplateToday;
    }

    const message = generateWhatsAppChargeMessage(template, {
      cliente: installment.customerName.split(' ')[0], // First name for warmth
      valor: formatCurrency(installment.amount),
      vencimento: formatDate(installment.dueDate),
      parcela: `${installment.installmentNumber}/${installment.totalInstallments}`,
      empresa: settings.businessName,
      pix: `${settings.pixKey} (${settings.pixKeyType || 'PIX'})`,
      diasAtraso: daysOverdue,
    });

    const phone = installment.customerWhatsapp || installment.customerPhone;
    if (!phone) {
      alert('Cliente não possui telefone/WhatsApp cadastrado.');
      return;
    }

    const url = buildWhatsAppUrl(phone, message);
    window.open(url, '_blank');
  };

  const getStyle = () => {
    switch (variant) {
      case 'solid':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-medium';
      case 'outline':
        return 'border border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-medium';
      case 'subtle':
        return 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium';
      case 'compact':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg';
    }
  };

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleClick}
        title="Cobrar via WhatsApp"
        className={`inline-flex items-center justify-center transition-colors focus:ring-2 focus:ring-emerald-500 focus:outline-none ${getStyle()} ${className}`}
      >
        <MessageCircle className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm transition-all focus:ring-2 focus:ring-emerald-500 focus:outline-none ${getStyle()} ${className}`}
    >
      <MessageCircle className="w-4 h-4 shrink-0" />
      <span>{customText || 'Cobrar WhatsApp'}</span>
    </button>
  );
};
