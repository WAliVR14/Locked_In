import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import {
  ShoppingBasket,
  Plus,
  AlertTriangle,
  Calendar,
  DollarSign,
  Store as StoreIcon,
  Wrench,
  PackageCheck,
  Clock,
  Sparkles,
  Tag,
  Home,
  CheckCircle2,
} from 'lucide-react';
import {
  RetroCard,
  RetroButton,
  RetroBadge,
  OrnamentalDivider,
  RetroModal,
} from '../components/ui/RetroUI';

const CATEGORIES = ['All', 'Alimentos', 'Lácteos', 'Limpieza', 'Higiene', 'Carnes', 'Bebidas'];
const OBLIGATION_CATEGORIES = [
  { id: 'service', label: 'Servicio / Factura' },
  { id: 'cleaning', label: 'Limpieza' },
  { id: 'appliance', label: 'Mantenimiento Aparatos' },
  { id: 'repair', label: 'Reparación Hogar' },
];

export default function Pantry({ onDataChange }) {
  // Main data state
  const [overview, setOverview] = useState({
    stores: [],
    inventory: [],
    shopping_list: [],
    price_comparison: [],
    home_obligations: [],
  });
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active internal sub-tab
  const [currentTab, setCurrentTab] = useState('inventory'); // 'inventory', 'shopping', 'home'
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modals state
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [showObligationModal, setShowObligationModal] = useState(false);

  // Purchase Form State (ERP)
  const [purchaseItemId, setPurchaseItemId] = useState('');
  const [purchaseStoreId, setPurchaseStoreId] = useState('');
  const [purchaseBrand, setPurchaseBrand] = useState('');
  const [purchaseQty, setPurchaseQty] = useState('1');
  const [purchaseUnit, setPurchaseUnit] = useState('pz');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseAccountId, setPurchaseAccountId] = useState('');
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);

  // New Pantry Item Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Alimentos');
  const [newItemCurrentQty, setNewItemCurrentQty] = useState('1');
  const [newItemMinQty, setNewItemMinQty] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('pz');
  const [newItemEstimatedPrice, setNewItemEstimatedPrice] = useState('0');
  const [newItemExpirationDate, setNewItemExpirationDate] = useState('');
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);

  // New Store Form State
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreNote, setNewStoreNote] = useState('');
  const [isSubmittingStore, setIsSubmittingStore] = useState(false);

  // New Home Obligation Form State
  const [newObName, setNewObName] = useState('');
  const [newObCategory, setNewObCategory] = useState('service');
  const [newObCost, setNewObCost] = useState('0');
  const [newObDueDate, setNewObDueDate] = useState('');
  const [newObFrequencyDays, setNewObFrequencyDays] = useState('30');
  const [newObNotes, setNewObNotes] = useState('');
  const [isSubmittingObligation, setIsSubmittingObligation] = useState(false);

  // Fetch data
  const refreshPantry = useCallback(async () => {
    try {
      const [pantryRes, financeRes] = await Promise.all([
        api.get('/pantry/overview'),
        api.get('/finance/overview'),
      ]);
      setOverview(pantryRes.data);
      setAccounts(financeRes.data?.accounts || []);
      if (onDataChange) onDataChange();
    } catch (err) {
      console.error('Error fetching pantry overview:', err);
    } finally {
      setLoading(false);
    }
  }, [onDataChange]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([api.get('/pantry/overview'), api.get('/finance/overview')])
      .then(([pantryRes, financeRes]) => {
        if (isMounted) {
          setOverview(pantryRes.data);
          setAccounts(financeRes.data?.accounts || []);
        }
      })
      .catch((err) => console.error('Initial pantry fetch error:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Handlers
  const handleRegisterPurchase = async (e) => {
    e.preventDefault();
    if (!purchaseItemId || !purchaseStoreId || !purchasePrice) return;
    setIsSubmittingPurchase(true);
    try {
      await api.post('/pantry/purchase', {
        pantry_item_id: Number(purchaseItemId),
        store_id: Number(purchaseStoreId),
        brand: purchaseBrand || null,
        presentation_qty: Number(purchaseQty) || 1,
        presentation_unit: purchaseUnit,
        price_paid: Number(purchasePrice),
        account_id: purchaseAccountId ? Number(purchaseAccountId) : null,
      });
      setShowPurchaseModal(false);
      setPurchasePrice('');
      setPurchaseBrand('');
      await refreshPantry();
    } catch (err) {
      console.error('Failed to register purchase:', err);
    } finally {
      setIsSubmittingPurchase(false);
    }
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    setIsSubmittingItem(true);
    try {
      await api.post('/pantry/items', {
        name: newItemName.trim(),
        category: newItemCategory,
        current_qty: Number(newItemCurrentQty) || 0,
        min_qty: Number(newItemMinQty) || 1,
        unit: newItemUnit,
        estimated_price: Number(newItemEstimatedPrice) || 0,
        expiration_date: newItemExpirationDate || null,
      });
      setShowItemModal(false);
      setNewItemName('');
      setNewItemExpirationDate('');
      await refreshPantry();
    } catch (err) {
      console.error('Failed to create pantry item:', err);
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleCreateStore = async (e) => {
    e.preventDefault();
    if (!newStoreName.trim()) return;
    setIsSubmittingStore(true);
    try {
      await api.post('/pantry/stores', {
        name: newStoreName.trim(),
        location_note: newStoreNote.trim() || null,
      });
      setShowStoreModal(false);
      setNewStoreName('');
      setNewStoreNote('');
      await refreshPantry();
    } catch (err) {
      console.error('Failed to create store:', err);
    } finally {
      setIsSubmittingStore(false);
    }
  };

  const handleCreateObligation = async (e) => {
    e.preventDefault();
    if (!newObName.trim()) return;
    setIsSubmittingObligation(true);
    try {
      await api.post('/pantry/home-obligations', {
        name: newObName.trim(),
        category: newObCategory,
        estimated_cost: Number(newObCost) || 0,
        next_due_date: newObDueDate || null,
        frequency_days: Number(newObFrequencyDays) || null,
        notes: newObNotes.trim() || null,
      });
      setShowObligationModal(false);
      setNewObName('');
      setNewObDueDate('');
      setNewObNotes('');
      await refreshPantry();
    } catch (err) {
      console.error('Failed to create home obligation:', err);
    } finally {
      setIsSubmittingObligation(false);
    }
  };

  // Filtered inventory
  const filteredInventory = overview.inventory.filter((item) => {
    if (selectedCategory === 'All') return true;
    return item.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  // Aggregated KPIs
  const totalItemsCount = overview.inventory.length;
  const lowStockCount = overview.inventory.filter((item) => item.is_low_stock).length;
  const expiringCount = overview.inventory.filter((item) => item.is_expiring_soon).length;
  const shoppingBudget = overview.shopping_list.reduce(
    (acc, curr) => acc + (curr.estimated_subtotal || 0),
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-tinta font-display font-bold">
        Cargando Despensa, Precios y Hogar...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-tinta/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold font-display text-tinta">
              Despensa & Hogar
            </h1>
            <RetroBadge variant="nopal">ERP Supply Chain</RetroBadge>
          </div>
          <p className="text-tinta-muted text-sm mt-1">
            Control de inventario, evidencia histórica de precios por tienda y obligaciones del hogar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <RetroButton
            variant="secondary"
            onClick={() => setShowStoreModal(true)}
            className="text-xs"
          >
            <StoreIcon className="w-3.5 h-3.5" /> Nueva Tienda
          </RetroButton>
          <RetroButton
            variant="secondary"
            onClick={() => setShowItemModal(true)}
            className="text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Nuevo Producto
          </RetroButton>
          <RetroButton
            variant="accent"
            onClick={() => {
              if (overview.inventory.length > 0 && !purchaseItemId) {
                setPurchaseItemId(String(overview.inventory[0].id));
                setPurchaseUnit(overview.inventory[0].unit || 'pz');
              }
              if (overview.stores.length > 0 && !purchaseStoreId) {
                setPurchaseStoreId(String(overview.stores[0].id));
              }
              if (accounts.length > 0 && !purchaseAccountId) {
                setPurchaseAccountId(String(accounts[0].id));
              }
              setShowPurchaseModal(true);
            }}
            className="text-xs font-bold"
          >
            <DollarSign className="w-4 h-4" /> Registrar Compra (ERP)
          </RetroButton>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <RetroCard>
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-tinta-muted mb-1">
            <span>Inventario Total</span>
            <PackageCheck className="w-4 h-4 text-nopal" />
          </div>
          <p className="text-2xl font-extrabold font-display text-tinta">{totalItemsCount} productos</p>
          <span className="text-xs text-tinta-muted">Registrados en despensa</span>
        </RetroCard>

        <RetroCard variant={lowStockCount > 0 ? 'highlighted' : 'default'}>
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-tinta-muted mb-1">
            <span>Alerta Reabastecer</span>
            <AlertTriangle className="w-4 h-4 text-cempasuchil" />
          </div>
          <p className="text-2xl font-extrabold font-display text-cempasuchil-dark">
            {lowStockCount} artículos
          </p>
          <span className="text-xs text-tinta-muted">Stock actual ≤ Stock mínimo</span>
        </RetroCard>

        <RetroCard variant={expiringCount > 0 ? 'highlighted' : 'default'}>
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-tinta-muted mb-1">
            <span>Por Caducar (≤ 5d)</span>
            <Clock className="w-4 h-4 text-oliva" />
          </div>
          <p className="text-2xl font-extrabold font-display text-oliva">{expiringCount} artículos</p>
          <span className="text-xs text-tinta-muted">Caducidad próxima o vencida</span>
        </RetroCard>

        <RetroCard>
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-tinta-muted mb-1">
            <span>Presupuesto Lista</span>
            <DollarSign className="w-4 h-4 text-nopal" />
          </div>
          <p className="text-2xl font-extrabold font-display text-nopal">
            ${shoppingBudget.toFixed(2)} MXN
          </p>
          <span className="text-xs text-tinta-muted">{overview.shopping_list.length} artículos por comprar</span>
        </RetroCard>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b-2 border-tinta/30 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setCurrentTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-sm transition-all border-2 border-b-0 ${
            currentTab === 'inventory'
              ? 'bg-crema-paper text-tinta border-tinta shadow-vintage-sm -mb-[2px]'
              : 'border-transparent text-tinta-muted hover:text-tinta hover:bg-maiz-soft/50'
          }`}
        >
          <ShoppingBasket className="w-4 h-4" />
          <span>Inventario & Caducidad</span>
          <RetroBadge variant="default" className="text-[10px]">
            {overview.inventory.length}
          </RetroBadge>
        </button>

        <button
          onClick={() => setCurrentTab('shopping')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-sm transition-all border-2 border-b-0 ${
            currentTab === 'shopping'
              ? 'bg-crema-paper text-tinta border-tinta shadow-vintage-sm -mb-[2px]'
              : 'border-transparent text-tinta-muted hover:text-tinta hover:bg-maiz-soft/50'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Lista de Compras & Comparador de Precios</span>
          {overview.shopping_list.length > 0 && (
            <RetroBadge variant="cempasuchil" className="text-[10px]">
              {overview.shopping_list.length}
            </RetroBadge>
          )}
        </button>

        <button
          onClick={() => setCurrentTab('home')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-sm transition-all border-2 border-b-0 ${
            currentTab === 'home'
              ? 'bg-crema-paper text-tinta border-tinta shadow-vintage-sm -mb-[2px]'
              : 'border-transparent text-tinta-muted hover:text-tinta hover:bg-maiz-soft/50'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Hogar & Mantenimiento</span>
          <RetroBadge variant="default" className="text-[10px]">
            {overview.home_obligations.length}
          </RetroBadge>
        </button>
      </div>

      {/* =========================================================================
          TAB A: INVENTARIO & CADUCIDAD
         ========================================================================= */}
      {currentTab === 'inventory' && (
        <div className="space-y-4">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="font-bold uppercase tracking-wider text-tinta-muted">Filtrar:</span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full font-semibold border transition ${
                  selectedCategory === cat
                    ? 'bg-nopal text-crema border-tinta shadow-vintage-sm'
                    : 'bg-crema-paper text-tinta-muted border-tinta/30 hover:bg-maiz-soft'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Cards Grid */}
          {filteredInventory.length === 0 ? (
            <RetroCard variant="dashed" className="text-center py-12">
              <ShoppingBasket className="w-10 h-10 text-tinta-muted mx-auto mb-2 opacity-50" />
              <p className="font-bold text-tinta text-base">No hay artículos registrados en esta categoría</p>
              <p className="text-xs text-tinta-muted mt-1">
                Haz clic en &quot;Nuevo Producto&quot; para comenzar a gestionar tu despensa.
              </p>
            </RetroCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredInventory.map((item) => {
                const isExpired = item.days_until_expiration !== null && item.days_until_expiration < 0;
                return (
                  <RetroCard
                    key={item.id}
                    variant={item.is_low_stock ? 'highlighted' : 'default'}
                    className="flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-bold text-base text-tinta leading-tight">{item.name}</h3>
                          <span className="text-xs text-tinta-muted capitalize">{item.category}</span>
                        </div>
                        {item.is_low_stock ? (
                          <RetroBadge variant="cempasuchil">Bajo Stock</RetroBadge>
                        ) : (
                          <RetroBadge variant="nopal">Óptimo</RetroBadge>
                        )}
                      </div>

                      {/* Stock Bar */}
                      <div className="bg-crema border border-tinta/40 rounded-lg p-2.5 my-3 space-y-1">
                        <div className="flex justify-between text-xs font-bold text-tinta">
                          <span>Existencia:</span>
                          <span>
                            {item.current_qty} / {item.min_qty} {item.unit}
                          </span>
                        </div>
                        <div className="w-full bg-crema-sunken rounded-full h-2 border border-tinta/30 overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              item.is_low_stock ? 'bg-cempasuchil' : 'bg-nopal'
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round((item.current_qty / (item.min_qty || 1)) * 100)
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Estimated Price & Expiration */}
                      <div className="text-xs space-y-1 text-tinta-muted">
                        <div className="flex justify-between">
                          <span>Precio Ref.:</span>
                          <span className="font-bold text-tinta">
                            ${Number(item.estimated_price).toFixed(2)} / {item.unit}
                          </span>
                        </div>
                        {item.expiration_date && (
                          <div className="flex justify-between items-center pt-1 border-t border-tinta/10">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Caducidad:
                            </span>
                            <span
                              className={`font-semibold ${
                                isExpired
                                  ? 'text-cempasuchil-dark font-bold'
                                  : item.is_expiring_soon
                                  ? 'text-cempasuchil-dark'
                                  : 'text-oliva'
                              }`}
                            >
                              {item.expiration_date}
                              {item.days_until_expiration !== null && (
                                <span className="ml-1 text-[10px]">
                                  ({item.days_until_expiration}d)
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-tinta/20 flex justify-end">
                      <button
                        onClick={() => {
                          setPurchaseItemId(String(item.id));
                          setPurchaseUnit(item.unit || 'pz');
                          setShowPurchaseModal(true);
                        }}
                        className="text-xs font-bold text-nopal hover:text-nopal-dark flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Reabastecer (ERP)
                      </button>
                    </div>
                  </RetroCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB B: LISTA DE COMPRAS & COMPARADOR DE PRECIOS
         ========================================================================= */}
      {currentTab === 'shopping' && (
        <div className="space-y-6">
          {/* Shopping List Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold font-display text-tinta">
                  Lista de Compras Inteligente
                </h2>
                <p className="text-xs text-tinta-muted">
                  Generada automáticamente a partir de artículos en nivel crítico de inventario.
                </p>
              </div>
              <RetroBadge variant="nopal" className="text-xs font-bold">
                Presupuesto Estimado: ${shoppingBudget.toFixed(2)} MXN
              </RetroBadge>
            </div>

            {overview.shopping_list.length === 0 ? (
              <RetroCard variant="dashed" className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-nopal mx-auto mb-2" />
                <p className="font-bold text-tinta">¡Despensa 100% abastecida!</p>
                <p className="text-xs text-tinta-muted">No hay productos con stock menor al mínimo.</p>
              </RetroCard>
            ) : (
              <div className="bg-crema-paper border-2 border-tinta rounded-xl shadow-vintage-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-maiz-soft border-b-2 border-tinta text-xs uppercase font-extrabold tracking-wider text-tinta">
                    <tr>
                      <th className="py-3 px-4">Producto</th>
                      <th className="py-3 px-4">Actual / Mínimo</th>
                      <th className="py-3 px-4">Sugerido Comprar</th>
                      <th className="py-3 px-4">Tienda Histórica Más Barata</th>
                      <th className="py-3 px-4 text-right">Subtotal Estimado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-tinta/20">
                    {overview.shopping_list.map((item) => (
                      <tr key={item.pantry_item_id} className="hover:bg-crema/60 transition">
                        <td className="py-3 px-4 font-bold text-tinta">
                          {item.name}
                          <span className="block text-xs font-normal text-tinta-muted">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-tinta-muted">
                          {item.current_qty} / {item.min_qty} {item.unit}
                        </td>
                        <td className="py-3 px-4">
                          <RetroBadge variant="maiz" className="font-bold">
                            +{item.suggested_qty} {item.unit}
                          </RetroBadge>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {item.cheapest_store ? (
                            <div>
                              <span className="font-bold text-nopal-dark flex items-center gap-1">
                                <StoreIcon className="w-3 h-3 text-nopal" />
                                {item.cheapest_store.store_name}
                              </span>
                              <span className="text-[11px] text-tinta-muted">
                                ${Number(item.cheapest_store.lowest_unit_price).toFixed(2)} /{item.unit} ({item.cheapest_store.last_observed})
                              </span>
                            </div>
                          ) : (
                            <span className="text-tinta-muted italic">Sin compras previas</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-tinta">
                          ${Number(item.estimated_subtotal).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <OrnamentalDivider label="Evidencia de Precios Reales por Tienda (ADR-04)" />

          {/* Cross-Store Unit Price Comparison Table */}
          <div>
            <div className="mb-3">
              <h2 className="text-lg font-bold font-display text-tinta">
                Comparador Normalizado por Unidad
              </h2>
              <p className="text-xs text-tinta-muted">
                Fórmula de normalización: unit_price = precio_pagado / cantidad_presentacion. Basado en compras reales.
              </p>
            </div>

            {overview.price_comparison.length === 0 ? (
              <RetroCard variant="dashed" className="text-center py-8">
                <StoreIcon className="w-8 h-8 text-tinta-muted mx-auto mb-2 opacity-50" />
                <p className="font-bold text-tinta">Aún no hay compras registradas con precios normalizados</p>
                <p className="text-xs text-tinta-muted">
                  Registra compras en distintas tiendas para ver la comparación histórica.
                </p>
              </RetroCard>
            ) : (
              <div className="space-y-4">
                {overview.price_comparison.map((prod) => (
                  <RetroCard key={prod.pantry_item_id} className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-tinta/20 pb-2 mb-3">
                      <div>
                        <span className="text-xs uppercase tracking-wider font-extrabold text-tinta-muted">
                          Producto
                        </span>
                        <h3 className="text-base font-bold text-tinta">{prod.item_name}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-tinta-muted">Mejor Opción:</span>
                        <RetroBadge variant="nopal" className="font-bold">
                          {prod.cheapest_store_name} (${Number(prod.min_normalized_price).toFixed(2)} / {prod.unit})
                        </RetroBadge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {prod.stores.map((s) => {
                        const isCheapest = s.unit_price_normalized === prod.min_normalized_price;
                        return (
                          <div
                            key={s.store_id}
                            className={`p-3 rounded-xl border-2 transition ${
                              isCheapest
                                ? 'bg-nopal/10 border-nopal shadow-vintage-sm'
                                : 'bg-crema border-tinta/30'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-sm text-tinta flex items-center gap-1">
                                <StoreIcon className="w-3.5 h-3.5 text-tinta-muted" />
                                {s.store_name}
                              </span>
                              {isCheapest && (
                                <RetroBadge variant="nopal" className="text-[10px]">
                                  Más Barato
                                </RetroBadge>
                              )}
                            </div>
                            <div className="text-xs space-y-0.5 text-tinta-muted">
                              <div>Marca: <strong className="text-tinta">{s.brand || 'Genérica'}</strong></div>
                              <div>Presentación: <strong className="text-tinta">{s.presentation}</strong></div>
                              <div>Total Pagado: <strong className="text-tinta">${Number(s.price_paid).toFixed(2)}</strong></div>
                              <div className="pt-1 mt-1 border-t border-tinta/20 flex justify-between font-bold text-tinta text-xs">
                                <span>Precio Unitario:</span>
                                <span className={isCheapest ? 'text-nopal-dark text-sm' : ''}>
                                  ${Number(s.unit_price_normalized).toFixed(2)} / {prod.unit}
                                </span>
                              </div>
                              <div className="text-[10px] text-tinta-muted text-right">
                                Obs: {s.observed_at}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </RetroCard>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB C: HOGAR & MANTENIMIENTO
         ========================================================================= */}
      {currentTab === 'home' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold font-display text-tinta">
                Obligaciones del Hogar & Mantenimiento
              </h2>
              <p className="text-xs text-tinta-muted">
                Servicios recurrentes (CFE, Internet), mantenimiento preventivo de electrodomésticos y reparaciones.
              </p>
            </div>
            <RetroButton
              variant="primary"
              onClick={() => setShowObligationModal(true)}
              className="text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Nueva Obligación / Mantenimiento
            </RetroButton>
          </div>

          {overview.home_obligations.length === 0 ? (
            <RetroCard variant="dashed" className="text-center py-10">
              <Wrench className="w-8 h-8 text-tinta-muted mx-auto mb-2 opacity-50" />
              <p className="font-bold text-tinta">No hay obligaciones o mantenimientos registrados</p>
              <p className="text-xs text-tinta-muted mt-1">
                Registra el pago de luz, filtros de agua, gas o servicios para sincronizarlos con la Agenda Central.
              </p>
            </RetroCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {overview.home_obligations.map((ob) => {
                const categoryLabel =
                  OBLIGATION_CATEGORIES.find((c) => c.id === ob.category)?.label || ob.category;
                return (
                  <RetroCard key={ob.id} className="flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-base text-tinta leading-tight">{ob.name}</h3>
                        <RetroBadge variant="oliva" className="text-[10px] capitalize">
                          {categoryLabel}
                        </RetroBadge>
                      </div>

                      <div className="space-y-2 text-xs text-tinta-muted my-3">
                        {ob.estimated_cost > 0 && (
                          <div className="flex justify-between items-center bg-crema p-2 rounded-lg border border-tinta/20">
                            <span>Costo Estimado:</span>
                            <span className="font-extrabold text-tinta text-sm">
                              ${Number(ob.estimated_cost).toFixed(2)} MXN
                            </span>
                          </div>
                        )}

                        {ob.next_due_date && (
                          <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-cempasuchil" /> Vencimiento:
                            </span>
                            <span className="font-bold text-tinta">{ob.next_due_date}</span>
                          </div>
                        )}

                        {ob.frequency_days && (
                          <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-tinta-muted" /> Frecuencia:
                            </span>
                            <span className="font-semibold text-tinta">
                              Cada {ob.frequency_days} días
                            </span>
                          </div>
                        )}

                        {ob.notes && (
                          <p className="p-2 bg-crema-paper rounded border border-tinta/20 text-tinta text-xs italic">
                            &quot;{ob.notes}&quot;
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-tinta/20 flex items-center justify-between text-[11px] text-tinta-muted">
                      <span className="flex items-center gap-1 text-nopal font-bold">
                        <Sparkles className="w-3 h-3" /> Sincronizado en Tareas
                      </span>
                      <span>ERP Home</span>
                    </div>
                  </RetroCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL 1: REGISTRAR COMPRA (ERP CROSS-MODULE CON FINANZAS)
         ========================================================================= */}
      <RetroModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        title="Registrar Compra de Despensa (ERP)"
      >
        <form onSubmit={handleRegisterPurchase} className="space-y-4 text-sm">
          <p className="text-xs text-tinta-muted">
            Actualiza el inventario físico en tiempo real, normaliza el costo unitario por tienda y descuenta opcionalmente el monto de tu cuenta bancaria.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-tinta mb-1">
                Producto
              </label>
              <select
                value={purchaseItemId}
                onChange={(e) => {
                  setPurchaseItemId(e.target.value);
                  const selected = overview.inventory.find(
                    (item) => String(item.id) === e.target.value
                  );
                  if (selected) setPurchaseUnit(selected.unit || 'pz');
                }}
                className="w-full p-2.5 rounded-xl border-2 border-tinta bg-crema font-semibold text-tinta"
                required
              >
                <option value="">Selecciona un producto...</option>
                {overview.inventory.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-tinta mb-1">
                Tienda / Supermercado
              </label>
              <select
                value={purchaseStoreId}
                onChange={(e) => setPurchaseStoreId(e.target.value)}
                className="w-full p-2.5 rounded-xl border-2 border-tinta bg-crema font-semibold text-tinta"
                required
              >
                <option value="">Selecciona una tienda...</option>
                {overview.stores.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-tinta mb-1">
                Marca (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. Lala, Great Value"
                value={purchaseBrand}
                onChange={(e) => setPurchaseBrand(e.target.value)}
                className="w-full p-2.5 rounded-xl border-2 border-tinta bg-crema text-tinta"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-tinta mb-1">
                Cantidad Presentación
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={purchaseQty}
                onChange={(e) => setPurchaseQty(e.target.value)}
                className="w-full p-2.5 rounded-xl border-2 border-tinta bg-crema text-tinta font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-tinta mb-1">
                Unidad
              </label>
              <input
                type="text"
                value={purchaseUnit}
                onChange={(e) => setPurchaseUnit(e.target.value)}
                className="w-full p-2.5 rounded-xl border-2 border-tinta bg-crema text-tinta font-bold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-tinta mb-1">
                Precio Total Pagado ($ MXN)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="42.00"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full p-2.5 rounded-xl border-2 border-tinta bg-crema text-tinta font-extrabold text-base"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-tinta mb-1">
                Pagar desde Cuenta (Finanzas ERP)
              </label>
              <select
                value={purchaseAccountId}
                onChange={(e) => setPurchaseAccountId(e.target.value)}
                className="w-full p-2.5 rounded-xl border-2 border-tinta bg-crema text-tinta font-semibold"
              >
                <option value="">Solo registrar precio (sin deducir)</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (${Number(acc.balance).toFixed(2)} MXN)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {purchasePrice && purchaseQty && (
            <div className="p-3 bg-maiz-soft rounded-xl border border-tinta/30 flex justify-between items-center text-xs font-bold text-tinta">
              <span>Precio Unitario Normalizado:</span>
              <span className="text-sm font-extrabold text-nopal-dark">
                ${(Number(purchasePrice) / (Number(purchaseQty) || 1)).toFixed(2)} / {purchaseUnit}
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <RetroButton
              variant="secondary"
              onClick={() => setShowPurchaseModal(false)}
              disabled={isSubmittingPurchase}
            >
              Cancelar
            </RetroButton>
            <RetroButton
              variant="primary"
              type="submit"
              disabled={isSubmittingPurchase || !purchaseItemId || !purchaseStoreId || !purchasePrice}
            >
              {isSubmittingPurchase ? 'Guardando...' : 'Confirmar Compra ERP'}
            </RetroButton>
          </div>
        </form>
      </RetroModal>

      {/* =========================================================================
          MODAL 2: NUEVO PRODUCTO
         ========================================================================= */}
      <RetroModal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        title="Registrar Nuevo Producto"
      >
        <form onSubmit={handleCreateItem} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-tinta mb-1">
              Nombre del Producto
            </label>
            <input
              type="text"
              placeholder="Ej. Leche Entera, Arroz, Detergente"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="w-full p-2.5 rounded-xl border-2 border-tinta bg-crema text-tinta font-bold"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-tinta mb-1">
                Categoría
              </label>
              <select
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                className="w-full p-2.5 rounded-xl border-2 border-tinta bg-crema text-tinta font-semibold"
              >
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-tinta mb-1">
                Unidad de Medida
              </label>
              <input
                type="text"
                placeholder="pz, L, kg, g"
                value={newItemUnit}
                onChange={(e) => setNewItemUnit(e.target.value)}
                className="w-full p-2.5 rounded-xl border-2 border-tinta bg-crema text-tinta font-semibold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-tinta mb-1">
                Stock Inicial
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={newItemCurrentQty}
                onChange={(e) => setNewItemCurrentQty(e.target.value)}
                className="w-full p-2.5 rounded-xl border-2 border-tinta bg-crema text-tinta"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-tinta mb-1">
                Stock Mínimo
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={newItemMinQty}
                onChange={(e) => setNewItemMinQty(e.target.value)}
                className="w-full p-2.5 rounded-xl border-2 border-tinta bg-crema text-tinta"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-tinta mb-1">
                Precio Ref. ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newItemEstimatedPrice}
                onChange={(e) => setNewItemEstimatedPrice(e.target.value)}
                className="w-full p-2.5 rounded-xl border-2 border-tinta bg-crema text-tinta"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-tinta mb-1">
              Fecha de Caducidad (Opcional)
            </label>
            <input
              type="date"
              value={newItemExpirationDate}
              onChange={(e) => setNewItemExpirationDate(e.target.value)}
              className="w-full p-2.5 rounded-xl border-2 border-tinta bg-crema text-tinta font-semibold"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <RetroButton
              variant="secondary"
              onClick={() => setShowItemModal(false)}
              disabled={isSubmittingItem}
            >
              Cancelar
            </RetroButton>
            <RetroButton variant="primary" type="submit" disabled={isSubmittingItem || !newItemName.trim()}>
              {isSubmittingItem ? 'Guardando...' : 'Crear Producto'}
            </RetroButton>
          </div>
        </form>
      </RetroModal>

      {/* =========================================================================
          MODAL 3: NUEVA TIENDA
         ========================================================================= */}
      <RetroModal
        isOpen={showStoreModal}
        onClose={() => setShowStoreModal(false)}
        title="Registrar Tienda o Establecimiento"
      >
        <form onSubmit={handleCreateStore} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-tinta mb-1">
              Nombre de la Tienda
            </label>
            <input
              type="text"
              placeholder="Ej. Walmart, Chedraui, Mercado Local, Costco"
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              className="w-full p-2.5 rounded-xl border-2 border-tinta bg-crema text-tinta font-bold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-tinta mb-1">
              Ubicación / Notas (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Sucursal Universidad, Tianguis de los martes"
              value={newStoreNote}
              onChange={(e) => setNewStoreNote(e.target.value)}
              className="w-full p-2.5 rounded-xl border-2 border-tinta bg-crema text-tinta"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <RetroButton
              variant="secondary"
              onClick={() => setShowStoreModal(false)}
              disabled={isSubmittingStore}
            >
              Cancelar
            </RetroButton>
            <RetroButton variant="primary" type="submit" disabled={isSubmittingStore || !newStoreName.trim()}>
              {isSubmittingStore ? 'Guardando...' : 'Guardar Tienda'}
            </RetroButton>
          </div>
        </form>
      </RetroModal>

      {/* =========================================================================
          MODAL 4: NUEVA OBLIGACIÓN DEL HOGAR
         ========================================================================= */}
      <RetroModal
        isOpen={showObligationModal}
        onClose={() => setShowObligationModal(false)}
        title="Registrar Obligación del Hogar / Mantenimiento"
      >
        <form onSubmit={handleCreateObligation} className="space-y-4 text-sm">
          <p className="text-xs text-tinta-muted">
            Si asignas una fecha de vencimiento, Locked_In creará automáticamente una tarea en tu Agenda Central.
          </p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-tinta mb-1">
              Nombre de la Obligación / Mantenimiento
            </label>
            <input
              type="text"
              placeholder="Ej. Recibo de CFE, Mantenimiento Lavadora, Limpieza Filtros"
              value={newObName}
              onChange={(e) => setNewObName(e.target.value)}
              className="w-full p-2.5 rounded-xl border-2 border-tinta bg-crema text-tinta font-bold"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-tinta mb-1">
                Tipo / Categoría
              </label>
              <select
                value={newObCategory}
                onChange={(e) => setNewObCategory(e.target.value)}
                className="w-full p-2.5 rounded-xl border-2 border-tinta bg-crema text-tinta font-semibold"
              >
                {OBLIGATION_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-tinta mb-1">
                Costo Estimado ($ MXN)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newObCost}
                onChange={(e) => setNewObCost(e.target.value)}
                className="w-full p-2.5 rounded-xl border-2 border-tinta bg-crema text-tinta"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-tinta mb-1">
                Fecha de Vencimiento / Ejecución
              </label>
              <input
                type="date"
                value={newObDueDate}
                onChange={(e) => setNewObDueDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border-2 border-tinta bg-crema text-tinta font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-tinta mb-1">
                Frecuencia (Días)
              </label>
              <input
                type="number"
                min="1"
                placeholder="30 (mensual), 60 (bimestral)"
                value={newObFrequencyDays}
                onChange={(e) => setNewObFrequencyDays(e.target.value)}
                className="w-full p-2.5 rounded-xl border-2 border-tinta bg-crema text-tinta"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-tinta mb-1">
              Notas / Instrucciones (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Técnico: Juan Pérez (55-1234-5678)"
              value={newObNotes}
              onChange={(e) => setNewObNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl border-2 border-tinta bg-crema text-tinta"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <RetroButton
              variant="secondary"
              onClick={() => setShowObligationModal(false)}
              disabled={isSubmittingObligation}
            >
              Cancelar
            </RetroButton>
            <RetroButton variant="primary" type="submit" disabled={isSubmittingObligation || !newObName.trim()}>
              {isSubmittingObligation ? 'Guardando...' : 'Guardar Obligación'}
            </RetroButton>
          </div>
        </form>
      </RetroModal>
    </div>
  );
}

