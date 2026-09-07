import React, { useState } from 'react';
import { Customer } from '../../types';
import { Modal } from '../common/Modal';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Customer, 'id' | 'createdAt'>) => void;
  initialData?: Customer | null;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [document, setDocument] = useState(initialData?.document || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [whatsapp, setWhatsapp] = useState(initialData?.whatsapp || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [neighborhood, setNeighborhood] = useState(initialData?.neighborhood || '');
  const [city, setCity] = useState(initialData?.city || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [status, setStatus] = useState<Customer['status']>(initialData?.status || 'active');

  // Sync if initialData changes
  React.useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDocument(initialData.document);
      setPhone(initialData.phone);
      setWhatsapp(initialData.whatsapp);
      setAddress(initialData.address);
      setNeighborhood(initialData.neighborhood || '');
      setCity(initialData.city || '');
      setNotes(initialData.notes || '');
      setStatus(initialData.status);
    } else {
      setName('');
      setDocument('');
      setPhone('');
      setWhatsapp('');
      setAddress('');
      setNeighborhood('');
      setCity('');
      setNotes('');
      setStatus('active');
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Por favor, informe o nome do cliente.');
      return;
    }

    onSave({
      name: name.trim(),
      document: document.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim() || phone.trim(), // fallback to phone
      address: address.trim(),
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      notes: notes.trim(),
      status,
    });

    onClose();
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    if (!whatsapp || whatsapp === phone) {
      setWhatsapp(val);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar Cliente' : 'Novo Cadastro de Cliente'}
      subtitle="Cadastre os dados de contato e endereço para entrega de cestas e cobranças"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Nome Completo *
          </label>
          <input
            type="text"
            required
            placeholder="Ex: Maria da Silva"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] outline-none transition-all"
          />
        </div>

        {/* CPF / CNPJ */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            CPF ou CNPJ
          </label>
          <input
            type="text"
            placeholder="000.000.000-00"
            value={document}
            onChange={(e) => setDocument(e.target.value)}
            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] outline-none transition-all"
          />
        </div>

        {/* Telefone e WhatsApp */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Telefone Principal
            </label>
            <input
              type="text"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              WhatsApp (para Cobranças)
            </label>
            <input
              type="text"
              placeholder="(11) 99999-9999"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] outline-none transition-all"
            />
          </div>
        </div>

        {/* Endereço */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Endereço Completo de Entrega
          </label>
          <input
            type="text"
            placeholder="Rua, número, complemento, ponto de referência"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] outline-none transition-all"
          />
        </div>

        {/* Bairro e Cidade */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Bairro
            </label>
            <input
              type="text"
              placeholder="Ex: Centro"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Cidade / UF
            </label>
            <input
              type="text"
              placeholder="Ex: São Paulo - SP"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] outline-none transition-all"
            />
          </div>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Observações / Preferências
          </label>
          <textarea
            rows={2}
            placeholder="Ex: Prefere pagar no dia 10, gosta de trocar café por leite, avisar antes de entregar..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] outline-none transition-all"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Status do Cliente
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
              <input
                type="radio"
                name="customerStatus"
                value="active"
                checked={status === 'active'}
                onChange={() => setStatus('active')}
                className="text-blue-600 focus:ring-[#2563eb]"
              />
              <span>Ativo (Pode comprar cestas)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
              <input
                type="radio"
                name="customerStatus"
                value="inactive"
                checked={status === 'inactive'}
                onChange={() => setStatus('inactive')}
                className="text-slate-500 focus:ring-slate-400"
              />
              <span>Inativo</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-sm rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            {initialData ? 'Salvar Alterações' : 'Cadastrar Cliente'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
