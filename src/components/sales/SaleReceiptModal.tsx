import React, { useState } from 'react';
import { Printer, MessageCircle, Copy, Check, Package, MapPin, Phone } from 'lucide-react';
import { Sale } from '../../types';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPhone,
  buildWhatsAppUrl,
} from '../../utils/formatters';

interface SaleReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export const SaleReceiptModal: React.FC<SaleReceiptModalProps> = ({ isOpen, onClose, sale }) => {
  const { customers, installments, settings } = useApp();
  const [copied, setCopied] = useState(false);

  if (!sale) return null;

  const customer = customers.find((c) => c.id === sale.customerId);
  const saleInstallments = installments.filter((i) => i.saleId === sale.id && i.status !== 'cancelled');

  const handlePrint = () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Comprovante_${sale.saleNumber}</title>
          <style>
            @page { size: auto; margin: 8mm; }
            body {
              font-family: 'Courier New', Courier, monospace, sans-serif;
              font-size: 13px;
              color: #000;
              margin: 0;
              padding: 12px;
              background: #fff;
            }
            .receipt-container {
              max-width: 420px;
              margin: 0 auto;
              padding: 16px;
              border: 1px dashed #444;
              border-radius: 4px;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .border-dashed { border-bottom: 1px dashed #777; padding-bottom: 8px; margin-bottom: 8px; }
            .flex-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .title { font-size: 16px; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
            .small { font-size: 11px; color: #444; }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="text-center border-dashed">
              <div class="title">${settings.businessName || 'CestUP'}</div>
              ${settings.document ? `<div class="small">CNPJ/CPF: ${settings.document}</div>` : ''}
              ${settings.phone ? `<div class="small">Telefone: ${settings.phone}</div>` : ''}
              <div class="small">${formatDateTime(sale.createdAt)} • Pedido #${sale.saleNumber}</div>
            </div>

            <div class="border-dashed">
              <div><strong>CLIENTE:</strong> ${sale.customerName}</div>
              ${customer?.phone ? `<div class="small">WhatsApp: ${formatPhone(customer.phone)}</div>` : ''}
              ${customer?.address ? `<div class="small">Endereço: ${customer.address}</div>` : ''}
            </div>

            <div class="border-dashed">
              <div class="flex-row"><strong>PRODUTO / COMPOSIÇÃO</strong><strong>QTD</strong></div>
              ${sale.items.map(it => `<div class="flex-row"><span>${it.productName}</span><span><strong>${it.quantity} ${it.unit}</strong></span></div>`).join('')}
            </div>

            <div class="border-dashed">
              <div class="flex-row" style="font-size:14px;"><strong>TOTAL DA VENDA:</strong><strong>${formatCurrency(sale.totalSaleValue)}</strong></div>
              <div class="flex-row small"><span>Forma:</span><span>${sale.paymentPlan === 'cash' ? 'À Vista' : `${sale.installmentsCount}x Parcelado`}</span></div>
            </div>

            <div class="border-dashed">
              <div><strong>VENCIMENTOS:</strong></div>
              ${saleInstallments.map(inst => `
                <div class="flex-row small">
                  <span>Parcela ${inst.installmentNumber}/${inst.totalInstallments} (${formatDate(inst.dueDate)}):</span>
                  <span><strong>${formatCurrency(inst.amount)} ${inst.status === 'paid' ? '[PAGO]' : ''}</strong></span>
                </div>
              `).join('')}
            </div>

            <div class="text-center small" style="margin-top:10px;">
              <div><strong>Chave PIX:</strong> ${settings.pixKey}</div>
              <div>Agradecemos pela preferência!</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    // Try popup window first
    try {
      const printWindow = window.open('', '_blank', 'width=600,height=700');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        return;
      }
    } catch (e) {
      console.warn('Popup blocked, falling back to direct window.print', e);
    }

    // Direct browser print fallback
    window.print();
  };

  const getReceiptText = () => {
    const itemsList = sale.items
      .map((item) => `• ${item.quantity}x ${item.productName}`)
      .join('\n');

    const installmentsText = saleInstallments
      .map(
        (inst) =>
          `  - Parcela ${inst.installmentNumber}/${inst.totalInstallments}: ${formatCurrency(
            inst.amount
          )} (Venc: ${formatDate(inst.dueDate)}) ${inst.status === 'paid' ? '✅ PAGO' : '⏳ A Vencer'}`
      )
      .join('\n');

    return `🧾 *COMPROVANTE DE PEDIDO / VENDA*\n*${settings.businessName}*\n\n` +
      `*Nº da Venda:* ${sale.saleNumber}\n` +
      `*Data:* ${formatDate(sale.createdAt)}\n` +
      `*Cliente:* ${sale.customerName}\n\n` +
      `📦 *Cesta:* ${sale.basketName}\n` +
      `*Itens Entregues (${sale.items.length}):*\n${itemsList}\n\n` +
      `💰 *Valor Total da Venda:* ${formatCurrency(sale.totalSaleValue)}\n` +
      `*Forma de Pagamento:* ${
        sale.paymentPlan === 'cash' ? 'À Vista' : `${sale.installmentsCount}x Parcelado`
      }\n\n` +
      `*Plano de Parcelas:*\n${installmentsText}\n\n` +
      `🔑 *Chave PIX:* ${settings.pixKey} (${settings.pixKeyType || 'PIX'})\n\n` +
      `Obrigado pela preferência! Ficamos à disposição. 🙏`;
  };

  const handleSendWhatsAppReceipt = () => {
    const phone = customer?.whatsapp || customer?.phone;
    if (!phone) {
      alert('Telefone do cliente não encontrado.');
      return;
    }

    const message = getReceiptText();
    const url = buildWhatsAppUrl(phone, message);
    window.open(url, '_blank');
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(getReceiptText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Comprovante de Venda / Cesta Básica"
      subtitle={`Pedido ${sale.saleNumber}`}
      maxWidth="md"
    >
      <div className="space-y-4 text-slate-800">
        {/* Printable Ticket Receipt Paper Container */}
        <div
          id="sale-printable-receipt"
          className="bg-slate-50 border border-slate-300 rounded-2xl p-5 font-mono text-xs shadow-inner space-y-4"
        >
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-400 pb-3">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
              {settings.businessName}
            </h3>
            {settings.document && <p className="text-[11px] text-slate-500">CNPJ: {settings.document}</p>}
            {settings.phone && <p className="text-[11px] text-slate-500">Tel: {settings.phone}</p>}
            <p className="text-[10px] text-slate-400 mt-1">
              {formatDateTime(sale.createdAt)} • Pedido #{sale.saleNumber}
            </p>
          </div>

          {/* Customer */}
          <div className="border-b border-dashed border-slate-400 pb-2 space-y-0.5">
            <p className="font-bold text-slate-900 text-xs">CLIENTE: {sale.customerName}</p>
            {customer?.phone && <p>WhatsApp: {formatPhone(customer.phone)}</p>}
            {customer?.address && <p>Endereço: {customer.address}</p>}
          </div>

          {/* Items */}
          <div className="border-b border-dashed border-slate-400 pb-3 space-y-1.5">
            <div className="flex justify-between font-bold text-slate-900">
              <span>PRODUTO / COMPOSIÇÃO</span>
              <span>QTD</span>
            </div>
            {sale.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-slate-700">
                <span className="truncate max-w-[200px]">{item.productName}</span>
                <span className="font-bold">{item.quantity} {item.unit}</span>
              </div>
            ))}
          </div>

          {/* Financial Summary */}
          <div className="border-b border-dashed border-slate-400 pb-3 space-y-1">
            <div className="flex justify-between text-xs font-bold text-slate-900">
              <span>TOTAL DA VENDA:</span>
              <span className="text-sm font-black">{formatCurrency(sale.totalSaleValue)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600">
              <span>Forma:</span>
              <span>
                {sale.paymentPlan === 'cash' ? 'À Vista' : `${sale.installmentsCount}x Parcelas`}
              </span>
            </div>
          </div>

          {/* Installments Table */}
          <div className="border-b border-dashed border-slate-400 pb-3 space-y-1">
            <p className="font-bold text-slate-900 uppercase">Vencimentos:</p>
            {saleInstallments.map((inst) => (
              <div key={inst.id} className="flex justify-between text-[11px]">
                <span>
                  Parcela {inst.installmentNumber}/{inst.totalInstallments} ({formatDate(inst.dueDate)}):
                </span>
                <span className="font-bold">
                  {formatCurrency(inst.amount)} {inst.status === 'paid' ? '[PAGO]' : ''}
                </span>
              </div>
            ))}
          </div>

          {/* Footer PIX */}
          <div className="text-center text-[11px] text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">Chave PIX: {settings.pixKey}</p>
            <p className="text-[10px] text-slate-400">Agradecemos a confiança e preferência!</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            type="button"
            onClick={handleSendWhatsAppReceipt}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Enviar no WhatsApp</span>
          </button>
          
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-all shadow-sm cursor-pointer"
            title="Imprimir Comprovante Térmico / A4"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            <span>Imprimir</span>
          </button>

          <button
            type="button"
            onClick={handleCopyText}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
            title="Copiar texto do comprovante"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
