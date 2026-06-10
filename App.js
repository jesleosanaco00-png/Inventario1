import { useState, useEffect } from "react";

const INITIAL_PRODUCTS = [
  { id: 1, name: "Coca-Cola 600ml", category: "Bebidas", quantity: 50, unit: "piezas", price: 18 },
  { id: 2, name: "Sabritas Original 45g", category: "Botanas", quantity: 30, unit: "bolsas", price: 16 },
  { id: 3, name: "Sabritas Adobadas 45g", category: "Botanas", quantity: 25, unit: "bolsas", price: 16 },
];

const CATEGORIES = ["Bebidas", "Botanas", "Lácteos", "Dulces", "Limpieza", "Otro"];
const LOW_STOCK = 10;

function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue];
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{
      position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, background: toast.type === "err" ? "#fee2e2" : "#dcfce7",
      color: toast.type === "err" ? "#991b1b" : "#166534",
      border: `1px solid ${toast.type === "err" ? "#fca5a5" : "#86efac"}`,
      padding: "10px 20px", borderRadius: 12, fontWeight: 600, fontSize: 14,
      boxShadow: "0 4px 20px rgba(0,0,0,0.12)", whiteSpace: "nowrap"
    }}>{toast.msg}</div>
  );
}

function StockBadge({ count, unit }) {
  if (count > LOW_STOCK) return <span style={{ color: "#16a34a", fontWeight: 700 }}>{count} <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 12 }}>{unit}</span></span>;
  if (count > 0) return <span style={{ color: "#d97706", fontWeight: 700 }}>{count} <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 12 }}>{unit}</span> ⚠️</span>;
  return <span style={{ color: "#dc2626", fontWeight: 700 }}>Agotado</span>;
}

export default function App() {
  const [products, setProducts] = useLocalStorage("inventario_products", INITIAL_PRODUCTS);
  const [nextId, setNextId] = useLocalStorage("inventario_nextId", 4);
  const [editId, setEditId] = useState(null);
  const [deltaMap, setDeltaMap] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Todas");
  const [toast, setToast] = useState(null);
  const [newProduct, setNewProduct] = useState({ name: "", category: "Bebidas", quantity: "", unit: "piezas", price: "" });
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState("inventario"); // inventario | resumen

  function showToast(msg, type = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  function applyDelta(id) {
    const raw = deltaMap[id];
    const delta = parseInt(raw, 10);
    if (isNaN(delta) || raw === "" || raw === undefined) return;
    setProducts(ps => ps.map(p => {
      if (p.id !== id) return p;
      const next = p.quantity + delta;
      if (next < 0) { showToast("No puedes tener cantidad negativa.", "err"); return p; }
      return { ...p, quantity: next };
    }));
    setDeltaMap(d => ({ ...d, [id]: "" }));
    setEditId(null);
    showToast("Cantidad actualizada ✓");
  }

  function setQuantityDirect(id, val) {
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 0) return;
    setProducts(ps => ps.map(p => p.id === id ? { ...p, quantity: n } : p));
  }

  function deleteProduct(id) {
    if (!window.confirm("¿Eliminar este producto?")) return;
    setProducts(ps => ps.filter(p => p.id !== id));
    showToast("Producto eliminado.", "err");
  }

  function validateNew() {
    const e = {};
    if (!newProduct.name.trim()) e.name = "Escribe el nombre del producto.";
    if (newProduct.quantity === "" || isNaN(Number(newProduct.quantity)) || Number(newProduct.quantity) < 0) e.quantity = "Cantidad válida requerida.";
    if (newProduct.price === "" || isNaN(Number(newProduct.price)) || Number(newProduct.price) < 0) e.price = "Precio válido requerido.";
    return e;
  }

  function addProduct() {
    const e = validateNew();
    if (Object.keys(e).length) { setErrors(e); return; }
    setProducts(ps => [...ps, {
      id: nextId,
      name: newProduct.name.trim(),
      category: newProduct.category,
      quantity: parseInt(newProduct.quantity, 10),
      unit: newProduct.unit || "piezas",
      price: parseFloat(newProduct.price),
    }]);
    setNextId(n => n + 1);
    setNewProduct({ name: "", category: "Bebidas", quantity: "", unit: "piezas", price: "" });
    setErrors({});
    setShowForm(false);
    showToast("¡Producto agregado! ✓");
  }

  const allCats = ["Todas", ...Array.from(new Set(products.map(p => p.category)))];
  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "Todas" || p.category === filterCat;
    return matchSearch && matchCat;
  });

  const totalItems = products.reduce((a, p) => a + p.quantity, 0);
  const totalValue = products.reduce((a, p) => a + p.quantity * p.price, 0);
  const lowStock = products.filter(p => p.quantity <= LOW_STOCK && p.quantity > 0).length;
  const outOfStock = products.filter(p => p.quantity === 0).length;

  const byCategory = CATEGORIES.map(cat => ({
    cat,
    items: products.filter(p => p.category === cat),
    total: products.filter(p => p.category === cat).reduce((a, p) => a + p.quantity * p.price, 0),
  })).filter(g => g.items.length > 0);

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", background: "#f1f5f9", minHeight: "100vh", paddingBottom: 80 }}>
      <Toast toast={toast} />

      {/* Header */}
      <div style={{ background: "#2563eb", color: "#fff", padding: "20px 16px 16px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px" }}>🏪 Mi Tienda</h1>
              <p style={{ margin: "2px 0 0", fontSize: 13, opacity: 0.8 }}>Inventario actualizado</p>
            </div>
            <button
              onClick={() => { setShowForm(f => !f); setErrors({}); }}
              style={{
                background: showForm ? "rgba(255,255,255,0.2)" : "#fff",
                color: showForm ? "#fff" : "#2563eb",
                border: "none", borderRadius: 10, padding: "9px 16px",
                fontWeight: 700, fontSize: 14, cursor: "pointer"
              }}
            >
              {showForm ? "✕ Cancelar" : "+ Agregar"}
            </button>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 16 }}>
            {[
              { label: "Productos", value: products.length },
              { label: "En stock", value: totalItems },
              { label: "Bajo stock", value: lowStock },
              { label: "Agotados", value: outOfStock },
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: "8px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{s.value}</div>
                <div style={{ fontSize: 10, opacity: 0.85, lineHeight: 1.2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "16px 16px 0" }}>

        {/* Add product form */}
        {showForm && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 18, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Nuevo producto</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={lbl}>Nombre</label>
                <input placeholder="Ej. Pepsi 600ml" value={newProduct.name}
                  onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
                  style={{ ...inp, borderColor: errors.name ? "#fca5a5" : "#e2e8f0" }} />
                {errors.name && <span style={err}>{errors.name}</span>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={lbl}>Categoría</label>
                  <select value={newProduct.category} onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))} style={inp}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Unidad</label>
                  <input placeholder="piezas, bolsas…" value={newProduct.unit}
                    onChange={e => setNewProduct(p => ({ ...p, unit: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Cantidad</label>
                  <input type="number" min="0" placeholder="0" value={newProduct.quantity}
                    onChange={e => setNewProduct(p => ({ ...p, quantity: e.target.value }))}
                    style={{ ...inp, borderColor: errors.quantity ? "#fca5a5" : "#e2e8f0" }} />
                  {errors.quantity && <span style={err}>{errors.quantity}</span>}
                </div>
                <div>
                  <label style={lbl}>Precio ($)</label>
                  <input type="number" min="0" step="0.5" placeholder="0.00" value={newProduct.price}
                    onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))}
                    style={{ ...inp, borderColor: errors.price ? "#fca5a5" : "#e2e8f0" }} />
                  {errors.price && <span style={err}>{errors.price}</span>}
                </div>
              </div>
              <button onClick={addProduct} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 4 }}>
                Agregar producto
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {["inventario", "resumen"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
              background: activeTab === tab ? "#2563eb" : "#fff",
              color: activeTab === tab ? "#fff" : "#64748b",
              fontWeight: 700, fontSize: 14, cursor: "pointer",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)"
            }}>
              {tab === "inventario" ? "📦 Inventario" : "📊 Resumen"}
            </button>
          ))}
        </div>

        {activeTab === "inventario" && (
          <>
            {/* Search + filter */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input placeholder="🔍 Buscar…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ ...inp, flex: 1 }} />
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                style={{ ...inp, width: "auto", minWidth: 100 }}>
                {allCats.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            {/* Product cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.length === 0 && (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0", fontSize: 15 }}>
                  No se encontraron productos.
                </div>
              )}
              {filtered.map(p => (
                <div key={p.id} style={{
                  background: "#fff", borderRadius: 14, overflow: "hidden",
                  border: `1px solid ${p.quantity === 0 ? "#fecaca" : p.quantity <= LOW_STOCK ? "#fde68a" : "#e2e8f0"}`,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)"
                }}>
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 15, marginBottom: 4 }}>{p.name}</div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ background: "#f1f5f9", color: "#475569", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{p.category}</span>
                          <span style={{ color: "#94a3b8", fontSize: 12 }}>${p.price.toFixed(2)} c/u</span>
                          <span style={{ color: "#94a3b8", fontSize: 12 }}>Total: ${(p.price * p.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", marginLeft: 8 }}>
                        <div style={{ fontSize: 15, marginBottom: 6 }}><StockBadge count={p.quantity} unit={p.unit} /></div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => setEditId(editId === p.id ? null : p.id)}
                            style={{ background: editId === p.id ? "#e2e8f0" : "#eff6ff", color: "#2563eb", border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                            {editId === p.id ? "✕" : "✏️"}
                          </button>
                          <button onClick={() => deleteProduct(p.id)}
                            style={{ background: "#fef2f2", color: "#dc2626", border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Inline editor */}
                  {editId === p.id && (
                    <div style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0", padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                        <div>
                          <label style={{ ...lbl, marginBottom: 5 }}>Cantidad exacta</label>
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <button onClick={() => setQuantityDirect(p.id, p.quantity - 1)}
                              style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 8, width: 34, height: 36, fontWeight: 800, fontSize: 18, cursor: "pointer" }}>−</button>
                            <input type="number" min="0" value={p.quantity}
                              onChange={e => setQuantityDirect(p.id, e.target.value)}
                              style={{ ...inp, width: 64, textAlign: "center", padding: "8px 4px" }} />
                            <button onClick={() => setQuantityDirect(p.id, p.quantity + 1)}
                              style={{ background: "#dbeafe", color: "#2563eb", border: "none", borderRadius: 8, width: 34, height: 36, fontWeight: 800, fontSize: 18, cursor: "pointer" }}>+</button>
                          </div>
                        </div>
                        <div>
                          <label style={{ ...lbl, marginBottom: 5 }}>Sumar / restar</label>
                          <div style={{ display: "flex", gap: 4 }}>
                            <input type="number" placeholder="+10 ó −5"
                              value={deltaMap[p.id] ?? ""}
                              onChange={e => setDeltaMap(d => ({ ...d, [p.id]: e.target.value }))}
                              onKeyDown={e => e.key === "Enter" && applyDelta(p.id)}
                              style={{ ...inp, width: 90 }} />
                            <button onClick={() => applyDelta(p.id)}
                              style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                              OK
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "resumen" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Total value card */}
            <div style={{ background: "#2563eb", borderRadius: 14, padding: 18, color: "#fff" }}>
              <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>Valor total del inventario</div>
              <div style={{ fontSize: 32, fontWeight: 800 }}>${totalValue.toFixed(2)}</div>
              <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>{products.length} productos · {totalItems} unidades</div>
            </div>

            {/* By category */}
            {byCategory.map(({ cat, items, total }) => (
              <div key={cat} style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, color: "#1e293b", fontSize: 15 }}>{cat}</span>
                  <span style={{ color: "#2563eb", fontWeight: 700, fontSize: 14 }}>${total.toFixed(2)}</span>
                </div>
                {items.map(p => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid #f1f5f9", fontSize: 13, color: "#475569" }}>
                    <span>{p.name}</span>
                    <span style={{ color: p.quantity === 0 ? "#dc2626" : p.quantity <= LOW_STOCK ? "#d97706" : "#64748b" }}>
                      {p.quantity} {p.unit}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom nav feel */}
      <div style={{ height: 20 }} />
    </div>
  );
}

const inp = {
  width: "100%", border: "1px solid #e2e8f0", borderRadius: 9,
  padding: "9px 12px", fontSize: 14, color: "#1e293b",
  outline: "none", background: "#fff", appearance: "none"
};
const lbl = { display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 };
const err = { color: "#dc2626", fontSize: 11, marginTop: 3, display: "block" };
