"use client";

// Shared shape for the fulfilment queue (also used by the board + panel).
export interface FulfillmentItem {
  id: string;
  name: string;
  quantity: number;
  image: string | null;
  product?: { sku: string | null } | null;
}

export interface FulfillmentAddress {
  fullName: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

export interface FulfillmentOrder {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  trackingNumber: string | null;
  items: FulfillmentItem[];
  address: FulfillmentAddress | null;
  user: { id: string; name: string | null; email: string } | null;
}

// Print-only packing slip. Hidden on screen (`hidden print:block`); the global
// @media print rules (globals.css) make `.print-area` the only visible content.
// Deliberately omits prices — this goes in the box, not the invoice.
export function PackingSlip({ order }: { order: FulfillmentOrder }) {
  const addr = order.address;
  const date = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="print-area hidden bg-white p-8 text-black print:block">
      <div className="flex items-start justify-between border-b border-black/20 pb-4">
        <div>
          <h1 className="text-xl font-bold">Packing Slip</h1>
          <p className="text-sm">MyShop</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">Order {order.orderNumber}</p>
          <p>{date}</p>
        </div>
      </div>

      <div className="mt-4 text-sm">
        <p className="font-semibold">Ship to</p>
        {addr ? (
          <div className="mt-1 leading-snug">
            <p>{addr.fullName}</p>
            <p>
              {[addr.line1, addr.line2, addr.city, addr.state, addr.postalCode, addr.country]
                .filter(Boolean)
                .join(", ")}
            </p>
            <p>{addr.phone}</p>
          </div>
        ) : (
          <p className="mt-1">{order.user?.name ?? "—"}</p>
        )}
      </div>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/30 text-left">
            <th className="py-1.5">Item</th>
            <th className="py-1.5">SKU</th>
            <th className="py-1.5 text-right">Qty</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it) => (
            <tr key={it.id} className="border-b border-black/10">
              <td className="py-1.5">{it.name}</td>
              <td className="py-1.5">{it.product?.sku ?? "—"}</td>
              <td className="py-1.5 text-right tabular-nums">{it.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Barcode placeholder */}
      <div className="mt-8">
        <div
          className="h-12 w-56"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, #000 0 2px, #fff 2px 4px, #000 4px 5px, #fff 5px 9px)",
          }}
          aria-hidden
        />
        <p className="mt-1 font-mono text-xs tracking-widest">
          *{order.orderNumber}*
        </p>
      </div>
    </div>
  );
}
