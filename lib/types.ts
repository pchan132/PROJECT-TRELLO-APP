export interface BoardData {
  id: string;
  title: string;
  description?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  columns?: ColumnData[];
}

export interface ColumnData {
  id: string;
  title: string;
  board_id: string;
  order_index: number;
  created_at: string;
  updated_at: string;
  cards?: CardData[];
}

export interface CardData {
  id: string;
  title: string;
  description?: string;
  column_id: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      boards: {
        Row: BoardData;
        Insert: Omit<BoardData, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<BoardData, "id" | "created_at" | "updated_at">>;
      };
      columns: {
        Row: ColumnData;
        Insert: Omit<ColumnData, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ColumnData, "id" | "created_at" | "updated_at">>;
      };
      cards: {
        Row: CardData;
        Insert: Omit<CardData, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<CardData, "id" | "created_at" | "updated_at">>;
      };
    };
  };
}
