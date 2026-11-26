// F-09 — Operators create and edit menu items (FR-13). Prices are entered in THB and sent as integer satang (D-03);
// the server checks every rule again (BR-12) and returns field errors.
import { FormEvent, useEffect, useState } from "react";
import { AdminMenuItem, ApiError, MenuCategory, MenuItem, formatTHB, menuAdminApi, menuApi } from "./api.js";

const PRICE_ERROR = "Price must be greater than 0 and at most 1,000.00 THB.";

interface Draft {
  id?: number;
  categoryId: number;
  name: string;
  description: string;
  price: string; // THB as typed
  isAvailable: boolean;
}

export default function MenuManagement() {
  const [categories, setCategories] = useState<MenuCategory[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "warning"; text: string } | null>(null);

  async function load() {
    setLoadError("");
    try {
      setCategories(await menuApi.get());
    } catch (e) {
      setLoadError((e as ApiError).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function startAdd() {
    setErrors({});
    setDraft({ categoryId: categories?.[0]?.id ?? 0, name: "", description: "", price: "", isAvailable: true });
  }
  function startEdit(categoryId: number, item: MenuItem) {
    setErrors({});
    setDraft({ id: item.id, categoryId, name: item.name, description: item.description, price: (item.priceSatang / 100).toFixed(2), isAvailable: item.isAvailable });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const priceSatang = Math.round(Number(draft.price) * 100);
    const local: Record<string, string> = {};
    if (!draft.name.trim() || draft.name.trim().length > 80) local.name = "Name must be 1 to 80 characters.";
    if (draft.price.trim() === "" || !Number.isFinite(priceSatang) || priceSatang < 1 || priceSatang > 100000) local.priceSatang = PRICE_ERROR;
    setErrors(local);
    if (Object.keys(local).length > 0) return;

    const body = { categoryId: draft.categoryId, name: draft.name.trim(), description: draft.description.trim(), priceSatang, isAvailable: draft.isAvailable };
    setSaving(true);
    try {
      const saved: AdminMenuItem = draft.id ? await menuAdminApi.update(draft.id, body) : await menuAdminApi.create(body);
      setDraft(null);
      setMessage({ kind: "success", text: `Saved ${saved.name}.` });
      await load();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 422 && apiErr.details?.fields) setErrors(apiErr.details.fields);
      else if (apiErr.status === 409) setErrors({ name: apiErr.message });
      else setMessage({ kind: "warning", text: apiErr.message });
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item: MenuItem) {
    setMessage(null);
    try {
      const saved = await menuAdminApi.update(item.id, { isAvailable: !item.isAvailable });
      setMessage({ kind: "success", text: `${saved.name} is now ${saved.isAvailable ? "available" : "sold out"}.` });
      await load();
    } catch (err) {
      setMessage({ kind: "warning", text: (err as ApiError).message });
    }
  }

  const field = (name: keyof Draft, id: string) => ({
    id,
    className: `form-control ${errors[name === "price" ? "priceSatang" : name] ? "is-invalid" : ""}`,
    "aria-describedby": `${id}-error`,
  });
  const fieldError = (key: string, id: string) =>
    errors[key] ? <div id={`${id}-error`} className="invalid-feedback d-block">{errors[key]}</div> : null;

  return (
    <section aria-labelledby="menu-admin-title">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h2 id="menu-admin-title" className="h5 mb-0">Menu management</h2>
        <button className="btn btn-primary btn-sm" onClick={startAdd} disabled={!categories}>Add item</button>
      </div>

      <div role="status" aria-live="polite">
        {message?.kind === "success" && <div className="alert alert-success py-2">{message.text}</div>}
      </div>
      {message?.kind === "warning" && <div className="alert alert-warning py-2" role="alert">{message.text}</div>}

      {draft && (
        <form className="card card-body mb-3" onSubmit={save} noValidate aria-labelledby="item-form-title">
          <h3 id="item-form-title" className="h6">{draft.id ? `Edit ${draft.name || "item"}` : "Add item"}</h3>
          <div className="row g-2">
            <div className="col-12 col-md-4">
              <label htmlFor="item-category" className="form-label">Category</label>
              <select id="item-category" className="form-select" value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: Number(e.target.value) })}>
                {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {fieldError("categoryId", "item-category")}
            </div>
            <div className="col-12 col-md-5">
              <label htmlFor="item-name" className="form-label">Name</label>
              <input {...field("name", "item-name")} maxLength={80} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              {fieldError("name", "item-name")}
            </div>
            <div className="col-12 col-md-3">
              <label htmlFor="item-price" className="form-label">Price (THB)</label>
              <input {...field("price", "item-price")} type="number" inputMode="decimal" min="0.01" max="1000" step="0.25" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
              {fieldError("priceSatang", "item-price")}
            </div>
            <div className="col-12">
              <label htmlFor="item-description" className="form-label">Description</label>
              <textarea {...field("description", "item-description")} rows={2} maxLength={300} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              {fieldError("description", "item-description") ?? <div className="form-text">{draft.description.length}/300</div>}
            </div>
            <div className="col-12 form-check ms-1">
              <input id="item-available" type="checkbox" className="form-check-input" checked={draft.isAvailable} onChange={(e) => setDraft({ ...draft, isAvailable: e.target.checked })} />
              <label htmlFor="item-available" className="form-check-label">Available</label>
            </div>
          </div>
          <div className="d-flex flex-wrap gap-2 mt-3">
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setDraft(null)} disabled={saving}>Cancel</button>
          </div>
        </form>
      )}

      {loadError ? (
        <div className="alert alert-danger" role="alert">We couldn't load the menu. {loadError}</div>
      ) : !categories ? (
        <p className="text-muted" aria-busy="true">Loading the menu…</p>
      ) : (
        categories.map((c) => (
          <div key={c.id} className="mb-4">
            <h3 className="h6">{c.name}</h3>
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <caption className="visually-hidden">{c.name} items</caption>
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col" className="text-end">Price</th>
                    <th scope="col">Availability</th>
                    <th scope="col"><span className="visually-hidden">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {c.items.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <div className="fw-semibold">{i.name}</div>
                        {i.description && <div className="small text-muted">{i.description}</div>}
                      </td>
                      <td className="text-end text-nowrap">{formatTHB(i.priceSatang)}</td>
                      <td>
                        <span className={`badge ${i.isAvailable ? "bg-success-subtle text-success-emphasis" : "bg-secondary-subtle text-secondary-emphasis"}`}>
                          {i.isAvailable ? "Available" : "Sold out"}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1 justify-content-end">
                          <button className="btn btn-outline-secondary btn-sm" onClick={() => startEdit(c.id, i)} aria-label={`Edit ${i.name}`}>Edit</button>
                          <button className="btn btn-outline-secondary btn-sm" onClick={() => toggle(i)} aria-label={`${i.isAvailable ? "Mark sold out" : "Mark available"} ${i.name}`}>
                            {i.isAvailable ? "Mark sold out" : "Mark available"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </section>
  );
}
