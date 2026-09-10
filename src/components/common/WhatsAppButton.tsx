import React, { useState } from 'react';
import { MessageCircle, ExternalLink, Copy, Check, AlertTriangle } from 'lucide-react';
import {
  buildWhatsAppUrl,
  generateWhatsAppChargeMessage,
  formatCurrency,
  formatDate,
  formatPhone,
} from '../../utils/formatters';
import { Installment, BusinessSettings } from '../../types';
import { useApp } from '../../context/AppContext';
import { Modal } from './Modal';

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
  const { getCustomerById } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [modalPhone, setModalPhone] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Compute message template
  const getTemplate = () => {
    if (daysOverdue > 0 || installment.status === 'overdue') {
      return (
        settings.whatsappMessageOverdue ||
        settings.whatsappMessageTemplateOverdue ||
        'Olá, {cliente}. Notamos que sua parcela ({parcela}) no valor de {valor} referente à sua cesta básica está com vencimento pendente desde {vencimento} ({dias_atraso} dias em atraso). Poderia verificar o pagamento? Chave PIX: {pix}. Agradecemos o contato para regularização! - {empresa}'
      );
    }
    if (installment.status === 'pending' && daysOverdue === 0) {
      return (
        settings.whatsappMessageDueToday ||
        settings.whatsappMessageTemplateToday ||
        'Olá, {cliente}! Tudo bem? Lembramos que sua parcela ({parcela}) no valor de {valor} da cesta básica VENCE HOJE ({vencimento}). Chave PIX: {pix}. Favor nos enviar o comprovante assim que efetuar. Obrigado! - {empresa}'
      );
    }
    return (
      settings.whatsappMessageUpcoming ||
      settings.whatsappMessageTemplateReminder ||
      'Olá, {cliente}! Tudo bem? Passando para lembrar que sua parcela ({parcela}) no valor de {valor} da sua cesta básica vence em {vencimento}. Chave PIX: {pix}. Qualquer dúvida estamos à disposição! - {empresa}'
    );
  };

  const getEffectivePhone = () => {
    let phone = installment.customerWhatsapp || installment.customerPhone || '';
    if (!phone && installment.customerId) {
      const cust = getCustomerById(installment.customerId);
      if (cust) {
        phone = cust.whatsapp || cust.phone || '';
      }
    }
    return phone;
  };

  const buildMessageContent = () => {
    const template = getTemplate();
    const cleanFirstName = (installment.customerName || 'Cliente').split(' ')[0];

    return generateWhatsAppChargeMessage(template, {
      cliente: cleanFirstName,
      valor: formatCurrency(installment.amount),
      vencimento: formatDate(installment.dueDate),
      parcela: `${installment.installmentNumber}/${installment.totalInstallments}`,
      empresa: settings.businessName || 'Cesta Básica',
      pix: `${settings.pixKey || 'Não cadastrada'} (${settings.pixKeyType || 'PIX'})`,
      diasAtraso: daysOverdue,
    });
  };

  const executeOpenWhatsApp = (phone: string, msg: string) => {
    const url = buildWhatsAppUrl(phone, msg);
    
    // Attempt direct link click for best popup-blocker compatibility
    try {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    const phone = getEffectivePhone();
    const message = buildMessageContent();

    setModalPhone(phone);
    setModalMessage(message);

    if (!phone || phone.replace(/\D/g, '').length < 8) {
      setShowModal(true);
      return;
    }

    // Direct launch
    executeOpenWhatsApp(phone, message);
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(modalMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleModalSend = () => {
    if (!modalPhone.trim()) return;
    executeOpenWhatsApp(modalPhone, modalMessage);
    setShowModal(false);
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

  return (
    <>
      {variant === 'compact' ? (
        <button
          type="button"
          onClick={handleClick}
          title="Cobrar via WhatsApp"
          className={`inline-flex items-center justify-center transition-colors focus:ring-2 focus:ring-emerald-500 focus:outline-none ${getStyle()} ${className}`}
        >
          <MessageCircle className="w-4 h-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm transition-all focus:ring-2 focus:ring-emerald-500 focus:outline-none ${getStyle()} ${className}`}
        >
          <MessageCircle className="w-4 h-4 shrink-0" />
          <span>{customText || 'Cobrar WhatsApp'}</span>
        </button>
      )}

      {/* WhatsApp Dialog for fallback or number verification */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Mensagem de Cobrança WhatsApp"
          subtitle={`Cliente: ${installment.customerName} - Parcela ${installment.installmentNumber}/${installment.totalInstallments}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-slate-700">
            {!getEffectivePhone() && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>O cliente não possui WhatsApp preenchido no cadastro. Digite o número abaixo para enviar:</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Número do WhatsApp (com DDD):
              </label>
              <input
                type="text"
                placeholder="(11) 99999-9999"
                value={modalPhone}
                onChange={(e) => setModalPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600">
                  Texto da Mensagem:
                </label>
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="text-xs inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-medium"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
              <textarea
                rows={5}
                value={modalMessage}
                onChange={(e) => setModalMessage(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg text-xs bg-slate-50 font-sans focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleModalSend}
                disabled={!modalPhone.replace(/\D/g, '')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Abrir no WhatsApp</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
