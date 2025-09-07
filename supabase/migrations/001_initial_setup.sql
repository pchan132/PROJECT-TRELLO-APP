-- Create boards table
CREATE TABLE boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create columns table
CREATE TABLE columns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cards table
CREATE TABLE cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  column_id UUID REFERENCES columns(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_boards_user_id ON boards(user_id);
CREATE INDEX idx_columns_board_id ON columns(board_id);
CREATE INDEX idx_cards_column_id ON cards(column_id);

-- Enable Row Level Security (RLS)
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for boards
CREATE POLICY "Users can view their own boards" ON boards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own boards" ON boards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own boards" ON boards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own boards" ON boards
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for columns
CREATE POLICY "Users can view columns of their boards" ON columns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM boards 
      WHERE boards.id = columns.board_id 
      AND boards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert columns to their boards" ON columns
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards 
      WHERE boards.id = columns.board_id 
      AND boards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update columns of their boards" ON columns
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM boards 
      WHERE boards.id = columns.board_id 
      AND boards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete columns of their boards" ON columns
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM boards 
      WHERE boards.id = columns.board_id 
      AND boards.user_id = auth.uid()
    )
  );

-- Create RLS policies for cards
CREATE POLICY "Users can view cards of their boards" ON cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM columns 
      JOIN boards ON boards.id = columns.board_id
      WHERE columns.id = cards.column_id 
      AND boards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert cards to their boards" ON cards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM columns 
      JOIN boards ON boards.id = columns.board_id
      WHERE columns.id = cards.column_id 
      AND boards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update cards of their boards" ON cards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM columns 
      JOIN boards ON boards.id = columns.board_id
      WHERE columns.id = cards.column_id 
      AND boards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete cards of their boards" ON cards
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM columns 
      JOIN boards ON boards.id = columns.board_id
      WHERE columns.id = cards.column_id 
      AND boards.user_id = auth.uid()
    )
  );

-- Create function to create default columns when a board is created
CREATE OR REPLACE FUNCTION create_default_columns()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO columns (title, board_id, order_index) VALUES
    ('To Do', NEW.id, 0),
    ('In Progress', NEW.id, 1),
    ('Done', NEW.id, 2);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create default columns
CREATE TRIGGER create_default_columns_trigger
  AFTER INSERT ON boards
  FOR EACH ROW
  EXECUTE FUNCTION create_default_columns();
