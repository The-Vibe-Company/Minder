export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};
export type List = {
  id: string;
  owner_id: string;
  title: string;
  created_at: string;
};
export type Member = {
  list_id: string;
  user_id: string;
  role: "owner" | "guest";
  created_at: string;
};
export type Invite = {
  id: string;
  list_id: string;
  token: string;
  created_by: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};
export type Item = {
  id: string;
  list_id: string;
  created_by: string;
  photo_path: string;
  title: string | null;
  description: string | null;
  description_auto: string | null;
  embedding: string | null;
  embedding_model: string | null;
  fts: string | null;
  created_at: string;
  updated_at: string;
};
export type Vote = {
  id: string;
  item_id: string;
  list_id: string;
  user_id: string;
  choice: "yes" | "no";
  created_at: string;
  updated_at: string;
};
type Table<R, Required extends keyof R> = {
  Row: R;
  Insert: Partial<R> & Pick<R, Required>;
  Update: Partial<R>;
  Relationships: [];
};
type SearchItem = Pick<Item, "id" | "list_id" | "photo_path" | "title" | "description">;
export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, "id">;
      lists: Table<List, "title">;
      list_members: Table<Member, "list_id" | "user_id" | "role">;
      invites: Table<Invite, "list_id">;
      items: Table<Item, "list_id" | "photo_path">;
      votes: Table<Vote, "item_id" | "list_id" | "choice">;
    };
    Views: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
    Functions: {
      invite_preview: {
        Args: { p_token: string };
        Returns: {
          list_id: string;
          list_title: string;
          owner_name: string | null;
          expired: boolean;
        }[];
      };
      accept_invite: { Args: { p_token: string }; Returns: string };
      items_to_swipe: {
        Args: { p_list_id: string; p_limit?: number };
        Returns: Item[];
      };
      search_items_text: {
        Args: { p_list_id: string; p_query: string; p_limit?: number };
        Returns: (SearchItem & { rank: number })[];
      };
      is_list_member: { Args: { p_list_id: string }; Returns: boolean };
      is_list_owner: { Args: { p_list_id: string }; Returns: boolean };
    };
  };
};
