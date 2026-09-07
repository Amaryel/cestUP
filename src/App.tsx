import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar, TopHeader } from './components/layout/Navbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { SalesView } from './components/sales/SalesView';
import { CustomersView } from './components/customers/CustomersView';
import { CollectionsView } from './components/collections/CollectionsView';
import { BasketsView } from './components/baskets/BasketsView';
import { ProductsView } from './components/products/ProductsView';
import { StockView } from './components/stock/StockView';
import { PurchasesView } from './components/purchases/PurchasesView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { NewSaleModal } from './components/sales/NewSaleModal';
import { CustomerFormModal } from './components/customers/CustomerFormModal';
import { NewPurchaseModal } from './components/purchases/NewPurchaseModal';
import { Customer } from './types';

const MainContent: React.FC = () => {
  const { activeTab, setActiveTab, setSelectedCustomerId, addCustomer } = useApp();

  // Modals state
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [isNewPurchaseOpen, setIsNewPurchaseOpen] = useState(false);
  const [salePreselectedCustomer, setSalePreselectedCustomer] = useState<Customer | null>(null);
  const [purchasePreselectedProduct, setPurchasePreselectedProduct] = useState<any | null>(null);
  const [selectedSaleIdForDetail, setSelectedSaleIdForDetail] = useState<string | null>(null);

  const handleOpenNewSale = (customer?: Customer) => {
    setSalePreselectedCustomer(customer || null);
    setIsNewSaleOpen(true);
  };

  const handleOpenNewPurchase = (product?: any) => {
    setPurchasePreselectedProduct(product || null);
    setIsNewPurchaseOpen(true);
  };

  const handleSaleCreated = (saleId: string) => {
    setSelectedSaleIdForDetail(saleId);
    setActiveTab('vendas');
  };

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setActiveTab('clientes');
  };

  const handleSelectSale = (saleId: string) => {
    setSelectedSaleIdForDetail(saleId);
    setActiveTab('vendas');
  };

  return (
    <div className="flex h-screen w-full bg-[#f1f5f9] text-[#0f172a] font-sans overflow-hidden selection:bg-[#2563eb] selection:text-white">
      {/* Sidebar navigation */}
      <Sidebar onOpenNewSale={() => handleOpenNewSale()} />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <TopHeader onOpenNewSale={() => handleOpenNewSale()} />

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#f1f5f9] pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto w-full">
            {activeTab === 'dashboard' && (
              <DashboardView
                onOpenNewSale={() => handleOpenNewSale()}
                onOpenNewCustomer={() => setIsNewCustomerOpen(true)}
                onOpenNewPurchase={(product) => handleOpenNewPurchase(product)}
                onSelectSale={handleSelectSale}
                onSelectCustomer={handleSelectCustomer}
              />
            )}

            {activeTab === 'vendas' && (
              <SalesView
                onOpenNewSale={() => handleOpenNewSale()}
                selectedSaleId={selectedSaleIdForDetail}
                onClearSelectedSale={() => setSelectedSaleIdForDetail(null)}
              />
            )}

            {activeTab === 'cobrancas' && (
              <CollectionsView
                onSelectSale={handleSelectSale}
                onSelectCustomer={handleSelectCustomer}
              />
            )}

            {activeTab === 'clientes' && (
              <CustomersView
                onOpenNewSaleForCustomer={(c) => handleOpenNewSale(c)}
                onSelectSale={handleSelectSale}
              />
            )}

            {activeTab === 'cestas' && (
              <BasketsView onOpenNewSale={() => handleOpenNewSale()} />
            )}

            {activeTab === 'produtos' && <ProductsView />}

            {activeTab === 'estoque' && (
              <StockView onOpenNewPurchase={(product) => handleOpenNewPurchase(product)} />
            )}

            {activeTab === 'compras' && (
              <PurchasesView
                isNewPurchaseOpen={isNewPurchaseOpen}
                onCloseNewPurchase={() => {
                  setIsNewPurchaseOpen(false);
                  setPurchasePreselectedProduct(null);
                }}
                onOpenNewPurchase={(product) => handleOpenNewPurchase(product)}
              />
            )}

            {activeTab === 'relatorios' && <ReportsView />}

            {activeTab === 'configuracoes' && <SettingsView />}
          </div>
        </main>
      </div>

      {/* Global Modals */}
      <NewSaleModal
        isOpen={isNewSaleOpen}
        onClose={() => {
          setIsNewSaleOpen(false);
          setSalePreselectedCustomer(null);
        }}
        preselectedCustomer={salePreselectedCustomer}
        onSaleCreated={handleSaleCreated}
      />

      <CustomerFormModal
        isOpen={isNewCustomerOpen}
        onClose={() => setIsNewCustomerOpen(false)}
        onSave={(data) => {
          const cust = addCustomer(data);
          handleOpenNewSale(cust);
        }}
      />

      <NewPurchaseModal
        isOpen={isNewPurchaseOpen}
        onClose={() => {
          setIsNewPurchaseOpen(false);
          setPurchasePreselectedProduct(null);
        }}
        preselectedProduct={purchasePreselectedProduct}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
