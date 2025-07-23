export interface Gig {
  id: number;
  userId?: number; // ✅ Add userId field from freelancer data
  name: string;
  title: string;
  category: string;
  skills: string[];
  tools?: string[]; // ✅ Add tools field for freelancers with separate tools array
  specializations?: string[]; // ✅ Add this line (optional field)
  rate: string;
  minRate: number;
  maxRate: number;
  location: string;
  rating: number;
  avatar?: string; // ✅ Add avatar field from user data
  email?: string; // ✅ Add email field from user data
  address?: string; // ✅ Add address field from user data
}