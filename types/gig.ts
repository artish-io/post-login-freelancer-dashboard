export interface Gig {
  id: number;
  name: string;
  title: string;
  category: string;
  skills: string[];
  specializations?: string[]; // ✅ Add this line (optional field)
  rate: string;
  minRate: number;
  maxRate: number;
  location: string;
  rating: number;
}