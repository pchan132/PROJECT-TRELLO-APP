"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CardItem } from "./card-item";
import { Button } from "./ui/button";
import { Plus, MoreHorizontal, Trash2 } from "lucide-react";
import { ColumnType } from "./board";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface ColumnProps {
  column: ColumnType;
  onAddCard: () => void;
  onDeleteColumn: (columnId: string) => void;
  onDeleteCard: (cardId: string) => void;
  onEditCard: (cardId: string, title: string, description?: string) => void;
}

export function Column({
  column,
  onAddCard,
  onDeleteColumn,
  onDeleteCard,
  onEditCard,
}: ColumnProps) {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  return (
    <div className="min-w-[300px] bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 dark:text-white">
          {column.title}
        </h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onDeleteColumn(column.id)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete list
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div ref={setNodeRef} className="min-h-[200px] space-y-3">
        <SortableContext
          items={column.cards.map((card) => card.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              onDelete={onDeleteCard}
              onEdit={onEditCard}
            />
          ))}
        </SortableContext>
      </div>

      <Button
        onClick={onAddCard}
        variant="ghost"
        className="w-full mt-3 justify-start text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add a card
      </Button>
    </div>
  );
}
