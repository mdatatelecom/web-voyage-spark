

# Fix Dashboard Filters

## Problems Identified

1. **Date range select value bug**: When selecting "7 dias", "30 dias", or "90 dias", the select value is computed as `filters.dateRange.from ? 'custom' : 'all'`. Since `'custom'` doesn't match any `SelectItem` value, the dropdown displays incorrectly and can't show the selected option.

2. **Stale state on callback**: `onFiltersChange?.(filters)` is called immediately after `updateDateRange(...)`, but React state updates are asynchronous -- so it passes the **old** filters, not the new ones.

3. **Filters not connected**: In `Dashboard.tsx`, `<DashboardFilters />` is rendered without an `onFiltersChange` prop, so even if it worked, filter changes wouldn't affect any dashboard data.

4. **Visual mismatch**: The reference image shows a clean border style matching the app's orange/primary accent. Minor styling tweaks needed.

## Plan

### 1. Fix DashboardFilters component (`src/components/dashboard/DashboardFilters.tsx`)

- **Fix date range value**: Track the selected period as a separate string state (`'all' | '7days' | '30days' | '90days'`) instead of deriving it from the date object.
- **Fix stale callback**: Use `useEffect` to call `onFiltersChange` whenever `filters` changes, or compute the new filters inline before calling the callback.
- **Style tweaks**: Match the reference image border/accent styling (orange primary border on the filter panel).

### 2. Wire filters to Dashboard (`src/pages/Dashboard.tsx`)

- Pass filter state down or lift it so charts can consume it. For now, ensure `onFiltersChange` prop is provided so the component works correctly when filters are applied.

---

**Technical Details**

In `DashboardFilters.tsx`:
- Add `const [selectedPeriod, setSelectedPeriod] = useState('all')` to track the dropdown value.
- Use `selectedPeriod` as the `Select` value instead of the broken ternary.
- On period change, update both `selectedPeriod` and call `updateDateRange`.
- On `clearFilters`, also reset `selectedPeriod` to `'all'`.

