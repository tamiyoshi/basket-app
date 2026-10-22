export type ProfileRow = {
  id: string;
  display_name: string | null;
  role: "user" | "admin";
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
};

export type CourtRow = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  is_free: boolean;
  hoop_count: number | null;
  surface: string | null;
  facility_tags: string[];
  notes: string | null;
  opening_hours: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
};

export type CourtPhotoRow = {
  id: string;
  court_id: string;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
};

export type ReviewRow = {
  id: string;
  court_id: string;
  author_id: string;
  rating: number;
  comment: string | null;
  created_at: Date;
  updated_at: Date;
};
