import { Models } from "react-native-appwrite";

export interface Expenses extends Models.Document {
  user_id: string;
  title: string;
  amount: number;
  category: string;
  notes: string;
  date: string;
  last_reviewed_at?: string | null;
}
