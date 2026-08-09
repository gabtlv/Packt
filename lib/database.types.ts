/**
 * Types for the Card Binder schema.
 *
 * Hand-written to match supabase/migrations/*.sql. Once a project is linked these
 * can be regenerated instead:
 *   npx supabase gen types typescript --linked > lib/database.types.ts
 */

export type BorderVariant =
  | "amber"
  | "cyan"
  | "violet"
  | "rose"
  | "lime"
  | "slate";

export type Rarity = "common" | "rare" | "holo";

export type CardRow = {
  id: string;
  pack_id: string;
  owner_id: string;
  serial: number;
  photo_path: string;
  thumb_path: string;
  border_variant: BorderVariant;
  rarity: Rarity;
  display_name: string;
  school_or_work: string | null;
  favorite_media: string | null;
  social_label: string | null;
  social_url: string | null;
  prompt_1_key: string;
  prompt_1_answer: string;
  prompt_2_key: string;
  prompt_2_answer: string;
  fun_fact: string;
  created_at: string;
};

export type PackRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  accent: string;
  card_count: number;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
};

export type PullRow = {
  id: string;
  pack_id: string;
  user_id: string;
  card_id: string;
  created_at: string;
};

export type PackGrantRow = {
  id: string;
  user_id: string;
  pack_id: string;
  reason: string;
  source_card_id: string | null;
  consumed_at: string | null;
  created_at: string;
}

/** Fields the client supplies when contributing. The rest are set server-side. */
export type CardInsert = Omit<CardRow, "id" | "serial" | "created_at" | "rarity"> & {
  rarity?: Rarity;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string; display_name: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      packs: {
        Row: PackRow;
        Insert: Partial<PackRow> & { slug: string; name: string };
        Update: Partial<PackRow>;
        Relationships: [];
      };
      cards: {
        Row: CardRow;
        Insert: CardInsert;
        Update: Partial<CardRow>;
        Relationships: [];
      };
      // pulls and pack_grants are readable but have no INSERT policy: only the
      // security-definer functions write them. RLS is what enforces that, so these
      // Insert shapes exist to satisfy the client's types, not to be used.
      pulls: {
        Row: PullRow;
        Insert: Omit<PullRow, "id" | "created_at">;
        Update: Partial<PullRow>;
        Relationships: [];
      };
      pack_grants: {
        Row: PackGrantRow;
        Insert: Omit<PackGrantRow, "id" | "created_at">;
        Update: Partial<PackGrantRow>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      open_pack: {
        Args: { p_pack_id: string };
        Returns: CardRow;
      };
      binder_cards: {
        Args: { p_pack_id: string; p_collector?: string | null };
        Returns: CardRow[];
      };
      my_pack_status: {
        Args: { p_pack_id: string };
        Returns: { contribution_count: number; unopened_packs: number }[];
      };
      ensure_my_profile: {
        Args: Record<string, never>;
        Returns: ProfileRow;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}
