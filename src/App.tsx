import { useState } from 'react';
import { Sidebar, type View } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CustomerList } from './components/CustomerList';
import { CustomerDetail } from './components/CustomerDetail';
import { ModelInsights } from './components/ModelInsights';
import { useChurnData } from './lib/useChurnData';

function App() {
  const [view, setView] = useState<View>('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const {
    customers,
    loading,
    seeding,
    error,
    stats,
    seed,
    getCustomerTransactions,
    regenerateMessage,
  } = useChurnData();

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    setView('detail');
  };

  const handleNavigate = (v: View) => {
    setView(v);
    if (v !== 'detail') setSelectedCustomerId(null);
  };

  const selectedCustomer = customers.find(c => c.customer_id === selectedCustomerId);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar view={view} onNavigate={handleNavigate} />

      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {error}
            </div>
          )}

          {view === 'dashboard' && (
            <Dashboard
              stats={stats}
              customers={customers}
              loading={loading}
              seeding={seeding}
              onSeed={seed}
              onSelectCustomer={handleSelectCustomer}
            />
          )}

          {view === 'customers' && (
            <CustomerList
              customers={customers}
              loading={loading}
              onSelectCustomer={handleSelectCustomer}
            />
          )}

          {view === 'detail' && selectedCustomer && (
            <CustomerDetail
              customer={selectedCustomer}
              onBack={() => setView('customers')}
              getTransactions={getCustomerTransactions}
              onRegenerateMessage={regenerateMessage}
            />
          )}

          {view === 'detail' && !selectedCustomer && (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
              <p className="text-sm text-slate-400">Müşteri bulunamadı</p>
              <button onClick={() => setView('customers')} className="btn-secondary text-sm">
                Müşteri Listesine Dön
              </button>
            </div>
          )}

          {view === 'insights' && (
            <ModelInsights customers={customers} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
