import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  LayoutDashboard, Package, ShoppingBag, Receipt, Calculator, ClipboardCheck,
  Tags, Truck, CalendarRange, Target, Settings as SettingsIcon, Search,
  Plus, Trash2, Pencil, X, Download, AlertTriangle, CheckCircle2, Menu,
  ArrowUpRight, ArrowDownRight, PackageCheck,
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/*  CONSTANTS                                                              */
/* ---------------------------------------------------------------------- */

const BRANDS = ["Nike","Adidas","Ralph Lauren","Patagonia","The North Face","Columbia","Carhartt","Levi's","Tommy Hilfiger","Puma"];
const CATEGORIES = ["Fleeces","Jackets","Hoodies","T-Shirts","Jeans","Sportswear","Shoes","Accessories","Knitwear","Shirts"];
const SIZES = ["XS","S","M","L","XL","XXL"];
const COLORS = ["Black","Navy","Grey","Green","Red","Blue","Beige","White","Multi"];
const CONDITIONS = ["New with tags","Excellent","Very good","Good","Fair"];
const SUPPLIERS = ["Charity Shop","Car Boot Sale","Facebook Marketplace","Vintage Wholesale UK","Auction House","Clearance Outlet"];
const LOCATIONS = ["Rail A","Rail B","Box 1","Box 2","Loft Storage","Under Bed"];
const STATUSES = ["Not Listed","Listed","Reserved","Sold","Returned","Dead Stock"];
const EXPENSE_CATS = ["Packaging","Postage","Stock","Travel","Storage","Cleaning","Repairs","Subscriptions","Advertising","Equipment","Other"];
const CHART_COLORS = ["#2F6F52","#C77B2C","#3D7A8A","#8A5A44","#6E8B3D","#B3462C","#5B6B9E","#9C7A2E"];

const STORAGE_KEYS = {
  items: "resellr_items_v1",
  sales: "resellr_sales_v1",
  expenses: "resellr_expenses_v1",
  goals: "resellr_goals_v1",
  settings: "resellr_settings_v1",
};

const DEFAULT_GOALS = { revenue: 1800, profit: 750, sales: 40, listings: 35 };
const DEFAULT_SETTINGS = {
  businessName: "RESELLR",
  roiBuyThreshold: 80,
  roiConsiderThreshold: 30,
  ageWarn1: 30,
  ageWarn2: 60,
  ageWarn3: 90,
};

/* ---------------------------------------------------------------------- */
/*  UTILITIES                                                              */
/* ---------------------------------------------------------------------- */

const money = (n) => `£${(Number(n) || 0).toFixed(2)}`;
const pct = (n) => `${(Number(n) || 0).toFixed(1)}%`;
const uid = (p) => p + Math.random().toString(36).slice(2, 9);
const todayISO = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000));
const monthKey = (d) => (d || "").slice(0, 7);
const monthLabel = (key) => {
  if (!key) return "";
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-GB", { month: "short", year: "2-digit" });
};
const rand = (min, max) => Math.random() * (max - min) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const daysAgoISO = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

function totalItemCost(item) {
  return (Number(item.purchaseCost) || 0) + (Number(item.cleaningCost) || 0) +
    (Number(item.repairCost) || 0) + (Number(item.otherCost) || 0);
}

function downloadCSV(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------------------------------------------------------------------- */
/*  DEMO DATA GENERATOR                                                    */
/* ---------------------------------------------------------------------- */

function generateDemoData() {
  const items = [];
  const sales = [];
  const n = 34;

  for (let i = 0; i < n; i++) {
    const brand = pick(BRANDS);
    const category = pick(CATEGORIES);
    const purchaseCost = Number(rand(3, 26).toFixed(2));
    const cleaningCost = Math.random() < 0.35 ? Number(rand(1, 4).toFixed(2)) : 0;
    const repairCost = Math.random() < 0.15 ? Number(rand(2, 6).toFixed(2)) : 0;
    const otherCost = 0;
    const cost = purchaseCost + cleaningCost + repairCost + otherCost;
    const purchaseDaysAgo = Math.floor(rand(3, 165));
    const purchaseDate = daysAgoISO(purchaseDaysAgo);
    const listedDaysAgo = Math.max(0, purchaseDaysAgo - Math.floor(rand(0, 4)));
    const listedDate = daysAgoISO(listedDaysAgo);
    const markup = rand(1.9, 3.6);
    const listingPrice = Number((cost * markup).toFixed(2));

    const roll = Math.random();
    let status;
    if (roll < 0.56) status = "Sold";
    else if (roll < 0.76) status = "Listed";
    else if (roll < 0.86) status = "Not Listed";
    else if (roll < 0.93) status = "Reserved";
    else if (roll < 0.97) status = "Dead Stock";
    else status = "Returned";

    const item = {
      id: uid("itm_"),
      name: `${brand} ${category.slice(0, -1) || category}`,
      brand, category,
      subcategory: "",
      size: pick(SIZES),
      color: pick(COLORS),
      condition: pick(CONDITIONS),
      purchaseDate, purchaseCost, cleaningCost, repairCost, otherCost,
      supplier: pick(SUPPLIERS),
      location: pick(LOCATIONS),
      listedDate: status === "Not Listed" ? "" : listedDate,
      listingPrice,
      status,
      notes: "",
    };
    items.push(item);

    if (status === "Sold") {
      const maxSellDaysAgo = Math.max(1, purchaseDaysAgo - 1);
      const soldDaysAgo = Math.floor(rand(0, Math.min(maxSellDaysAgo, 60)));
      const saleDate = daysAgoISO(soldDaysAgo);
      const salePrice = Number((listingPrice * rand(0.85, 1.05)).toFixed(2));
      sales.push({
        id: uid("sale_"),
        itemId: item.id,
        saleDate,
        salePrice,
        additionalCosts: 0,
        packagingCost: Number(rand(0.3, 1.2).toFixed(2)),
        postageCost: Number(rand(2.5, 4.5).toFixed(2)),
        platformFees: 0,
      });
    }
  }

  const expenses = [];
  const expN = 26;
  for (let i = 0; i < expN; i++) {
    const category = pick(EXPENSE_CATS.filter((c) => c !== "Stock"));
    const amount = Number(rand(3, 45).toFixed(2));
    expenses.push({
      id: uid("exp_"),
      date: daysAgoISO(Math.floor(rand(0, 160))),
      category,
      description: `${category} - routine`,
      amount,
      supplier: "",
      notes: "",
    });
  }

  return { items, sales, expenses };
}

/* ---------------------------------------------------------------------- */
/*  SMALL UI PRIMITIVES                                                    */
/* ---------------------------------------------------------------------- */

function StatusBadge({ status }) {
  const map = {
    "Not Listed": "badge-grey",
    "Listed": "badge-blue",
    "Reserved": "badge-amber",
    "Sold": "badge-green",
    "Returned": "badge-red",
    "Dead Stock": "badge-red",
  };
  return <span className={`badge ${map[status] || "badge-grey"}`}>{status}</span>;
}

function RoiBadge({ value, settings }) {
  const v = Number(value) || 0;
  let cls = "badge-red";
  if (v >= settings.roiBuyThreshold) cls = "badge-green";
  else if (v >= settings.roiConsiderThreshold) cls = "badge-amber";
  return <span className={`badge ${cls}`}>{pct(v)}</span>;
}

function KpiCard({ label, value, sub, trend }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub != null && (
        <div className={`kpi-trend ${trend === "up" ? "trend-up" : trend === "down" ? "trend-down" : ""}`}>
          {trend === "up" && <ArrowUpRight size={13} />}
          {trend === "down" && <ArrowDownRight size={13} />}
          <span>{sub}</span>
        </div>
      )}
    </div>
  );
}

function Panel({ title, action, children, className = "" }) {
  return (
    <div className={`panel ${className}`}>
      {title && (
        <div className="panel-head">
          <h3>{title}</h3>
          {action}
        </div>
      )}
      <div className="panel-body">{children}</div>
    </div>
  );
}

function ProgressBar({ value, max, colorClass = "" }) {
  const p = clamp(max > 0 ? (value / max) * 100 : 0, 0, 100);
  return (
    <div className="progress-track">
      <div className={`progress-fill ${colorClass}`} style={{ width: `${p}%` }} />
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${wide ? "modal-wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

/* ---------------------------------------------------------------------- */
/*  MAIN APP                                                               */
/* ---------------------------------------------------------------------- */

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "inventory", label: "Inventory", icon: Package },
  { key: "sales", label: "Sales", icon: ShoppingBag },
  { key: "expenses", label: "Expenses", icon: Receipt },
  { key: "buypass", label: "Buy or Pass", icon: ClipboardCheck },
  { key: "pricing", label: "Pricing calculator", icon: Calculator },
  { key: "brands", label: "Brands", icon: Tags },
  { key: "suppliers", label: "Suppliers", icon: Truck },
  { key: "monthly", label: "Monthly performance", icon: CalendarRange },
  { key: "goals", label: "Goals", icon: Target },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

export default function App() {
  const [items, setItems] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [goals, setGoals] = useState(DEFAULT_GOALS);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [navOpen, setNavOpen] = useState(false);

  const [itemModal, setItemModal] = useState(null); // {mode:'add'|'edit', item}
  const [sellModal, setSellModal] = useState(null); // item to mark sold
  const [expenseModal, setExpenseModal] = useState(null);
  const [toast, setToast] = useState("");

  const skipSave = useRef(true);

  /* ---- load from localStorage on first mount ----
     Each buyer's data lives only in their own browser, under these keys.
     If you later add a real backend, this is the only block you need to swap out. */
  useEffect(() => {
    let li = null, ls = null, le = null, lg = null, lst = null;
    try { const v = localStorage.getItem(STORAGE_KEYS.items); li = v ? JSON.parse(v) : null; } catch (e) {}
    try { const v = localStorage.getItem(STORAGE_KEYS.sales); ls = v ? JSON.parse(v) : null; } catch (e) {}
    try { const v = localStorage.getItem(STORAGE_KEYS.expenses); le = v ? JSON.parse(v) : null; } catch (e) {}
    try { const v = localStorage.getItem(STORAGE_KEYS.goals); lg = v ? JSON.parse(v) : null; } catch (e) {}
    try { const v = localStorage.getItem(STORAGE_KEYS.settings); lst = v ? JSON.parse(v) : null; } catch (e) {}

    if (li && ls && le) {
      setItems(li); setSales(ls); setExpenses(le);
    } else {
      const demo = generateDemoData();
      setItems(demo.items); setSales(demo.sales); setExpenses(demo.expenses);
    }
    if (lg) setGoals(lg);
    if (lst) setSettings({ ...DEFAULT_SETTINGS, ...lst });
    setLoaded(true);
    setTimeout(() => { skipSave.current = false; }, 0);
  }, []);

  /* ---- persist on change ---- */
  useEffect(() => { if (!skipSave.current) { try { localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(items)); } catch (e) {} } }, [items]);
  useEffect(() => { if (!skipSave.current) { try { localStorage.setItem(STORAGE_KEYS.sales, JSON.stringify(sales)); } catch (e) {} } }, [sales]);
  useEffect(() => { if (!skipSave.current) { try { localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(expenses)); } catch (e) {} } }, [expenses]);
  useEffect(() => { if (!skipSave.current) { try { localStorage.setItem(STORAGE_KEYS.goals, JSON.stringify(goals)); } catch (e) {} } }, [goals]);
  useEffect(() => { if (!skipSave.current) { try { localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings)); } catch (e) {} } }, [settings]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  /* ---- CRUD ---- */
  function saveItem(data) {
    if (data.id) {
      setItems((prev) => prev.map((it) => (it.id === data.id ? data : it)));
      showToast("Item updated");
    } else {
      setItems((prev) => [...prev, { ...data, id: uid("itm_") }]);
      showToast("Item added");
    }
    setItemModal(null);
  }
  function deleteItem(id) {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setSales((prev) => prev.filter((s) => s.itemId !== id));
    showToast("Item deleted");
  }
  function completeSale(itemId, saleData) {
    setSales((prev) => [...prev, { ...saleData, id: uid("sale_"), itemId }]);
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, status: "Sold" } : it)));
    setSellModal(null);
    showToast("Sale recorded");
  }
  function deleteSale(saleId, itemId) {
    setSales((prev) => prev.filter((s) => s.id !== saleId));
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, status: "Listed" } : it)));
    showToast("Sale removed");
  }
  function saveExpense(data) {
    if (data.id) setExpenses((prev) => prev.map((e) => (e.id === data.id ? data : e)));
    else setExpenses((prev) => [...prev, { ...data, id: uid("exp_") }]);
    setExpenseModal(null);
    showToast("Expense saved");
  }
  function deleteExpense(id) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    showToast("Expense deleted");
  }
  function clearDemoAndReset() {
    if (!window.confirm("This clears all items, sales and expenses and starts empty. Continue?")) return;
    setItems([]); setSales([]); setExpenses([]);
    showToast("Data cleared");
  }
  function reloadDemoData() {
    if (!window.confirm("This replaces current data with fresh demo data. Continue?")) return;
    const demo = generateDemoData();
    setItems(demo.items); setSales(demo.sales); setExpenses(demo.expenses);
    showToast("Demo data loaded");
  }

  /* ---------------------------------------------------------------------- */
  /*  DERIVED / COMPUTED DATA                                                */
  /* ---------------------------------------------------------------------- */

  const itemsById = useMemo(() => Object.fromEntries(items.map((it) => [it.id, it])), [items]);

  const itemsCalc = useMemo(() => items.map((it) => {
    const cost = totalItemCost(it);
    const daysListed = it.status === "Sold" || it.status === "Returned" ? null : daysBetween(it.listedDate || it.purchaseDate, todayISO());
    const potentialProfit = (Number(it.listingPrice) || 0) - cost;
    const potentialROI = cost > 0 ? (potentialProfit / cost) * 100 : 0;
    return { ...it, totalCost: cost, daysListed, potentialProfit, potentialROI };
  }), [items]);

  const salesCalc = useMemo(() => sales.map((s) => {
    const item = itemsById[s.itemId];
    const cost = item ? totalItemCost(item) : 0;
    const extra = (Number(s.additionalCosts) || 0) + (Number(s.packagingCost) || 0) + (Number(s.postageCost) || 0) + (Number(s.platformFees) || 0);
    const profit = (Number(s.salePrice) || 0) - cost - extra;
    const margin = s.salePrice > 0 ? (profit / s.salePrice) * 100 : 0;
    const roi = cost > 0 ? (profit / cost) * 100 : 0;
    const daysToSell = item ? daysBetween(item.purchaseDate, s.saleDate) : 0;
    return { ...s, item, totalCost: cost, extra, profit, margin, roi, daysToSell };
  }), [sales, itemsById]);

  const activeStatuses = ["Not Listed", "Listed", "Reserved"];
  const activeItems = useMemo(() => itemsCalc.filter((it) => activeStatuses.includes(it.status)), [itemsCalc]);
  const soldItems = useMemo(() => itemsCalc.filter((it) => it.status === "Sold"), [itemsCalc]);

  const totals = useMemo(() => {
    const totalRevenue = salesCalc.reduce((a, s) => a + (Number(s.salePrice) || 0), 0);
    const totalProfit = salesCalc.reduce((a, s) => a + s.profit, 0);
    const totalExpenses = expenses.reduce((a, e) => a + (Number(e.amount) || 0), 0);
    const itemsSold = salesCalc.length;
    const avgSalePrice = itemsSold ? totalRevenue / itemsSold : 0;
    const avgProfit = itemsSold ? totalProfit / itemsSold : 0;
    const avgROI = itemsSold ? salesCalc.reduce((a, s) => a + s.roi, 0) / itemsSold : 0;
    const stockValue = activeItems.reduce((a, it) => a + it.totalCost, 0);
    const stockPotentialValue = activeItems.reduce((a, it) => a + (Number(it.listingPrice) || 0), 0);
    const activeCount = activeItems.length;
    const sellThrough = (itemsSold + activeCount) > 0 ? (itemsSold / (itemsSold + activeCount)) * 100 : 0;
    return { totalRevenue, totalProfit, totalExpenses, itemsSold, avgSalePrice, avgProfit, avgROI, stockValue, stockPotentialValue, activeCount, sellThrough };
  }, [salesCalc, activeItems, expenses]);

  const monthlyStats = useMemo(() => {
    const map = {};
    salesCalc.forEach((s) => {
      const k = monthKey(s.saleDate);
      if (!k) return;
      if (!map[k]) map[k] = { key: k, revenue: 0, profit: 0, sales: 0, roiSum: 0 };
      map[k].revenue += Number(s.salePrice) || 0;
      map[k].profit += s.profit;
      map[k].sales += 1;
      map[k].roiSum += s.roi;
    });
    items.forEach((it) => {
      const k = monthKey(it.purchaseDate);
      if (!k) return;
      if (!map[k]) map[k] = { key: k, revenue: 0, profit: 0, sales: 0, roiSum: 0, spend: 0, listings: 0 };
      map[k].spend = (map[k].spend || 0) + totalItemCost(it);
      map[k].listings = (map[k].listings || 0) + 1;
    });
    expenses.forEach((e) => {
      const k = monthKey(e.date);
      if (!k) return;
      if (!map[k]) map[k] = { key: k, revenue: 0, profit: 0, sales: 0, roiSum: 0 };
      map[k].expenses = (map[k].expenses || 0) + (Number(e.amount) || 0);
    });
    const list = Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
    return list.map((m) => ({
      ...m,
      avgSalePrice: m.sales ? m.revenue / m.sales : 0,
      avgROI: m.sales ? m.roiSum / m.sales : 0,
    }));
  }, [salesCalc, items, expenses]);

  const thisMonthKey = monthKey(todayISO());
  const last6Months = monthlyStats.slice(-6);
  const thisMonth = monthlyStats.find((m) => m.key === thisMonthKey) || { revenue: 0, profit: 0, sales: 0 };
  const prevMonthKey = (() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  })();
  const prevMonth = monthlyStats.find((m) => m.key === prevMonthKey) || { revenue: 0, profit: 0, sales: 0 };
  const changePct = (curr, prev) => (prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0);

  function groupStats(keyFn) {
    const map = {};
    itemsCalc.forEach((it) => {
      const k = keyFn(it);
      if (!k) return;
      if (!map[k]) map[k] = { key: k, bought: 0, spend: 0, sold: 0, revenue: 0, profit: 0, roiSum: 0, daysSum: 0, active: 0 };
      map[k].bought += 1;
      map[k].spend += it.totalCost;
      if (activeStatuses.includes(it.status)) map[k].active += 1;
    });
    salesCalc.forEach((s) => {
      if (!s.item) return;
      const k = keyFn(s.item);
      if (!k || !map[k]) return;
      map[k].sold += 1;
      map[k].revenue += Number(s.salePrice) || 0;
      map[k].profit += s.profit;
      map[k].roiSum += s.roi;
      map[k].daysSum += s.daysToSell;
    });
    return Object.values(map).map((g) => ({
      ...g,
      avgSalePrice: g.sold ? g.revenue / g.sold : 0,
      avgProfit: g.sold ? g.profit / g.sold : 0,
      avgROI: g.sold ? g.roiSum / g.sold : 0,
      avgDaysToSell: g.sold ? g.daysSum / g.sold : 0,
      sellThrough: (g.sold + g.active) > 0 ? (g.sold / (g.sold + g.active)) * 100 : 0,
    }));
  }

  const brandStats = useMemo(() => groupStats((it) => it.brand).sort((a, b) => b.profit - a.profit), [itemsCalc, salesCalc]);
  const categoryStats = useMemo(() => groupStats((it) => it.category).sort((a, b) => b.profit - a.profit), [itemsCalc, salesCalc]);
  const supplierStats = useMemo(() => groupStats((it) => it.supplier).sort((a, b) => b.profit - a.profit), [itemsCalc, salesCalc]);

  const attentionItems = useMemo(() => {
    return activeItems.filter((it) =>
      (it.daysListed != null && it.daysListed >= settings.ageWarn1) ||
      (it.listingPrice > 0 && it.potentialROI < settings.roiConsiderThreshold)
    ).sort((a, b) => (b.daysListed || 0) - (a.daysListed || 0));
  }, [activeItems, settings]);

  const agedBuckets = useMemo(() => {
    const b = { fresh: 0, w1: 0, w2: 0, w3: 0 };
    activeItems.forEach((it) => {
      const d = it.daysListed || 0;
      if (d >= settings.ageWarn3) b.w3 += it.totalCost;
      else if (d >= settings.ageWarn2) b.w2 += it.totalCost;
      else if (d >= settings.ageWarn1) b.w1 += it.totalCost;
      else b.fresh += it.totalCost;
    });
    return b;
  }, [activeItems, settings]);

  const businessHealth = useMemo(() => {
    const avgMargin = totals.itemsSold ? salesCalc.reduce((a, s) => a + s.margin, 0) / totals.itemsSold : 0;
    const marginScore = clamp((avgMargin / 40) * 100, 0, 100) * 0.25;
    const roiScore = clamp((totals.avgROI / 100) * 100, 0, 100) * 0.25;
    const sellScore = clamp((totals.sellThrough / 65) * 100, 0, 100) * 0.2;
    const agedRatio = totals.stockValue > 0 ? agedBuckets.w3 / totals.stockValue : 0;
    const agedScore = clamp((1 - agedRatio) * 100, 0, 100) * 0.15;
    const goalScore = clamp((thisMonth.profit / (goals.profit || 1)) * 100, 0, 100) * 0.15;
    const score = Math.round(marginScore + roiScore + sellScore + agedScore + goalScore);
    let label = "Needs attention", cls = "health-red";
    if (score >= 85) { label = "Excellent"; cls = "health-green"; }
    else if (score >= 70) { label = "Very good"; cls = "health-green"; }
    else if (score >= 55) { label = "Good"; cls = "health-amber"; }
    else if (score >= 40) { label = "Fair"; cls = "health-amber"; }
    return { score: clamp(score, 0, 100), label, cls, avgMargin };
  }, [totals, salesCalc, agedBuckets, thisMonth, goals]);

  const categoryPie = useMemo(() => categoryStats.filter((c) => c.revenue > 0).map((c) => ({ name: c.key, value: Number(c.revenue.toFixed(2)) })), [categoryStats]);

  /* ---------------------------------------------------------------------- */

  if (!loaded) {
    return <div className="loading-screen">Loading your business data…</div>;
  }

  return (
    <div className="app">
      <style>{STYLES}</style>

      <aside className={`sidebar ${navOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">R</div>
          <div>
            <div className="brand-name">{settings.businessName || "RESELLR"}</div>
            <div className="brand-sub">Command centre</div>
          </div>
        </div>
        <nav>
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <button
                key={n.key}
                className={`nav-item ${page === n.key ? "nav-active" : ""}`}
                onClick={() => { setPage(n.key); setNavOpen(false); }}
              >
                <Icon size={17} />
                <span>{n.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn mobile-only" onClick={() => setNavOpen((v) => !v)}><Menu size={20} /></button>
          <h1>{NAV.find((n) => n.key === page)?.label}</h1>
          <div className="topbar-health">
            <span className={`health-pill ${businessHealth.cls}`}>Health {businessHealth.score}/100</span>
          </div>
        </header>

        <main className="content">
          {page === "dashboard" && (
            <DashboardPage
              totals={totals} settings={settings} goals={goals} thisMonth={thisMonth} prevMonth={prevMonth}
              changePct={changePct} last6Months={last6Months} brandStats={brandStats} categoryPie={categoryPie}
              agedBuckets={agedBuckets} businessHealth={businessHealth} attentionItems={attentionItems}
              salesCalc={salesCalc} setPage={setPage}
            />
          )}
          {page === "inventory" && (
            <InventoryPage
              itemsCalc={itemsCalc} settings={settings}
              onAdd={() => setItemModal({ mode: "add" })}
              onEdit={(it) => setItemModal({ mode: "edit", item: it })}
              onDelete={deleteItem}
              onSell={(it) => setSellModal(it)}
              onExport={() => downloadCSV("inventory.csv", itemsCalc.map((it) => ({
                Name: it.name, Brand: it.brand, Category: it.category, Size: it.size, Condition: it.condition,
                PurchaseDate: it.purchaseDate, PurchaseCost: it.purchaseCost, TotalCost: it.totalCost.toFixed(2),
                Supplier: it.supplier, ListedDate: it.listedDate, ListingPrice: it.listingPrice, Status: it.status,
                DaysListed: it.daysListed ?? "", PotentialProfit: it.potentialProfit.toFixed(2), PotentialROI: it.potentialROI.toFixed(1),
              })))}
            />
          )}
          {page === "sales" && (
            <SalesPage
              salesCalc={salesCalc} settings={settings} onDelete={deleteSale}
              onExport={() => downloadCSV("sales.csv", salesCalc.map((s) => ({
                ItemName: s.item?.name || "(deleted item)", Brand: s.item?.brand || "", SaleDate: s.saleDate,
                SalePrice: s.salePrice, TotalCost: s.totalCost.toFixed(2), ExtraCosts: s.extra.toFixed(2),
                Profit: s.profit.toFixed(2), MarginPct: s.margin.toFixed(1), RoiPct: s.roi.toFixed(1), DaysToSell: s.daysToSell,
              })))}
            />
          )}
          {page === "expenses" && (
            <ExpensesPage
              expenses={expenses}
              onAdd={() => setExpenseModal({ mode: "add" })}
              onEdit={(e) => setExpenseModal({ mode: "edit", expense: e })}
              onDelete={deleteExpense}
              onExport={() => downloadCSV("expenses.csv", expenses)}
            />
          )}
          {page === "buypass" && <BuyPassPage settings={settings} />}
          {page === "pricing" && <PricingCalculatorPage />}
          {page === "brands" && <RankPage title="Brand performance" stats={brandStats} settings={settings} />}
          {page === "suppliers" && <RankPage title="Supplier performance" stats={supplierStats} settings={settings} isSupplier />}
          {page === "monthly" && <MonthlyPage monthlyStats={monthlyStats} thisMonth={thisMonth} prevMonth={prevMonth} changePct={changePct} />}
          {page === "goals" && <GoalsPage goals={goals} setGoals={setGoals} thisMonth={thisMonth} totals={totals} />}
          {page === "settings" && (
            <SettingsPage
              settings={settings} setSettings={setSettings}
              onClear={clearDemoAndReset} onReload={reloadDemoData}
              onExportAll={() => {
                downloadCSV("inventory.csv", itemsCalc);
                downloadCSV("sales.csv", salesCalc.map(({ item, ...s }) => s));
                downloadCSV("expenses.csv", expenses);
              }}
            />
          )}
        </main>
      </div>

      {itemModal && (
        <ItemModal
          initial={itemModal.item}
          onClose={() => setItemModal(null)}
          onSave={saveItem}
        />
      )}
      {sellModal && (
        <SellModal
          item={sellModal}
          onClose={() => setSellModal(null)}
          onConfirm={(saleData) => completeSale(sellModal.id, saleData)}
        />
      )}
      {expenseModal && (
        <ExpenseModal
          initial={expenseModal.expense}
          onClose={() => setExpenseModal(null)}
          onSave={saveExpense}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  DASHBOARD                                                              */
/* ---------------------------------------------------------------------- */

function DashboardPage({ totals, settings, goals, thisMonth, prevMonth, changePct, last6Months, brandStats, categoryPie, agedBuckets, businessHealth, attentionItems, salesCalc, setPage }) {
  const revChange = changePct(thisMonth.revenue, prevMonth.revenue);
  const topBrands = brandStats.slice(0, 6).map((b) => ({ name: b.key, Profit: Number(b.profit.toFixed(2)) }));
  const recentSales = [...salesCalc].sort((a, b) => (b.saleDate || "").localeCompare(a.saleDate || "")).slice(0, 6);

  return (
    <div className="stack">
      <div className="kpi-grid">
        <KpiCard label="Total revenue" value={money(totals.totalRevenue)} sub={`${revChange >= 0 ? "+" : ""}${revChange.toFixed(0)}% vs last month`} trend={revChange >= 0 ? "up" : "down"} />
        <KpiCard label="Total profit" value={money(totals.totalProfit)} />
        <KpiCard label="Active stock" value={totals.activeCount} sub={`${money(totals.stockValue)} invested`} />
        <KpiCard label="Stock value (cost)" value={money(totals.stockValue)} sub={`${money(totals.stockPotentialValue)} potential`} />
        <KpiCard label="Items sold" value={totals.itemsSold} />
        <KpiCard label="Avg sale price" value={money(totals.avgSalePrice)} />
        <KpiCard label="Avg profit / sale" value={money(totals.avgProfit)} />
        <KpiCard label="Avg ROI" value={pct(totals.avgROI)} />
        <KpiCard label="Sell-through rate" value={pct(totals.sellThrough)} />
        <KpiCard label="This month's profit" value={money(thisMonth.profit)} sub={`Goal ${money(goals.profit)}`} />
      </div>

      <div className="grid-2">
        <Panel title="Revenue & profit — last 6 months">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={last6Months.map((m) => ({ month: monthLabel(m.key), Revenue: Number(m.revenue.toFixed(2)), Profit: Number(m.profit.toFixed(2)) }))}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" stroke="var(--ink-soft)" fontSize={12} />
              <YAxis stroke="var(--ink-soft)" fontSize={12} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 4, fontSize: 13 }} />
              <Legend />
              <Line type="monotone" dataKey="Revenue" stroke="#3D7A8A" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Profit" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Business health">
          <div className="health-block">
            <div className={`health-score ${businessHealth.cls}`}>{businessHealth.score}</div>
            <div className="health-label">{businessHealth.label}</div>
          </div>
          <ul className="health-tips">
            {businessHealth.avgMargin < 40 && <li>Average margin is {pct(businessHealth.avgMargin)} — aim for 40%+ by sourcing lower and pricing firmer.</li>}
            {totals.sellThrough < 65 && <li>Sell-through is {pct(totals.sellThrough)} — list faster or reduce prices on slow stock.</li>}
            {agedBuckets.w3 > 0 && <li>{money(agedBuckets.w3)} tied up in stock listed {settings.ageWarn3}+ days — consider a price drop.</li>}
            {thisMonth.profit < goals.profit && <li>{money(goals.profit - thisMonth.profit)} short of this month's profit goal.</li>}
          </ul>
        </Panel>
      </div>

      <div className="grid-2">
        <Panel title="Top brands by profit">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topBrands} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" stroke="var(--ink-soft)" fontSize={12} />
              <YAxis type="category" dataKey="name" stroke="var(--ink-soft)" fontSize={12} width={100} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 4, fontSize: 13 }} />
              <Bar dataKey="Profit" fill="var(--accent)" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Revenue share by category">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={categoryPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {categoryPie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 4, fontSize: 13 }} formatter={(v) => money(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid-2">
        <Panel title="Items needing attention" action={<span className="muted-count">{attentionItems.length}</span>}>
          {attentionItems.length === 0 ? (
            <div className="empty-state"><CheckCircle2 size={18} /> Nothing needs attention right now.</div>
          ) : (
            <table className="table compact">
              <thead><tr><th>Item</th><th>Days listed</th><th>Potential ROI</th></tr></thead>
              <tbody>
                {attentionItems.slice(0, 8).map((it) => (
                  <tr key={it.id}>
                    <td>{it.name} <span className="cell-sub">{it.brand}</span></td>
                    <td>{it.daysListed != null ? `${it.daysListed}d` : "—"}</td>
                    <td><RoiBadge value={it.potentialROI} settings={settings} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button className="link-btn" onClick={() => setPage("inventory")}>View full inventory →</button>
        </Panel>

        <Panel title="Recent sales">
          <table className="table compact">
            <thead><tr><th>Item</th><th>Date</th><th>Price</th><th>Profit</th></tr></thead>
            <tbody>
              {recentSales.map((s) => (
                <tr key={s.id}>
                  <td>{s.item?.name || "(deleted)"} <span className="cell-sub">{s.item?.brand}</span></td>
                  <td>{s.saleDate}</td>
                  <td>{money(s.salePrice)}</td>
                  <td className={s.profit >= 0 ? "text-green" : "text-red"}>{money(s.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  INVENTORY                                                              */
/* ---------------------------------------------------------------------- */

function InventoryPage({ itemsCalc, settings, onAdd, onEdit, onDelete, onSell, onExport }) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [brandFilter, setBrandFilter] = useState("All");
  const [sortBy, setSortBy] = useState("purchaseDate");
  const [sortDir, setSortDir] = useState("desc");

  const filtered = useMemo(() => {
    let list = itemsCalc.filter((it) => {
      if (statusFilter !== "All" && it.status !== statusFilter) return false;
      if (brandFilter !== "All" && it.brand !== brandFilter) return false;
      if (q && !(`${it.name} ${it.brand} ${it.category} ${it.supplier}`.toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    });
    list.sort((a, b) => {
      const av = a[sortBy], bv = b[sortBy];
      let cmp;
      if (typeof av === "number" || typeof bv === "number") cmp = (Number(av) || 0) - (Number(bv) || 0);
      else cmp = String(av || "").localeCompare(String(bv || ""));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [itemsCalc, q, statusFilter, brandFilter, sortBy, sortDir]);

  function toggleSort(col) {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("desc"); }
  }

  return (
    <div className="stack">
      <div className="toolbar">
        <div className="search-box">
          <Search size={15} />
          <input placeholder="Search name, brand, category, supplier…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>All</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
          <option>All</option>
          {BRANDS.map((b) => <option key={b}>{b}</option>)}
        </select>
        <div className="spacer" />
        <button className="btn-ghost" onClick={onExport}><Download size={15} /> Export CSV</button>
        <button className="btn-primary" onClick={onAdd}><Plus size={15} /> Add item</button>
      </div>

      <Panel>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th onClick={() => toggleSort("name")} className="sortable">Item</th>
                <th onClick={() => toggleSort("brand")} className="sortable">Brand</th>
                <th onClick={() => toggleSort("category")} className="sortable">Category</th>
                <th>Size</th>
                <th onClick={() => toggleSort("totalCost")} className="sortable">Cost</th>
                <th onClick={() => toggleSort("listingPrice")} className="sortable">List price</th>
                <th onClick={() => toggleSort("potentialProfit")} className="sortable">Pot. profit</th>
                <th onClick={() => toggleSort("potentialROI")} className="sortable">Pot. ROI</th>
                <th onClick={() => toggleSort("daysListed")} className="sortable">Days listed</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => {
                const aged = it.daysListed != null && it.daysListed >= settings.ageWarn3;
                const agedWarn = it.daysListed != null && it.daysListed >= settings.ageWarn1 && !aged;
                return (
                  <tr key={it.id} className={aged ? "row-danger" : agedWarn ? "row-warn" : ""}>
                    <td>{it.name}<div className="cell-sub">{it.condition}</div></td>
                    <td>{it.brand}</td>
                    <td>{it.category}</td>
                    <td>{it.size}</td>
                    <td>{money(it.totalCost)}</td>
                    <td>{money(it.listingPrice)}</td>
                    <td className={it.potentialProfit >= 0 ? "text-green" : "text-red"}>{money(it.potentialProfit)}</td>
                    <td><RoiBadge value={it.potentialROI} settings={settings} /></td>
                    <td>{it.daysListed != null ? `${it.daysListed}d` : "—"}</td>
                    <td><StatusBadge status={it.status} /></td>
                    <td className="row-actions">
                      {it.status !== "Sold" && <button className="icon-btn" title="Mark sold" onClick={() => onSell(it)}><PackageCheck size={15} /></button>}
                      <button className="icon-btn" title="Edit" onClick={() => onEdit(it)}><Pencil size={15} /></button>
                      <button className="icon-btn" title="Delete" onClick={() => { if (window.confirm("Delete this item?")) onDelete(it.id); }}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={11} className="empty-cell">No items match your filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function ItemModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial || {
    name: "", brand: BRANDS[0], category: CATEGORIES[0], subcategory: "", size: SIZES[0], color: COLORS[0],
    condition: CONDITIONS[0], purchaseDate: todayISO(), purchaseCost: "", cleaningCost: "", repairCost: "", otherCost: "",
    supplier: SUPPLIERS[0], location: LOCATIONS[0], listedDate: "", listingPrice: "", status: "Not Listed", notes: "",
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Modal title={initial ? "Edit item" : "Add item"} onClose={onClose} wide>
      <div className="form-grid">
        <Field label="Item name"><input value={form.name} onChange={set("name")} placeholder="e.g. Nike Fleece" /></Field>
        <Field label="Brand"><select value={form.brand} onChange={set("brand")}>{BRANDS.map((b) => <option key={b}>{b}</option>)}</select></Field>
        <Field label="Category"><select value={form.category} onChange={set("category")}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Subcategory"><input value={form.subcategory} onChange={set("subcategory")} /></Field>
        <Field label="Size"><select value={form.size} onChange={set("size")}>{SIZES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Colour"><select value={form.color} onChange={set("color")}>{COLORS.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Condition"><select value={form.condition} onChange={set("condition")}>{CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Status"><select value={form.status} onChange={set("status")}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Purchase date"><input type="date" value={form.purchaseDate} onChange={set("purchaseDate")} /></Field>
        <Field label="Purchase cost (£)"><input type="number" step="0.01" value={form.purchaseCost} onChange={set("purchaseCost")} /></Field>
        <Field label="Cleaning cost (£)"><input type="number" step="0.01" value={form.cleaningCost} onChange={set("cleaningCost")} /></Field>
        <Field label="Repair cost (£)"><input type="number" step="0.01" value={form.repairCost} onChange={set("repairCost")} /></Field>
        <Field label="Other cost (£)"><input type="number" step="0.01" value={form.otherCost} onChange={set("otherCost")} /></Field>
        <Field label="Supplier"><select value={form.supplier} onChange={set("supplier")}>{SUPPLIERS.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Storage location"><select value={form.location} onChange={set("location")}>{LOCATIONS.map((l) => <option key={l}>{l}</option>)}</select></Field>
        <Field label="Date listed"><input type="date" value={form.listedDate} onChange={set("listedDate")} /></Field>
        <Field label="Listing price (£)"><input type="number" step="0.01" value={form.listingPrice} onChange={set("listingPrice")} /></Field>
        <Field label="Notes"><input value={form.notes} onChange={set("notes")} /></Field>
      </div>
      <div className="modal-actions">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => onSave({ ...form, id: initial?.id })}>Save item</button>
      </div>
    </Modal>
  );
}

function SellModal({ item, onClose, onConfirm }) {
  const [form, setForm] = useState({
    saleDate: todayISO(), salePrice: item.listingPrice || "", additionalCosts: "", packagingCost: "", postageCost: "", platformFees: "",
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const cost = totalItemCost(item);
  const extra = (Number(form.additionalCosts) || 0) + (Number(form.packagingCost) || 0) + (Number(form.postageCost) || 0) + (Number(form.platformFees) || 0);
  const profit = (Number(form.salePrice) || 0) - cost - extra;

  return (
    <Modal title={`Mark "${item.name}" as sold`} onClose={onClose}>
      <div className="form-grid">
        <Field label="Sale date"><input type="date" value={form.saleDate} onChange={set("saleDate")} /></Field>
        <Field label="Sale price (£)"><input type="number" step="0.01" value={form.salePrice} onChange={set("salePrice")} /></Field>
        <Field label="Additional costs (£)"><input type="number" step="0.01" value={form.additionalCosts} onChange={set("additionalCosts")} /></Field>
        <Field label="Packaging cost (£)"><input type="number" step="0.01" value={form.packagingCost} onChange={set("packagingCost")} /></Field>
        <Field label="Postage cost (£)"><input type="number" step="0.01" value={form.postageCost} onChange={set("postageCost")} /></Field>
        <Field label="Platform fees (£)"><input type="number" step="0.01" value={form.platformFees} onChange={set("platformFees")} /></Field>
      </div>
      <div className="calc-preview">
        <div>Item cost: <strong>{money(cost)}</strong></div>
        <div>Profit: <strong className={profit >= 0 ? "text-green" : "text-red"}>{money(profit)}</strong></div>
      </div>
      <div className="modal-actions">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => onConfirm(form)}>Confirm sale</button>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------------- */
/*  SALES                                                                   */
/* ---------------------------------------------------------------------- */

function SalesPage({ salesCalc, settings, onDelete, onExport }) {
  const [q, setQ] = useState("");
  const sorted = useMemo(() => {
    return [...salesCalc]
      .filter((s) => !q || `${s.item?.name} ${s.item?.brand}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => (b.saleDate || "").localeCompare(a.saleDate || ""));
  }, [salesCalc, q]);

  return (
    <div className="stack">
      <div className="toolbar">
        <div className="search-box"><Search size={15} /><input placeholder="Search sales…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="spacer" />
        <button className="btn-ghost" onClick={onExport}><Download size={15} /> Export CSV</button>
      </div>
      <Panel>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr><th>Item</th><th>Brand</th><th>Sale date</th><th>Sale price</th><th>Cost</th><th>Extra costs</th><th>Profit</th><th>Margin</th><th>ROI</th><th>Days to sell</th><th></th></tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.id}>
                  <td>{s.item?.name || "(deleted item)"}</td>
                  <td>{s.item?.brand || "—"}</td>
                  <td>{s.saleDate}</td>
                  <td>{money(s.salePrice)}</td>
                  <td>{money(s.totalCost)}</td>
                  <td>{money(s.extra)}</td>
                  <td className={s.profit >= 0 ? "text-green" : "text-red"}>{money(s.profit)}</td>
                  <td>{pct(s.margin)}</td>
                  <td><RoiBadge value={s.roi} settings={settings} /></td>
                  <td>{s.daysToSell}d</td>
                  <td><button className="icon-btn" title="Undo sale" onClick={() => { if (window.confirm("Remove this sale and return item to Listed?")) onDelete(s.id, s.itemId); }}><Trash2 size={15} /></button></td>
                </tr>
              ))}
              {sorted.length === 0 && <tr><td colSpan={11} className="empty-cell">No sales recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  EXPENSES                                                                */
/* ---------------------------------------------------------------------- */

function ExpensesPage({ expenses, onAdd, onEdit, onDelete, onExport }) {
  const byCat = useMemo(() => {
    const map = {};
    expenses.forEach((e) => { map[e.category] = (map[e.category] || 0) + (Number(e.amount) || 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value: Number(value.toFixed(2)) })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  const total = expenses.reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const thisMonth = expenses.filter((e) => monthKey(e.date) === thisMk()).reduce((a, e) => a + (Number(e.amount) || 0), 0);
  function thisMk() { return todayISO().slice(0, 7); }

  const sorted = [...expenses].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return (
    <div className="stack">
      <div className="kpi-grid kpi-grid-3">
        <KpiCard label="Total expenses" value={money(total)} />
        <KpiCard label="This month" value={money(thisMonth)} />
        <KpiCard label="Entries logged" value={expenses.length} />
      </div>
      <div className="grid-2">
        <Panel title="Expense breakdown">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={byCat} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                {byCat.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => money(v)} contentStyle={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 4, fontSize: 13 }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Add / manage expenses" action={<button className="btn-primary" onClick={onAdd}><Plus size={15} /> Add expense</button>}>
          <div className="table-scroll" style={{ maxHeight: 240 }}>
            <table className="table compact">
              <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th></th></tr></thead>
              <tbody>
                {sorted.slice(0, 8).map((e) => (
                  <tr key={e.id}>
                    <td>{e.date}</td><td>{e.category}</td><td>{e.description}</td><td>{money(e.amount)}</td>
                    <td className="row-actions">
                      <button className="icon-btn" onClick={() => onEdit(e)}><Pencil size={14} /></button>
                      <button className="icon-btn" onClick={() => { if (window.confirm("Delete expense?")) onDelete(e.id); }}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
      <Panel title="All expenses" action={<button className="btn-ghost" onClick={onExport}><Download size={15} /> Export CSV</button>}>
        <div className="table-scroll">
          <table className="table">
            <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Supplier</th><th></th></tr></thead>
            <tbody>
              {sorted.map((e) => (
                <tr key={e.id}>
                  <td>{e.date}</td><td>{e.category}</td><td>{e.description}</td><td>{money(e.amount)}</td><td>{e.supplier}</td>
                  <td className="row-actions">
                    <button className="icon-btn" onClick={() => onEdit(e)}><Pencil size={14} /></button>
                    <button className="icon-btn" onClick={() => { if (window.confirm("Delete expense?")) onDelete(e.id); }}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && <tr><td colSpan={6} className="empty-cell">No expenses logged yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function ExpenseModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial || { date: todayISO(), category: EXPENSE_CATS[0], description: "", amount: "", supplier: "", notes: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <Modal title={initial ? "Edit expense" : "Add expense"} onClose={onClose}>
      <div className="form-grid">
        <Field label="Date"><input type="date" value={form.date} onChange={set("date")} /></Field>
        <Field label="Category"><select value={form.category} onChange={set("category")}>{EXPENSE_CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Description"><input value={form.description} onChange={set("description")} /></Field>
        <Field label="Amount (£)"><input type="number" step="0.01" value={form.amount} onChange={set("amount")} /></Field>
        <Field label="Supplier"><input value={form.supplier} onChange={set("supplier")} /></Field>
        <Field label="Notes"><input value={form.notes} onChange={set("notes")} /></Field>
      </div>
      <div className="modal-actions">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => onSave({ ...form, id: initial?.id })}>Save expense</button>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------------- */
/*  BUY OR PASS                                                             */
/* ---------------------------------------------------------------------- */

function BuyPassPage({ settings }) {
  const [form, setForm] = useState({ brand: "", itemType: "", purchasePrice: "", expectedPrice: "", additionalCosts: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const purchase = Number(form.purchasePrice) || 0;
  const expected = Number(form.expectedPrice) || 0;
  const extra = Number(form.additionalCosts) || 0;
  const totalCost = purchase + extra;
  const profit = expected - totalCost;
  const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  const margin = expected > 0 ? (profit / expected) * 100 : 0;
  const breakEven = totalCost;
  const suggestedMax = Math.max(0, expected / (1 + settings.roiBuyThreshold / 100) - extra);

  let verdict = "PASS", vClass = "verdict-red", reason = "ROI is below your pass threshold — this purchase is unlikely to be worth your time.";
  if (roi >= settings.roiBuyThreshold) { verdict = "BUY"; vClass = "verdict-green"; reason = `Strong ${pct(roi)} ROI relative to the ${money(totalCost)} you'd have in it.`; }
  else if (roi >= settings.roiConsiderThreshold) { verdict = "CONSIDER"; vClass = "verdict-amber"; reason = `${pct(roi)} ROI is workable but not exceptional — only buy if condition and demand are strong.`; }

  return (
    <div className="stack">
      <div className="grid-2">
        <Panel title="Item details">
          <div className="form-grid one-col">
            <Field label="Brand"><input value={form.brand} onChange={set("brand")} placeholder="e.g. Patagonia" /></Field>
            <Field label="Item type"><input value={form.itemType} onChange={set("itemType")} placeholder="e.g. Retro-X fleece" /></Field>
            <Field label="Purchase price (£)"><input type="number" step="0.01" value={form.purchasePrice} onChange={set("purchasePrice")} /></Field>
            <Field label="Expected selling price (£)"><input type="number" step="0.01" value={form.expectedPrice} onChange={set("expectedPrice")} /></Field>
            <Field label="Estimated additional costs (£)"><input type="number" step="0.01" value={form.additionalCosts} onChange={set("additionalCosts")} placeholder="cleaning, postage, packaging…" /></Field>
          </div>
        </Panel>

        <Panel title="Verdict">
          <div className={`verdict-block ${vClass}`}>
            <div className="verdict-word">{verdict}</div>
            <div className="verdict-reason">{reason}</div>
          </div>
          <div className="calc-rows">
            <div><span>Expected profit</span><strong className={profit >= 0 ? "text-green" : "text-red"}>{money(profit)}</strong></div>
            <div><span>ROI</span><strong>{pct(roi)}</strong></div>
            <div><span>Profit margin</span><strong>{pct(margin)}</strong></div>
            <div><span>Break-even sale price</span><strong>{money(breakEven)}</strong></div>
            <div><span>Suggested max purchase price</span><strong>{money(suggestedMax)}</strong></div>
          </div>
        </Panel>
      </div>
      <Panel title="How this works">
        <p className="muted-text">
          Buy triggers at {settings.roiBuyThreshold}%+ ROI, Consider at {settings.roiConsiderThreshold}–{settings.roiBuyThreshold}%, and Pass below {settings.roiConsiderThreshold}%.
          Adjust these thresholds any time in Settings to match how you like to source.
        </p>
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  PRICING CALCULATOR                                                     */
/* ---------------------------------------------------------------------- */

function PricingCalculatorPage() {
  const [form, setForm] = useState({ purchasePrice: "", costs: "", desiredProfit: "", desiredRoi: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const purchase = Number(form.purchasePrice) || 0;
  const costs = Number(form.costs) || 0;
  const base = purchase + costs;
  const desiredProfit = Number(form.desiredProfit) || 0;
  const desiredRoi = Number(form.desiredRoi) || 0;

  const minSellingPrice = base + desiredProfit;
  const breakEven = base;
  const priceForRoi = (roi) => base * (1 + roi / 100);
  const priceForDesiredRoi = base * (1 + desiredRoi / 100);

  return (
    <div className="stack">
      <div className="grid-2">
        <Panel title="Your numbers">
          <div className="form-grid one-col">
            <Field label="Purchase price (£)"><input type="number" step="0.01" value={form.purchasePrice} onChange={set("purchasePrice")} /></Field>
            <Field label="Other costs (£)"><input type="number" step="0.01" value={form.costs} onChange={set("costs")} placeholder="cleaning, postage, packaging…" /></Field>
            <Field label="Desired profit (£)"><input type="number" step="0.01" value={form.desiredProfit} onChange={set("desiredProfit")} /></Field>
            <Field label="Desired ROI (%)"><input type="number" step="1" value={form.desiredRoi} onChange={set("desiredRoi")} /></Field>
          </div>
        </Panel>
        <Panel title="Recommended pricing">
          <div className="calc-rows">
            <div><span>Break-even price</span><strong>{money(breakEven)}</strong></div>
            <div><span>Minimum selling price (for desired profit)</span><strong>{money(minSellingPrice)}</strong></div>
            <div><span>Price for desired ROI</span><strong>{money(priceForDesiredRoi)}</strong></div>
            <div><span>Price for 25% ROI</span><strong>{money(priceForRoi(25))}</strong></div>
            <div><span>Price for 50% ROI</span><strong>{money(priceForRoi(50))}</strong></div>
            <div><span>Price for 100% ROI</span><strong>{money(priceForRoi(100))}</strong></div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  BRANDS / SUPPLIERS RANK PAGE                                           */
/* ---------------------------------------------------------------------- */

function RankPage({ title, stats, settings, isSupplier }) {
  const chartData = stats.slice(0, 8).map((s) => ({ name: s.key, Profit: Number(s.profit.toFixed(2)) }));
  return (
    <div className="stack">
      <Panel title={`${title} — ranked by profit`}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" stroke="var(--ink-soft)" fontSize={12} interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis stroke="var(--ink-soft)" fontSize={12} />
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 4, fontSize: 13 }} />
            <Bar dataKey="Profit" fill="var(--accent)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
      <Panel title={isSupplier ? "Where to source more stock" : "Full breakdown"}>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr><th>#</th><th>{isSupplier ? "Supplier" : "Brand"}</th><th>Bought</th><th>Spend</th><th>Sold</th><th>Revenue</th><th>Profit</th><th>Avg profit</th><th>Avg ROI</th><th>Sell-through</th><th>Avg days to sell</th></tr>
            </thead>
            <tbody>
              {stats.map((s, i) => (
                <tr key={s.key}>
                  <td>{i + 1}</td>
                  <td>{s.key}</td>
                  <td>{s.bought}</td>
                  <td>{money(s.spend)}</td>
                  <td>{s.sold}</td>
                  <td>{money(s.revenue)}</td>
                  <td className={s.profit >= 0 ? "text-green" : "text-red"}>{money(s.profit)}</td>
                  <td>{money(s.avgProfit)}</td>
                  <td><RoiBadge value={s.avgROI} settings={settings} /></td>
                  <td>{pct(s.sellThrough)}</td>
                  <td>{s.avgDaysToSell.toFixed(0)}d</td>
                </tr>
              ))}
              {stats.length === 0 && <tr><td colSpan={11} className="empty-cell">No data yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  MONTHLY PERFORMANCE                                                    */
/* ---------------------------------------------------------------------- */

function MonthlyPage({ monthlyStats, thisMonth, prevMonth, changePct }) {
  const chartData = monthlyStats.slice(-8).map((m) => ({ month: monthLabel(m.key), Revenue: Number(m.revenue.toFixed(2)), Profit: Number(m.profit.toFixed(2)) }));
  const revChange = changePct(thisMonth.revenue, prevMonth.revenue);
  const profitChange = changePct(thisMonth.profit, prevMonth.profit);
  const salesChange = changePct(thisMonth.sales, prevMonth.sales);

  return (
    <div className="stack">
      <div className="kpi-grid kpi-grid-3">
        <KpiCard label="Revenue" value={money(thisMonth.revenue)} sub={`${revChange >= 0 ? "+" : ""}${revChange.toFixed(0)}% vs last month`} trend={revChange >= 0 ? "up" : "down"} />
        <KpiCard label="Profit" value={money(thisMonth.profit)} sub={`${profitChange >= 0 ? "+" : ""}${profitChange.toFixed(0)}% vs last month`} trend={profitChange >= 0 ? "up" : "down"} />
        <KpiCard label="Sales" value={thisMonth.sales || 0} sub={`${salesChange >= 0 ? "+" : ""}${salesChange.toFixed(0)}% vs last month`} trend={salesChange >= 0 ? "up" : "down"} />
      </div>
      <Panel title="Revenue & profit by month">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" stroke="var(--ink-soft)" fontSize={12} />
            <YAxis stroke="var(--ink-soft)" fontSize={12} />
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 4, fontSize: 13 }} />
            <Legend />
            <Bar dataKey="Revenue" fill="#3D7A8A" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Profit" fill="var(--accent)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
      <Panel title="Month-by-month detail">
        <div className="table-scroll">
          <table className="table">
            <thead><tr><th>Month</th><th>Revenue</th><th>Profit</th><th>Sales</th><th>Avg sale price</th><th>Avg ROI</th><th>Stock spend</th><th>Listings added</th><th>Expenses</th></tr></thead>
            <tbody>
              {[...monthlyStats].reverse().map((m) => (
                <tr key={m.key}>
                  <td>{monthLabel(m.key)}</td>
                  <td>{money(m.revenue)}</td>
                  <td className={m.profit >= 0 ? "text-green" : "text-red"}>{money(m.profit)}</td>
                  <td>{m.sales || 0}</td>
                  <td>{money(m.avgSalePrice)}</td>
                  <td>{pct(m.avgROI)}</td>
                  <td>{money(m.spend || 0)}</td>
                  <td>{m.listings || 0}</td>
                  <td>{money(m.expenses || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  GOALS                                                                   */
/* ---------------------------------------------------------------------- */

function GoalsPage({ goals, setGoals, thisMonth, totals }) {
  const [form, setForm] = useState(goals);
  useEffect(() => setForm(goals), [goals]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="stack">
      <div className="grid-2">
        <Panel title="This month's progress">
          <div className="goal-row">
            <div className="goal-head"><span>Revenue</span><span>{money(thisMonth.revenue)} / {money(goals.revenue)}</span></div>
            <ProgressBar value={thisMonth.revenue} max={goals.revenue} colorClass="fill-blue" />
          </div>
          <div className="goal-row">
            <div className="goal-head"><span>Profit</span><span>{money(thisMonth.profit)} / {money(goals.profit)}</span></div>
            <ProgressBar value={thisMonth.profit} max={goals.profit} colorClass="fill-green" />
          </div>
          <div className="goal-row">
            <div className="goal-head"><span>Sales</span><span>{thisMonth.sales || 0} / {goals.sales}</span></div>
            <ProgressBar value={thisMonth.sales || 0} max={goals.sales} colorClass="fill-amber" />
          </div>
          <div className="goal-row">
            <div className="goal-head"><span>New listings</span><span>{thisMonth.listings || 0} / {goals.listings}</span></div>
            <ProgressBar value={thisMonth.listings || 0} max={goals.listings} colorClass="fill-rust" />
          </div>
        </Panel>
        <Panel title="Set monthly targets">
          <div className="form-grid one-col">
            <Field label="Monthly revenue goal (£)"><input type="number" value={form.revenue} onChange={set("revenue")} /></Field>
            <Field label="Monthly profit goal (£)"><input type="number" value={form.profit} onChange={set("profit")} /></Field>
            <Field label="Monthly sales goal (items)"><input type="number" value={form.sales} onChange={set("sales")} /></Field>
            <Field label="Monthly new listings goal"><input type="number" value={form.listings} onChange={set("listings")} /></Field>
          </div>
          <div className="modal-actions" style={{ padding: 0, marginTop: 12 }}>
            <button className="btn-primary" onClick={() => setGoals({
              revenue: Number(form.revenue) || 0, profit: Number(form.profit) || 0,
              sales: Number(form.sales) || 0, listings: Number(form.listings) || 0,
            })}>Save targets</button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  SETTINGS                                                                */
/* ---------------------------------------------------------------------- */

function SettingsPage({ settings, setSettings, onClear, onReload, onExportAll }) {
  const [form, setForm] = useState(settings);
  useEffect(() => setForm(settings), [settings]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="stack">
      <Panel title="Business">
        <div className="form-grid one-col">
          <Field label="Business name"><input value={form.businessName} onChange={set("businessName")} /></Field>
          <Field label="Currency"><input value="GBP (£)" disabled /></Field>
        </div>
      </Panel>
      <Panel title="Buy or Pass thresholds">
        <div className="form-grid one-col">
          <Field label="ROI% for a BUY verdict"><input type="number" value={form.roiBuyThreshold} onChange={set("roiBuyThreshold")} /></Field>
          <Field label="ROI% for a CONSIDER verdict"><input type="number" value={form.roiConsiderThreshold} onChange={set("roiConsiderThreshold")} /></Field>
        </div>
      </Panel>
      <Panel title="Stock age warnings">
        <div className="form-grid one-col">
          <Field label="Warn after (days)"><input type="number" value={form.ageWarn1} onChange={set("ageWarn1")} /></Field>
          <Field label="Flag after (days)"><input type="number" value={form.ageWarn2} onChange={set("ageWarn2")} /></Field>
          <Field label="Critical after (days)"><input type="number" value={form.ageWarn3} onChange={set("ageWarn3")} /></Field>
        </div>
      </Panel>
      <div className="modal-actions" style={{ padding: 0 }}>
        <button className="btn-primary" onClick={() => setSettings({
          ...form,
          roiBuyThreshold: Number(form.roiBuyThreshold) || 0,
          roiConsiderThreshold: Number(form.roiConsiderThreshold) || 0,
          ageWarn1: Number(form.ageWarn1) || 0,
          ageWarn2: Number(form.ageWarn2) || 0,
          ageWarn3: Number(form.ageWarn3) || 0,
        })}>Save settings</button>
      </div>

      <Panel title="Data">
        <p className="muted-text">Your data is saved automatically and will still be here next time you open this app.</p>
        <div className="settings-actions">
          <button className="btn-ghost" onClick={onExportAll}><Download size={15} /> Export all data (CSV)</button>
          <button className="btn-ghost" onClick={onReload}>Reload demo data</button>
          <button className="btn-danger" onClick={onClear}><Trash2 size={15} /> Clear all data</button>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  STYLES                                                                  */
/* ---------------------------------------------------------------------- */

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');

:root{
  --paper:#F3F2EC;
  --card:#FFFFFF;
  --ink:#16211D;
  --ink-soft:#5B6459;
  --line:#DCD8C9;
  --accent:#2F6F52;
  --accent-soft:#E4EEE7;
  --rust:#C77B2C;
  --rust-soft:#F5E6D3;
  --blue:#3D7A8A;
  --blue-soft:#E1EDF0;
  --danger:#B3462C;
  --danger-soft:#F5E1DA;
  --amber:#B98A1E;
  --amber-soft:#F6EBD3;
  --radius:6px;
}
*{box-sizing:border-box;}
.app{
  display:flex; min-height:100vh; width:100%; background:var(--paper); color:var(--ink);
  font-family:'Inter',sans-serif; font-size:14px; line-height:1.45;
}
button, input, select { font-family:inherit; font-size:13px; color:var(--ink); }

/* Sidebar */
.sidebar{
  width:230px; background:var(--ink); color:#EDEAE0; flex-shrink:0;
  display:flex; flex-direction:column; padding:20px 14px;
}
.brand{ display:flex; align-items:center; gap:10px; padding:0 6px 20px; border-bottom:1px solid rgba(255,255,255,0.12); margin-bottom:14px;}
.brand-mark{
  width:34px; height:34px; border-radius:6px; background:var(--accent);
  display:flex; align-items:center; justify-content:center; font-family:'Space Grotesk',sans-serif;
  font-weight:700; font-size:16px; color:#fff; flex-shrink:0;
}
.brand-name{ font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:15px; letter-spacing:0.03em; }
.brand-sub{ font-size:11px; color:#A9B0A5; margin-top:1px; }
.nav-item{
  display:flex; align-items:center; gap:10px; width:100%; text-align:left; padding:9px 10px;
  background:none; border:none; border-radius:5px; color:#C9CFC3; cursor:pointer; margin-bottom:2px;
}
.nav-item:hover{ background:rgba(255,255,255,0.06); color:#fff; }
.nav-active{ background:var(--accent) !important; color:#fff !important; }

/* Main */
.main{ flex:1; min-width:0; display:flex; flex-direction:column; }
.topbar{
  display:flex; align-items:center; gap:12px; padding:16px 26px; background:var(--paper);
  border-bottom:1px solid var(--line); position:sticky; top:0; z-index:5;
}
.topbar h1{ font-family:'Space Grotesk',sans-serif; font-size:19px; font-weight:600; flex:1; }
.health-pill{ font-size:12px; font-weight:600; padding:5px 11px; border-radius:20px; }
.health-green{ background:var(--accent-soft); color:var(--accent); }
.health-amber{ background:var(--amber-soft); color:var(--amber); }
.health-red{ background:var(--danger-soft); color:var(--danger); }
.content{ padding:22px 26px 60px; }
.mobile-only{ display:none; }

.stack{ display:flex; flex-direction:column; gap:18px; }
.grid-2{ display:grid; grid-template-columns:1fr 1fr; gap:18px; }

/* KPI */
.kpi-grid{ display:grid; grid-template-columns:repeat(5,1fr); gap:12px; }
.kpi-grid-3{ grid-template-columns:repeat(3,1fr); }
.kpi-card{ background:var(--card); border:1px solid var(--line); border-radius:var(--radius); padding:14px 16px; }
.kpi-label{ font-size:11.5px; color:var(--ink-soft); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:6px; }
.kpi-value{ font-family:'Space Grotesk',sans-serif; font-size:22px; font-weight:600; }
.kpi-trend{ display:flex; align-items:center; gap:3px; font-size:11.5px; margin-top:5px; color:var(--ink-soft); }
.trend-up{ color:var(--accent); }
.trend-down{ color:var(--danger); }

/* Panel */
.panel{ background:var(--card); border:1px solid var(--line); border-radius:var(--radius); }
.panel-head{ display:flex; align-items:center; justify-content:space-between; padding:14px 18px; border-bottom:1px solid var(--line); }
.panel-head h3{ font-family:'Space Grotesk',sans-serif; font-size:14.5px; font-weight:600; }
.panel-body{ padding:16px 18px; }

/* Table */
.table-scroll{ overflow-x:auto; }
.table{ width:100%; border-collapse:collapse; font-size:13px; }
.table th{ text-align:left; padding:9px 10px; border-bottom:1px solid var(--line); color:var(--ink-soft); font-weight:600; font-size:11.5px; text-transform:uppercase; letter-spacing:0.03em; white-space:nowrap; }
.table td{ padding:9px 10px; border-bottom:1px solid var(--line); vertical-align:middle; }
.table tbody tr:hover{ background:var(--paper); }
.table.compact td, .table.compact th{ padding:7px 8px; }
.sortable{ cursor:pointer; user-select:none; }
.cell-sub{ font-size:11px; color:var(--ink-soft); }
.row-warn{ background:var(--amber-soft); }
.row-danger{ background:var(--danger-soft); }
.row-actions{ display:flex; gap:4px; white-space:nowrap; }
.empty-cell, .empty-state{ text-align:center; color:var(--ink-soft); padding:22px; display:flex; align-items:center; justify-content:center; gap:8px; }

/* Badges */
.badge{ display:inline-block; padding:3px 9px; border-radius:20px; font-size:11.5px; font-weight:600; white-space:nowrap; }
.badge-grey{ background:#E7E5DC; color:var(--ink-soft); }
.badge-blue{ background:var(--blue-soft); color:var(--blue); }
.badge-amber{ background:var(--amber-soft); color:var(--amber); }
.badge-green{ background:var(--accent-soft); color:var(--accent); }
.badge-red{ background:var(--danger-soft); color:var(--danger); }

/* Buttons */
.btn-primary, .btn-ghost, .btn-danger{
  display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:5px; font-weight:600;
  font-size:13px; cursor:pointer; border:1px solid transparent; white-space:nowrap;
}
.btn-primary{ background:var(--ink); color:#fff; }
.btn-primary:hover{ background:var(--accent); }
.btn-ghost{ background:transparent; border-color:var(--line); color:var(--ink); }
.btn-ghost:hover{ background:var(--card); }
.btn-danger{ background:transparent; border-color:var(--danger); color:var(--danger); }
.btn-danger:hover{ background:var(--danger-soft); }
.icon-btn{ background:transparent; border:1px solid transparent; padding:5px; border-radius:4px; cursor:pointer; display:flex; color:var(--ink-soft); }
.icon-btn:hover{ background:var(--paper); color:var(--ink); }
.link-btn{ background:none; border:none; color:var(--accent); font-weight:600; font-size:12.5px; cursor:pointer; padding:10px 0 0; }

/* Toolbar */
.toolbar{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.search-box{ display:flex; align-items:center; gap:6px; background:var(--card); border:1px solid var(--line); border-radius:5px; padding:7px 10px; flex:1; min-width:180px; color:var(--ink-soft); }
.search-box input{ border:none; outline:none; background:none; flex:1; color:var(--ink); }
select{ background:var(--card); border:1px solid var(--line); border-radius:5px; padding:7px 10px; }
.spacer{ flex:1; }

/* Forms */
.form-grid{ display:grid; grid-template-columns:1fr 1fr; gap:12px 16px; }
.form-grid.one-col{ grid-template-columns:1fr; }
.field{ display:flex; flex-direction:column; gap:5px; font-size:12.5px; color:var(--ink-soft); font-weight:600; }
.field input, .field select{ border:1px solid var(--line); border-radius:5px; padding:8px 10px; color:var(--ink); font-weight:400; }
.field input:focus, .field select:focus{ outline:2px solid var(--accent); outline-offset:1px; border-color:var(--accent); }
.field input:disabled{ background:var(--paper); color:var(--ink-soft); }

/* Modal */
.modal-overlay{ position:fixed; inset:0; background:rgba(22,33,29,0.45); display:flex; align-items:center; justify-content:center; z-index:50; padding:20px; }
.modal{ background:var(--card); border-radius:8px; width:100%; max-width:460px; max-height:88vh; overflow-y:auto; }
.modal-wide{ max-width:720px; }
.modal-head{ display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--line); }
.modal-head h3{ font-family:'Space Grotesk',sans-serif; font-size:16px; font-weight:600; }
.modal-body{ padding:18px 20px 20px; }
.modal-actions{ display:flex; justify-content:flex-end; gap:10px; padding-top:16px; }
.calc-preview{ display:flex; gap:20px; background:var(--paper); border-radius:6px; padding:10px 14px; margin-top:14px; font-size:13px; }

/* Health */
.health-block{ display:flex; align-items:baseline; gap:12px; margin-bottom:10px; }
.health-score{ font-family:'Space Grotesk',sans-serif; font-size:40px; font-weight:700; }
.health-label{ font-size:14px; font-weight:600; color:var(--ink-soft); }
.health-tips{ list-style:none; display:flex; flex-direction:column; gap:8px; padding:0; margin:0; font-size:12.5px; color:var(--ink-soft); }
.health-tips li{ padding-left:14px; position:relative; }
.health-tips li:before{ content:"—"; position:absolute; left:0; color:var(--rust); }
.muted-count{ font-size:12px; color:var(--ink-soft); background:var(--paper); padding:2px 9px; border-radius:20px; }
.muted-text{ color:var(--ink-soft); font-size:13px; }

/* Progress / goals */
.goal-row{ margin-bottom:16px; }
.goal-row:last-child{ margin-bottom:0; }
.goal-head{ display:flex; justify-content:space-between; font-size:12.5px; margin-bottom:6px; color:var(--ink-soft); font-weight:600; }
.progress-track{ height:9px; background:var(--paper); border-radius:20px; overflow:hidden; border:1px solid var(--line); }
.progress-fill{ height:100%; border-radius:20px; }
.fill-blue{ background:var(--blue); } .fill-green{ background:var(--accent); } .fill-amber{ background:var(--amber); } .fill-rust{ background:var(--rust); }

/* Buy/pass verdict */
.verdict-block{ text-align:center; padding:22px 10px; border-radius:8px; margin-bottom:16px; }
.verdict-word{ font-family:'Space Grotesk',sans-serif; font-size:32px; font-weight:700; letter-spacing:0.03em; }
.verdict-reason{ font-size:13px; margin-top:6px; }
.verdict-green{ background:var(--accent-soft); color:var(--accent); }
.verdict-amber{ background:var(--amber-soft); color:var(--amber); }
.verdict-red{ background:var(--danger-soft); color:var(--danger); }
.calc-rows{ display:flex; flex-direction:column; gap:10px; }
.calc-rows > div{ display:flex; justify-content:space-between; border-bottom:1px dashed var(--line); padding-bottom:8px; font-size:13px; }
.calc-rows > div:last-child{ border-bottom:none; }

.settings-actions{ display:flex; gap:10px; flex-wrap:wrap; }

.text-green{ color:var(--accent); font-weight:600; }
.text-red{ color:var(--danger); font-weight:600; }

.toast{
  position:fixed; bottom:22px; left:50%; transform:translateX(-50%); background:var(--ink); color:#fff;
  padding:10px 18px; border-radius:6px; font-size:13px; z-index:100; box-shadow:0 6px 20px rgba(0,0,0,0.2);
}
.loading-screen{ min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--paper); color:var(--ink-soft); font-family:'Inter',sans-serif; }

@media (max-width: 980px){
  .kpi-grid{ grid-template-columns:repeat(2,1fr); }
  .grid-2{ grid-template-columns:1fr; }
  .form-grid{ grid-template-columns:1fr; }
}
@media (max-width: 760px){
  .sidebar{ position:fixed; z-index:40; height:100vh; transform:translateX(-100%); transition:transform .2s ease; }
  .sidebar-open{ transform:translateX(0); }
  .mobile-only{ display:flex; }
  .content{ padding:16px; }
  .topbar{ padding:14px 16px; }
  .kpi-grid, .kpi-grid-3{ grid-template-columns:1fr 1fr; }
}
`;
