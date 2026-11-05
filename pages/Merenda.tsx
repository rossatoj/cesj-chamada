import React, { useState, useMemo, useEffect } from 'react';
import { 
  Utensils, 
  Scale, 
  Trash2, 
  Plus, 
  Calendar, 
  Save, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  TrendingDown, 
  BarChart3, 
  Info
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { useApp } from '../AppContext';
import { MerendaContainerType, MerendaItem, MerendaRecord } from '../types';

const CONTAINER_TARES: Record<MerendaContainerType, { label: string; tare: number }> = {
  cuba_grande: { label: 'Cuba Grande (1,7 Kg)', tare: 1.7 },
  cuba_pequena: { label: 'Cuba Pequena (1,0 Kg)', tare: 1.0 },
  forma: { label: 'Forma (0,5 Kg)', tare: 0.5 },
  personalizado: { label: 'Personalizado', tare: 0 }
};

const BUCKET_TARE = 1.0; // Tara do balde de desperdício (1,0 Kg)

export const Merenda: React.FC = () => {
  const { state, persistMerendaRecord, removeMerendaRecord } = useApp();

  // Data atual no fuso horário do Brasil
  const getTodayString = () => {
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    const today = new Date();
    return today.getMonth() + 1;
  });
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const today = new Date();
    return today.getFullYear();
  });

  const [items, setItems] = useState<MerendaItem[]>([
    {
      id: '1',
      productName: '',
      containerQuantity: 1,
      containerType: 'cuba_grande',
      containerTare: 1.7,
      totalWeight: 0,
      netWeight: 0
    }
  ]);

  const [wasteGrossWeight, setWasteGrossWeight] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Carregar dados salvos da data selecionada
  useEffect(() => {
    const existing = state.merendaRecords?.find(r => r.date === selectedDate);
    if (existing) {
      setItems(existing.items.length > 0 ? existing.items.map(item => {
        const qty = Math.max(1, Number(item.containerQuantity) || 1);
        const total = Number(item.totalWeight) || 0;
        const tare = Number(item.containerTare) || 0;
        const totalGross = total * qty;
        const totalTare = tare * qty;
        const net = Math.max(0, Number((totalGross - totalTare).toFixed(3)));
        return {
          ...item,
          containerQuantity: qty,
          netWeight: net
        };
      }) : [
        {
          id: '1',
          productName: '',
          containerQuantity: 1,
          containerType: 'cuba_grande',
          containerTare: 1.7,
          totalWeight: 0,
          netWeight: 0
        }
      ]);
      setWasteGrossWeight(existing.wasteGrossWeight || 0);
      setNotes(existing.notes || '');
    } else {
      // Novo registro padrão
      setItems([
        {
          id: '1',
          productName: '',
          containerQuantity: 1,
          containerType: 'cuba_grande',
          containerTare: 1.7,
          totalWeight: 0,
          netWeight: 0
        }
      ]);
      setWasteGrossWeight(0);
      setNotes('');
    }
    setSaveSuccess(false);
  }, [selectedDate, state.merendaRecords]);

  // Manipular adição de item
  const handleAddItem = () => {
    const newItem: MerendaItem = {
      id: Date.now().toString(),
      productName: '',
      containerQuantity: 1,
      containerType: 'cuba_grande',
      containerTare: 1.7,
      totalWeight: 0,
      netWeight: 0
    };
    setItems(prev => [...prev, newItem]);
  };

  // Remover item
  const handleRemoveItem = (id: string) => {
    if (items.length === 1) {
      // Limpa em vez de remover se for o único
      setItems([{
        id: Date.now().toString(),
        productName: '',
        containerQuantity: 1,
        containerType: 'cuba_grande',
        containerTare: 1.7,
        totalWeight: 0,
        netWeight: 0
      }]);
      return;
    }
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Atualizar campo de um item
  const handleItemChange = (
    id: string, 
    field: keyof MerendaItem, 
    value: any
  ) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;

      const updated = { ...item, [field]: value };

      if (field === 'containerQuantity') {
        const parsed = parseInt(value, 10);
        updated.containerQuantity = isNaN(parsed) || parsed < 1 ? 1 : parsed;
      }

      if (field === 'containerType') {
        const type = value as MerendaContainerType;
        if (type !== 'personalizado') {
          updated.containerTare = CONTAINER_TARES[type].tare;
        }
      }

      // Recalcula peso líquido: (peso total * quantidade) - (tara * quantidade)
      const qty = Math.max(1, Number(updated.containerQuantity) || 1);
      const total = Number(updated.totalWeight) || 0;
      const tare = Number(updated.containerTare) || 0;
      const totalGross = total * qty;
      const totalTare = tare * qty;
      const net = Math.max(0, Number((totalGross - totalTare).toFixed(3)));
      updated.netWeight = net;

      return updated;
    }));
  };

  // Totais do dia
  const totalPreparedNet = useMemo(() => {
    return Number(items.reduce((sum, item) => sum + (Number(item.netWeight) || 0), 0).toFixed(3));
  }, [items]);

  const wasteNet = useMemo(() => {
    const gross = Number(wasteGrossWeight) || 0;
    if (gross <= 0) return 0;
    return Number(Math.max(0, gross - BUCKET_TARE).toFixed(3));
  }, [wasteGrossWeight]);

  const totalConsumed = useMemo(() => {
    return Number(Math.max(0, totalPreparedNet - wasteNet).toFixed(3));
  }, [totalPreparedNet, wasteNet]);

  const wastePercentage = useMemo(() => {
    if (totalPreparedNet <= 0) return 0;
    return Number(((wasteNet / totalPreparedNet) * 100).toFixed(1));
  }, [totalPreparedNet, wasteNet]);

  // Salvar registro do dia
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const record: MerendaRecord = {
        id: selectedDate,
        date: selectedDate,
        items: items.filter(i => i.productName.trim() !== '' || i.totalWeight > 0),
        totalPreparedNetWeight: totalPreparedNet,
        wasteGrossWeight: Number(wasteGrossWeight) || 0,
        wasteTare: BUCKET_TARE,
        wasteNetWeight: wasteNet,
        notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await persistMerendaRecord(record);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error("Erro ao salvar merenda:", err);
      alert("Erro ao salvar o registro da merenda.");
    } finally {
      setIsSaving(false);
    }
  };

  // Excluir registro do dia atual
  const handleDeleteCurrentRecord = async () => {
    const existing = state.merendaRecords?.find(r => r.date === selectedDate);
    if (!existing) return;
    if (!window.confirm(`Deseja realmente excluir o registro da merenda de ${selectedDate}?`)) return;

    try {
      await removeMerendaRecord(existing.id);
      setItems([{
        id: Date.now().toString(),
        productName: '',
        containerQuantity: 1,
        containerType: 'cuba_grande',
        containerTare: 1.7,
        totalWeight: 0,
        netWeight: 0
      }]);
      setWasteGrossWeight(0);
      setNotes('');
      alert("Registro excluído com sucesso!");
    } catch (err) {
      console.error("Erro ao excluir:", err);
      alert("Erro ao excluir registro.");
    }
  };

  // Dados mensais para o gráfico
  const monthlyData = useMemo(() => {
    const records = state.merendaRecords || [];
    
    // Filtrar pelo mês e ano selecionados
    const monthPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    const filtered = records
      .filter(r => r.date.startsWith(monthPrefix))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Determinar dias no mês
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const chartList = [];

    let totalMonthPrepared = 0;
    let totalMonthWaste = 0;
    let daysWithRecords = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${monthPrefix}-${String(day).padStart(2, '0')}`;
      const record = filtered.find(r => r.date === dateStr);

      if (record) {
        totalMonthPrepared += record.totalPreparedNetWeight;
        totalMonthWaste += record.wasteNetWeight;
        daysWithRecords++;

        chartList.push({
          day: `Dia ${day}`,
          date: dateStr,
          preparado: Number(record.totalPreparedNetWeight.toFixed(2)),
          desperdicio: Number(record.wasteNetWeight.toFixed(2)),
          consumido: Number(Math.max(0, record.totalPreparedNetWeight - record.wasteNetWeight).toFixed(2))
        });
      }
    }

    const totalMonthConsumed = Number(Math.max(0, totalMonthPrepared - totalMonthWaste).toFixed(2));
    const avgWastePercentage = totalMonthPrepared > 0 
      ? Number(((totalMonthWaste / totalMonthPrepared) * 100).toFixed(1))
      : 0;
    const avgDailyWaste = daysWithRecords > 0 
      ? Number((totalMonthWaste / daysWithRecords).toFixed(2))
      : 0;

    return {
      chartList,
      totalMonthPrepared: Number(totalMonthPrepared.toFixed(2)),
      totalMonthWaste: Number(totalMonthWaste.toFixed(2)),
      totalMonthConsumed,
      avgWastePercentage,
      avgDailyWaste,
      daysWithRecords,
      records: filtered
    };
  }, [state.merendaRecords, selectedMonth, selectedYear]);

  // Formatação de números em kg
  const formatKg = (val: number) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 }) + ' kg';
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Cabeçalho Principal */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-emerald-600 p-3 rounded-2xl text-white shadow-lg shadow-emerald-500/20">
              <Utensils size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                Controle de Merenda
              </h1>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                Pesagem diária de produção e desperdício
              </p>
            </div>
          </div>
        </div>

        {/* Seletor de Data */}
        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-200/80">
          <button 
            onClick={() => {
              const d = new Date(selectedDate + 'T12:00:00');
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toLocaleDateString('sv-SE'));
            }}
            title="Dia anterior"
            className="p-2 hover:bg-white rounded-xl text-gray-600 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex items-center gap-2 px-2">
            <Calendar size={18} className="text-emerald-600" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-black text-gray-800 text-sm md:text-base outline-none cursor-pointer"
            />
          </div>

          <button 
            onClick={() => {
              const d = new Date(selectedDate + 'T12:00:00');
              d.setDate(d.getDate() + 1);
              setSelectedDate(d.toLocaleDateString('sv-SE'));
            }}
            title="Próximo dia"
            className="p-2 hover:bg-white rounded-xl text-gray-600 transition-colors"
          >
            <ChevronRight size={20} />
          </button>

          <button
            onClick={() => setSelectedDate(getTodayString())}
            className="text-xs font-black uppercase tracking-wider bg-emerald-600 text-white px-3 py-2 rounded-xl hover:bg-emerald-700 transition"
          >
            Hoje
          </button>
        </div>
      </div>

      {/* Seção 1: Registro Diário da Merenda */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Scale className="text-emerald-600" size={22} />
              Produtos Prontos da Merenda
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Informe o alimento preparado, o recipiente utilizado e o peso total aferido na balança. O valor líquido é calculado subtraindo a tara.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-sm font-black transition-colors"
            >
              <Plus size={18} />
              Adicionar Produto
            </button>
          </div>
        </div>

        {/* Tabela de Produtos */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-200 text-[12px] font-black uppercase text-gray-500 tracking-wider">
                <th className="py-3 px-3">Nome do Produto</th>
                <th className="py-3 px-3 w-32 text-center">Qtd. Recipientes</th>
                <th className="py-3 px-3 w-56">Recipiente</th>
                <th className="py-3 px-3 w-40 text-center">Tara do Recipiente</th>
                <th className="py-3 px-3 w-44 text-center">Peso Total Pronto</th>
                <th className="py-3 px-3 w-44 text-right">Peso Líquido</th>
                <th className="py-3 px-3 w-16 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                  {/* Nome do Produto */}
                  <td className="py-3 px-3">
                    <input 
                      type="text"
                      placeholder={`Ex: Arroz, Feijão, Carne... (Item ${index + 1})`}
                      value={item.productName}
                      onChange={(e) => handleItemChange(item.id, 'productName', e.target.value)}
                      className="w-full px-3 py-2 text-sm font-bold text-gray-800 bg-white border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                    />
                  </td>

                  {/* Quantidade de Recipientes */}
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center">
                      <input 
                        type="number"
                        min="1"
                        step="1"
                        value={item.containerQuantity ?? 1}
                        onChange={(e) => handleItemChange(item.id, 'containerQuantity', e.target.value)}
                        className="w-20 px-2 py-2 text-center text-sm font-black text-gray-900 bg-white border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                        title="Quantidade de recipientes deste alimento"
                      />
                    </div>
                  </td>

                  {/* Recipiente / Tara Predefinida */}
                  <td className="py-3 px-3">
                    <select
                      value={item.containerType}
                      onChange={(e) => handleItemChange(item.id, 'containerType', e.target.value)}
                      className="w-full px-3 py-2 text-sm font-bold text-gray-800 bg-white border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                    >
                      <option value="cuba_grande">Cuba Grande (Tara: 1,7 Kg)</option>
                      <option value="cuba_pequena">Cuba Pequena (Tara: 1,0 Kg)</option>
                      <option value="forma">Forma (Tara: 0,5 Kg)</option>
                      <option value="personalizado">Personalizado</option>
                    </select>
                  </td>

                  {/* Valor da Tara */}
                  <td className="py-3 px-3 text-center">
                    {item.containerType === 'personalizado' ? (
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            value={item.containerTare || ''}
                            onChange={(e) => handleItemChange(item.id, 'containerTare', parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1.5 text-center text-sm font-bold text-gray-800 bg-white border border-gray-200 rounded-lg outline-none focus:border-emerald-500"
                          />
                          <span className="text-xs font-bold text-gray-400">kg</span>
                        </div>
                        {(item.containerQuantity || 1) > 1 && (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Total: {((item.containerTare || 0) * (item.containerQuantity || 1)).toFixed(2).replace('.', ',')} kg
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-black">
                          {item.containerTare.toFixed(1).replace('.', ',')} kg
                        </span>
                        {(item.containerQuantity || 1) > 1 && (
                          <span className="text-[11px] font-bold text-emerald-700 mt-0.5 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Total ({item.containerQuantity}x): {(item.containerTare * (item.containerQuantity || 1)).toFixed(2).replace('.', ',')} kg
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Peso Total Pronto (Com Recipiente) */}
                  <td className="py-3 px-3 text-center">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <div className="flex items-center justify-center gap-1.5">
                        <input 
                          type="number"
                          step="0.05"
                          min="0"
                          placeholder="0,00"
                          value={item.totalWeight === 0 ? '' : item.totalWeight}
                          onChange={(e) => handleItemChange(item.id, 'totalWeight', parseFloat(e.target.value) || 0)}
                          className="w-28 px-3 py-2 text-center text-sm font-black text-gray-900 bg-white border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                        />
                        <span className="text-xs font-bold text-gray-400">kg</span>
                      </div>
                      {(item.containerQuantity || 1) > 1 && item.totalWeight > 0 && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Total ({item.containerQuantity}x): {(item.totalWeight * item.containerQuantity).toFixed(2).replace('.', ',')} kg
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Peso Líquido (Calculado: (Total * Qtd) - (Tara * Qtd)) */}
                  <td className="py-3 px-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-base font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 inline-block">
                        {formatKg(item.netWeight)}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium mt-0.5">
                        {item.containerQuantity > 1 
                          ? `(${item.containerQuantity}x produto - ${item.containerQuantity}x tara)`
                          : '(bruto - tara)'}
                      </span>
                    </div>
                  </td>

                  {/* Ação: Remover */}
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remover este produto"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Rodapé da tabela com Subtotal de Preparo */}
            <tfoot>
              <tr className="bg-emerald-50/50 border-t-2 border-emerald-200 text-emerald-950 font-black">
                <td colSpan={5} className="py-3.5 px-4 text-right uppercase text-xs tracking-wider">
                  Total de Comida Pronta Preparada (Líquido):
                </td>
                <td className="py-3.5 px-3 text-right text-lg font-black text-emerald-700">
                  {formatKg(totalPreparedNet)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Seção no final da tabela: Registro de Desperdício (Tara do balde: 1,0 Kg) */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="bg-amber-50/60 border border-amber-200 rounded-3xl p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="bg-amber-500 text-white p-2 rounded-xl">
                    <TrendingDown size={20} />
                  </div>
                  <h3 className="text-lg font-black text-gray-900">
                    Registro de Desperdício / Sobras (Balde)
                  </h3>
                </div>
                <p className="text-xs text-gray-600">
                  Pese o balde com as sobras e restos de merenda recolhidos. A <strong>tara do balde é de 1,0 Kg</strong> e será deduzida automaticamente.
                </p>
              </div>

              {/* Campos do Balde de Desperdício */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full lg:w-auto">
                {/* Tara Fixa do Balde */}
                <div className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-sm text-center">
                  <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                    Tara do Balde
                  </span>
                  <span className="text-base font-black text-gray-800">
                    1,00 kg
                  </span>
                </div>

                {/* Peso Total do Balde com Desperdício */}
                <div className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-sm">
                  <label className="text-[11px] font-black uppercase tracking-wider text-gray-600 block mb-1 text-center">
                    Peso Bruto c/ Balde
                  </label>
                  <div className="flex items-center justify-center gap-1">
                    <input 
                      type="number"
                      step="0.05"
                      min="0"
                      placeholder="0,00"
                      value={wasteGrossWeight === 0 ? '' : wasteGrossWeight}
                      onChange={(e) => setWasteGrossWeight(parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 text-center text-sm font-black text-amber-900 bg-amber-50/50 border border-amber-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-300"
                    />
                    <span className="text-xs font-bold text-gray-400">kg</span>
                  </div>
                </div>

                {/* Desperdício Líquido Real */}
                <div className="bg-amber-500 text-white p-3.5 rounded-2xl shadow-sm text-center">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-100 block mb-1">
                    Desperdício Líquido
                  </span>
                  <span className="text-lg font-black block">
                    {formatKg(wasteNet)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resumo do Dia e Ação de Salvar */}
        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200/80 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto flex-1">
            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Total Preparado
              </span>
              <span className="text-lg font-black text-emerald-600">
                {formatKg(totalPreparedNet)}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Desperdício Líquido
              </span>
              <span className="text-lg font-black text-amber-600">
                {formatKg(wasteNet)}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Total Consumido
              </span>
              <span className="text-lg font-black text-blue-600">
                {formatKg(totalConsumed)}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Taxa Desperdício
              </span>
              <span className="text-lg font-black text-gray-900">
                {wastePercentage}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {state.merendaRecords?.some(r => r.date === selectedDate) && (
              <button
                type="button"
                onClick={handleDeleteCurrentRecord}
                className="px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold text-sm transition"
                title="Excluir este dia"
              >
                Excluir
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
            >
              <Save size={18} />
              {isSaving ? 'Salvando...' : 'Salvar Registro do Dia'}
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200 flex items-center gap-3 font-bold text-sm">
            <CheckCircle2 size={20} className="text-emerald-600" />
            <span>Registro da merenda para <strong>{selectedDate}</strong> salvo com sucesso no banco de dados!</span>
          </div>
        )}
      </div>

      {/* Seção 2: Gráfico e Resultado Mensal */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-md shadow-blue-500/20">
              <BarChart3 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">
                Resultado Mensal da Merenda
              </h2>
              <p className="text-xs text-gray-500">
                Acompanhamento gráfico do volume preparado vs. desperdício diário
              </p>
            </div>
          </div>

          {/* Filtro de Mês e Ano */}
          <div className="flex items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm text-gray-800 outline-none focus:border-blue-500"
            >
              {monthNames.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>{m}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm text-gray-800 outline-none focus:border-blue-500"
            >
              {[2024, 2025, 2026, 2027].map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cards de Métricas do Mês */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-emerald-50/60 border border-emerald-100 p-5 rounded-2xl">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 block mb-1">
              Preparado no Mês
            </span>
            <span className="text-2xl font-black text-emerald-950">
              {formatKg(monthlyData.totalMonthPrepared)}
            </span>
            <span className="text-[11px] text-emerald-600 mt-1 block">
              {monthlyData.daysWithRecords} dias registrados
            </span>
          </div>

          <div className="bg-amber-50/60 border border-amber-100 p-5 rounded-2xl">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 block mb-1">
              Desperdício no Mês
            </span>
            <span className="text-2xl font-black text-amber-950">
              {formatKg(monthlyData.totalMonthWaste)}
            </span>
            <span className="text-[11px] text-amber-600 mt-1 block">
              Média: {formatKg(monthlyData.avgDailyWaste)}/dia
            </span>
          </div>

          <div className="bg-blue-50/60 border border-blue-100 p-5 rounded-2xl">
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-700 block mb-1">
              Consumido no Mês
            </span>
            <span className="text-2xl font-black text-blue-950">
              {formatKg(monthlyData.totalMonthConsumed)}
            </span>
            <span className="text-[11px] text-blue-600 mt-1 block">
              Alimento aproveitado
            </span>
          </div>

          <div className="bg-gray-50 border border-gray-200/80 p-5 rounded-2xl">
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 block mb-1">
              Taxa de Desperdício
            </span>
            <span className="text-2xl font-black text-gray-900">
              {monthlyData.avgWastePercentage}%
            </span>
            <span className="text-[11px] text-gray-500 mt-1 block">
              Sobre a produção do mês
            </span>
          </div>
        </div>

        {/* Gráfico Recharts */}
        <div className="pt-4">
          {monthlyData.chartList.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center bg-gray-50/70 rounded-2xl border border-dashed border-gray-200 text-center p-6">
              <Info className="text-gray-400 mb-2" size={32} />
              <p className="font-bold text-gray-700">Nenhum registro de merenda encontrado em {monthNames[selectedMonth - 1]} de {selectedYear}.</p>
              <p className="text-xs text-gray-400 mt-1">Utilize a seção acima para registrar os produtos e desperdício de cada dia.</p>
            </div>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData.chartList} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} 
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis 
                    unit=" kg" 
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} 
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <Tooltip 
                    formatter={(val: any, name: any) => [
                      `${Number(val).toLocaleString('pt-BR')} kg`, 
                      name === 'preparado' ? 'Preparado Líquido' : name === 'desperdicio' ? 'Desperdício Líquido' : 'Consumido'
                    ]}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        return `${label} (${payload[0].payload.date})`;
                      }
                      return label;
                    }}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      color: '#ffffff',
                      border: 'none',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                    }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    align="right"
                    formatter={(value) => (
                      <span className="text-xs font-black text-gray-700 mr-4">
                        {value === 'preparado' ? 'Comida Pronta (Kg)' : value === 'desperdicio' ? 'Desperdício (Kg)' : 'Consumido (Kg)'}
                      </span>
                    )}
                  />
                  <Bar dataKey="preparado" fill="#059669" radius={[6, 6, 0, 0]} maxBarSize={38} name="preparado" />
                  <Bar dataKey="desperdicio" fill="#d97706" radius={[6, 6, 0, 0]} maxBarSize={38} name="desperdicio" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Lista dos Dias Registrados no Mês */}
        {monthlyData.records.length > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-black uppercase text-gray-500 tracking-wider mb-3">
              Registros Detalhados do Mês ({monthNames[selectedMonth - 1]} de {selectedYear})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {monthlyData.records.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedDate(r.date)}
                  className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
                    r.date === selectedDate 
                      ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200' 
                      : 'bg-gray-50/60 border-gray-200/80 hover:bg-white'
                  }`}
                >
                  <div>
                    <span className="text-xs font-black text-gray-900 block">
                      {new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'short' })}
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium">
                      {r.items.length} {r.items.length === 1 ? 'produto' : 'produtos'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-emerald-700 block">
                      {formatKg(r.totalPreparedNetWeight)}
                    </span>
                    <span className="text-[11px] font-bold text-amber-600 block">
                      Sobras: {formatKg(r.wasteNetWeight)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Merenda;
