Step 8.1
Admin shell — sidebar, topbar, layout

Copy
Build the admin dashboard shell — the sidebar, topbar, and layout that wrap all admin pages. The (admin) layout guard with requireAdmin() already exists from Phase 4.

Files to create:

1. src/components/admin/AdminSidebar.tsx — "use client":
   - Fixed left sidebar (collapsible on desktop, drawer on mobile)
   - Logo at top
   - Nav sections with lucide icons:
       Dashboard (LayoutDashboard) → /admin/dashboard
       Products (Package) → /admin/dashboard/products
       Categories (FolderTree) → /admin/dashboard/categories
       Orders (ShoppingBag) → /admin/dashboard/orders
       Customers (Users) → /admin/dashboard/users
       Reviews (Star) → /admin/dashboard/reviews
       Error Logs (AlertCircle) → /admin/dashboard/error-logs
         (show unresolved count badge — fetch /api/admin/error-logs?resolved=false&limit=1 for count)
       Site Health (Activity) → /admin/dashboard/health
   - Active link highlighting based on pathname
   - Collapse toggle button (store state in Zustand useSidebar)
   - Bottom: "Back to Store" link → /

2. src/components/admin/AdminTopbar.tsx — "use client":
   - Left: sidebar toggle (mobile) + page breadcrumb
   - Right: search, notifications bell, admin avatar dropdown
       Dropdown: Profile, Settings, Logout (useAuth logout)
   - Sticky top

3. Update src/app/(admin)/layout.tsx:
   - Keep requireAdmin() guard
   - Render: AdminSidebar + (AdminTopbar + main{children}) in a flex layout
   - Responsive: sidebar collapses under 1024px

4. src/hooks/useSidebar.ts — Zustand store:
   - State: { isCollapsed, isMobileOpen }
   - Actions: toggleCollapse, openMobile, closeMobile

5. src/components/admin/AdminPageHeader.tsx:
   Props: { title, description?, action? }
   - Reusable page header: title + optional description + optional action button
   - Used at top of every admin page

Show me all 5 files with full implementation.


Build the admin dashboard overview page with stat cards and revenue charts. Uses the existing /api/admin/stats and /api/admin/stats/revenue endpoints.

# Install charting library
npm install recharts

Files to create:

1. src/app/(admin)/dashboard/page.tsx — server component:
   - Fetch /api/admin/stats server-side
   - generateMetadata(): "Admin Dashboard"
   - Layout sections top to bottom:

   Section 1 — Stat cards (4-col grid):
     Total Revenue (this month) + % change vs last month
     Total Orders + pending count
     Total Products + low stock count
     Total Customers + new this week
   Each card: icon, big number, label, trend indicator (up/down arrow + %)

   Section 2 — Revenue chart (client component, see below)

   Section 3 — Two columns:
     Left: Recent Orders table (last 5, from stats.recentOrders)
       columns: order #, customer, total, status badge, date
     Right: Top Products list (top 5, from stats.topProducts)
       each: rank, name, units sold, revenue

   Section 4 — Order status breakdown:
     Donut chart of orders by status (pending/processing/shipped/delivered)

2. src/components/admin/StatCard.tsx:
   Props: { title, value, icon, trend?, trendLabel?, accent? }
   - Card with icon, value, title, optional trend badge (green up / red down)

3. src/components/admin/RevenueChart.tsx — "use client":
   - Fetch /api/admin/stats/revenue?period=30d
   - Period selector: 7d / 30d / 90d / 1y (updates fetch)
   - recharts AreaChart: x = date, y = revenue
   - Tooltip showing revenue + order count per day
   - Use CSS variables for chart colors (theme-aware)
   - Loading skeleton while fetching

4. src/components/admin/OrderStatusDonut.tsx — "use client":
   Props: { data: { status, count }[] }
   - recharts PieChart (donut style)
   - Color per status matching OrderStatusBadge colors
   - Legend with counts

5. src/app/(admin)/dashboard/loading.tsx:
   - Skeleton: 4 stat cards + chart placeholder

Show me all 5 files with full implementation.



Step 8.2
Overview page — stats cards + revenue charts

Copy
Build the admin overview/dashboard home page using the stats API (/api/admin/stats and /api/admin/stats/revenue) already built in Phase 5.

# Install charting
npm install recharts

Files to create:

1. src/app/(admin)/dashboard/page.tsx — server component:
   - Fetch /api/admin/stats server-side
   - Use DashboardShell with title "Dashboard"
   - Sections top to bottom:

   A. Stat cards row (4 cards):
      Total Revenue (this month) + % change vs last month
      Total Orders + pending count
      Total Products + low stock count
      Total Customers + new this week
      Each card: icon, big number, sublabel, trend arrow (up/down)

   B. Revenue chart (client component RevenueChart):
      Area chart of daily revenue, default 30d
      Period toggle: 7d / 30d / 90d / 1y

   C. Two-column row:
      Left: Recent Orders table (last 5, from stats)
        columns: order#, customer, total, status badge, date
        "View all" link → /admin/dashboard/orders
      Right: Top Products list (top 5 by sales this month)
        product image, name, units sold, revenue

   D. Order status breakdown:
      A small donut/pie chart of orders by status

2. src/components/admin/StatCard.tsx — "use client":
   Props: { title, value, icon, trend?, trendLabel?, accent? }
   - trend positive = green up arrow, negative = red down arrow

3. src/components/admin/RevenueChart.tsx — "use client":
   - Fetches /api/admin/stats/revenue?period=
   - recharts AreaChart, responsive
   - Period toggle buttons update the fetch
   - Tooltip shows date + revenue + order count
   - Loading skeleton while fetching

4. src/components/admin/OrderStatusChart.tsx — "use client":
   - recharts PieChart (donut style)
   - Color per status matching OrderStatusBadge colors
   - Legend with counts

Show me all 4 files with full implementation.



Step 8.3
Product management — list + create/edit form


Build product management — list all products in a table and a create/edit form. Uses the Products API from Phase 5 and the generic DataTable from Step 8.1.

Files to create:

1. src/app/(admin)/dashboard/products/page.tsx — "use client":
   - DashboardShell title "Products", action "Add Product" → /products/new
   - DataTable with columns:
       checkbox (bulk select), image thumb, name, SKU,
       category, price, stock (with low/out badge),
       status toggle (active/inactive), actions
   - Stock cell: red badge if 0, amber if <= lowStockAt, else plain
   - Status toggle: inline switch → PUT /api/products/[id] { isActive }
   - Row actions: Edit → /products/[id]/edit, Delete (confirm dialog)
   - Bulk actions bar when rows selected: bulk delete, bulk activate
   - Search + category filter + pagination (all via DataTable)
   - Fetches GET /api/products with admin filters (include inactive)

2. src/app/(admin)/dashboard/products/new/page.tsx:
   - DashboardShell title "Add Product"
   - Renders ProductForm in create mode

3. src/app/(admin)/dashboard/products/[id]/edit/page.tsx — server component:
   - Fetch product by id server-side
   - Renders ProductForm in edit mode with initial data

4. src/components/admin/ProductForm.tsx — "use client":
   Props: { initialData?, mode: "create" | "edit" }
   - react-hook-form + zod (reuse product schema from Phase 5)
   - Sections:
       Basic: name, slug (auto from name, editable), description (textarea)
       Pricing: price, comparePrice, costPrice
       Inventory: sku, barcode, stock, lowStockAt
       Organization: category select, tags (multi-input), isActive,
         isFeatured switches
       Images: ProductImageUploader (multiple URLs / upload)
   - Submit:
       create → POST /api/products
       edit → PUT /api/products/[id]
   - notifySuccess + redirect to product list on success
   - Show validation errors inline per field

5. src/components/admin/ProductImageUploader.tsx — "use client":
   - Add image by URL or upload (use existing upload API from Phase 5)
   - Preview grid with drag-to-reorder, remove button
   - First image marked as "primary"
   - Stores array of URLs in form state

Show me all 5 files with full implementation.


Step 8.4
Order management — list + detail + status update


Build order management for admin. Uses Orders API from Phase 5 and reuses OrderStatusBadge + OrderStatusTimeline from Phase 7.

Files to create:

1. src/app/(admin)/dashboard/orders/page.tsx — "use client":
   - DashboardShell title "Orders"
   - DataTable columns:
       order#, customer name + email, items count, total,
       payment status badge, order status badge, date, actions
   - Filter tabs: All / Pending / Processing / Shipped / Delivered / Cancelled
   - Filter by payment status: All / Paid / Unpaid / Failed
   - Date range filter (from / to)
   - Search by order number or customer email
   - Row click → /admin/dashboard/orders/[id]
   - Fetches GET /api/orders (admin sees all, from Phase 5)
   - Export button: "Export CSV" of current filtered view (client-side csv)

2. src/app/(admin)/dashboard/orders/[id]/page.tsx — server component:
   - Fetch order by id (admin can see any)
   - Layout: left = order items + customer + address,
             right = status management panel
   - Reuse OrderStatusTimeline (from Phase 7)
   - Status management panel (client component OrderStatusManager):
       Current status display
       Dropdown to change status (valid transitions only)
       "Update Status" → PATCH /api/orders/[id]
       Internal notes textarea
   - Customer info card: name, email, phone, total orders count
   - Print invoice button (window.print with print CSS)

3. src/components/admin/OrderStatusManager.tsx — "use client":
   Props: { orderId, currentStatus }
   - Select with only VALID next statuses based on current
       (e.g. delivered = no further changes)
   - Confirm before changing to "cancelled"
   - notifySuccess + refresh on update
   - Optimistic UI update

4. src/lib/export-csv.ts — utility:
   - exportToCsv(filename, rows): converts array of objects to CSV
   - Triggers browser download via Blob
   - Handles commas/quotes escaping

Show me all 4 files with full implementation.


Step 8.5
User management — roles, ban, audit history


Build user management for admin. Uses Users API from Phase 5. Lets admin change roles, ban/unban, and view a user's audit history.

Files to create:

1. src/app/(admin)/dashboard/users/page.tsx — "use client":
   - DashboardShell title "Users"
   - DataTable columns:
       avatar + name, email, role badge, status (active/banned),
       email verified check, orders count, joined date, actions
   - Filter by role: All / Customer / Shop Manager / Admin / Support
   - Filter by status: All / Active / Banned
   - Search by name or email
   - Row actions: View details, Change role, Ban/Unban
   - Fetches GET /api/users (requireAdmin, from Phase 5)

2. src/app/(admin)/dashboard/users/[id]/page.tsx — server component:
   - Fetch single user with audit summary (from Phase 5 GET /api/users/[id])
   - Cards: profile info, role + status management, stats
       (total orders, total spent, reviews written, member since)
   - Recent audit log table for this user (last 20 actions)
     columns: action, status, IP, date

3. src/components/admin/UserRoleManager.tsx — "use client":
   Props: { userId, currentRole, isActive }
   - Role dropdown (customer / shop_manager / admin / support)
     "Update Role" → PATCH /api/users/[id] { role }
     Confirm dialog warning when promoting to admin
   - Ban toggle:
       If active: "Ban User" → opens dialog asking for reason
         → PATCH /api/users/[id] { isActive: false, bannedReason }
       If banned: "Unban User" → PATCH { isActive: true }
   - Cannot change own role/status (disable if userId === current admin)
   - All actions logged via logAudit (Phase 4 service)

Show me all 3 files with full implementation.

=================== Done above =============




Step 8.6 — Review moderation + Categories management
Build review moderation and category management for admin.

GROUP 1 — Reviews moderation:

1. src/app/(admin)/dashboard/reviews/page.tsx — "use client":
   - DashboardShell title "Reviews"
   - DataTable columns: product (image + name), customer, rating stars,
     title + body preview, visible toggle, date, actions
   - Filter: All / Visible / Hidden, by rating (1-5 stars)
   - Search by product name or review content
   - Visible toggle: inline switch → PATCH /api/reviews/[id] { isVisible }
     (add this PATCH handler to Reviews API if not present)
   - Row actions: View full review (dialog), Hide/Show, Delete
   - Used for hiding spam or abusive reviews

GROUP 2 — Categories management:

2. src/app/(admin)/dashboard/categories/page.tsx — "use client":
   - DashboardShell title "Categories", action "Add Category"
   - Tree view of categories (parent → children nested)
     Reuses GET /api/categories tree from Phase 5
   - Each node: name, slug, product count, active toggle, edit, delete
   - Reorder via up/down buttons (updates sortOrder)
   - Delete blocked if category has products (show error toast)

3. src/components/admin/CategoryForm.tsx — "use client":
   - Dialog form: name, slug (auto from name), description,
     parent select, image URL, isActive, sortOrder
   - create → POST /api/categories, edit → PUT /api/categories/[id]
   - Parent select excludes self and own children (prevent cycles)

Show me all 3 files with full implementation.


Step 8.7 — Site health page + final verify loop
Build the admin site health page and run the full Phase 8 verify loop.

1. src/app/(admin)/dashboard/health/page.tsx — "use client":
   - DashboardShell title "Site Health"
   - Polls GET /api/health every 30 seconds (from earlier setup)
   - Status banner: green "All systems operational" /
     amber "Degraded" / red "Down"
   - Cards:
       Database: status + response time
       Memory: used / total with a progress bar
       Uptime: formatted (Xd Xh Xm)
       App version: from package.json
   - Recent errors widget: last 5 from /api/admin/error-logs
     with "View all" → /admin/dashboard/error-logs
   - Web vitals summary if available (CLS, LCP, FCP)
   - Manual "Refresh now" button

The Error Logs page already exists from the earlier H.4 step —
just confirm its sidebar link works and it's reachable at
/admin/dashboard/error-logs.

2. Final Phase 8 verify loop:
   LOOP:
     1. npm run build → fix TS errors (recharts types, generic DataTable<T>)
     2. npm test → add admin component tests:
        - StatCard renders value + trend
        - DataTable renders rows, shows empty state, handles pagination
        - OrderStatusManager only shows valid next statuses
     3. npm run test:e2e → add admin smoke test:
        - Login as admin@shop.com
        - Visit /admin/dashboard → expect stat cards visible
        - Visit /admin/dashboard/products → expect product table rows
        - Visit /admin/dashboard/orders → expect order table rows
        - Non-admin user visiting /admin → expect redirect to /403
     4. npm run lint → fix

3. Final checklist:
   ✓ Admin sidebar + topbar render, collapse works
   ✓ Overview shows stat cards + revenue chart + recent orders
   ✓ Products: list, create, edit, delete, stock badges work
   ✓ Orders: list, filter, detail, status update work
   ✓ Users: list, change role, ban/unban, audit history work
   ✓ Reviews: moderation hide/show/delete work
   ✓ Categories: tree view, create, edit, delete work
   ✓ Site health page shows live status
   ✓ Error logs page reachable from sidebar
   ✓ Non-admin redirected from /admin
   ✓ Build clean, all tests passing