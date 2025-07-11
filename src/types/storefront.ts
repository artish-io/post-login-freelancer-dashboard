// Represents a single product listed for sale
export type ProductSale = {
  id: string;                                // Unique product ID
  title: string;                             // Product title
  category: string;                          // E.g. "Digital Course", "Publication"
  status: 'Approved' | 'Pending' | 'Rejected'; // Moderation/approval status
  price: number;                             // Unit price in dollars
  unitsSold: number | null;                  // Total units sold, null if not yet released
  releaseDate: string | null;                // ISO date string or null
};

// Represents the storefront dashboard summary (used in summary.json)
export type StoreSummary = {
  revenue: number;          // Total revenue in dollars
  revenueChange: number;    // % change from previous period
  growthRate: number;       // MoM user/growth rate
  growthChange: number;     // % change in growth
  orders: number;           // Total number of orders
  ordersChange: number;     // % change in order count
};