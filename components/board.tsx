"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Column } from "./column";
import { Button } from "./ui/button";
import { Plus } from "lucide-react";
import { AddColumnDialog } from "./add-column-dialog";
import { AddCardDialog } from "./add-card-dialog";
import { useLocalStorage } from "../hooks/use-local-storage";

export interface CardType {
  id: string;
  title: string;
  description?: string;
  columnId: string;
  order: number;
}

export interface ColumnType {
  id: string;
  title: string;
  order: number;
  cards: CardType[];
}

export function Board() {
  const initialColumns: ColumnType[] = [
    {
      id: "todo",
      title: "To Do",
      order: 0,
      cards: [
        {
          id: "1",
          title: "Task 1",
          description: "Description for task 1",
          columnId: "todo",
          order: 0,
        },
        {
          id: "2",
          title: "Task 2",
          description: "Description for task 2",
          columnId: "todo",
          order: 1,
        },
      ],
    },
    {
      id: "in-progress",
      title: "In Progress",
      order: 1,
      cards: [
        {
          id: "3",
          title: "Task 3",
          description: "Description for task 3",
          columnId: "in-progress",
          order: 0,
        },
      ],
    },
    {
      id: "done",
      title: "Done",
      order: 2,
      cards: [
        {
          id: "4",
          title: "Task 4",
          description: "Description for task 4",
          columnId: "done",
          order: 0,
        },
      ],
    },
  ];

  const [columns, setColumns] = useLocalStorage<ColumnType[]>(
    "trello-board",
    initialColumns
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [showAddCard, setShowAddCard] = useState<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the active card
    const activeCard = findCard(activeId);
    if (!activeCard) return;

    // Find the over column or card
    const overColumn = findColumn(overId);
    const overCard = findCard(overId);

    if (!overColumn && !overCard) return;

    const targetColumnId = overColumn?.id || overCard?.columnId;
    if (!targetColumnId || activeCard.columnId === targetColumnId) return;

    setColumns((prev) => {
      const activeColumn = prev.find((col) => col.id === activeCard.columnId)!;
      const targetColumn = prev.find((col) => col.id === targetColumnId)!;

      // Remove card from active column
      const newActiveCards = activeColumn.cards.filter(
        (card) => card.id !== activeId
      );

      // Add card to target column
      const newTargetCards = [
        ...targetColumn.cards,
        { ...activeCard, columnId: targetColumnId },
      ];

      return prev.map((col) => {
        if (col.id === activeColumn.id) {
          return { ...col, cards: newActiveCards };
        }
        if (col.id === targetColumn.id) {
          return { ...col, cards: newTargetCards };
        }
        return col;
      });
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeCard = findCard(activeId);
    if (!activeCard) return;

    const overCard = findCard(overId);
    const overColumn = findColumn(overId);

    if (overCard && activeCard.columnId === overCard.columnId) {
      // Reordering within the same column
      setColumns((prev) => {
        return prev.map((col) => {
          if (col.id === activeCard.columnId) {
            const oldIndex = col.cards.findIndex(
              (card) => card.id === activeId
            );
            const newIndex = col.cards.findIndex((card) => card.id === overId);
            const newCards = arrayMove(col.cards, oldIndex, newIndex);
            return { ...col, cards: newCards };
          }
          return col;
        });
      });
    }
  };

  const findCard = (id: string): CardType | undefined => {
    for (const column of columns) {
      const card = column.cards.find((card) => card.id === id);
      if (card) return card;
    }
  };

  const findColumn = (id: string): ColumnType | undefined => {
    return columns.find((column) => column.id === id);
  };

  const addColumn = (title: string) => {
    const newColumn: ColumnType = {
      id: `column-${Date.now()}`,
      title,
      order: columns.length,
      cards: [],
    };
    setColumns([...columns, newColumn]);
    setShowAddColumn(false);
  };

  const addCard = (columnId: string, title: string, description?: string) => {
    const newCard: CardType = {
      id: `card-${Date.now()}`,
      title,
      description,
      columnId,
      order: columns.find((col) => col.id === columnId)?.cards.length || 0,
    };

    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId ? { ...col, cards: [...col.cards, newCard] } : col
      )
    );
    setShowAddCard(null);
  };

  const deleteCard = (cardId: string) => {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        cards: col.cards.filter((card) => card.id !== cardId),
      }))
    );
  };

  const deleteColumn = (columnId: string) => {
    setColumns((prev) => prev.filter((col) => col.id !== columnId));
  };

  return (
    <div className="h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          My Trello Board
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Organize your tasks and projects
        </p>
      </div>

      <DndContext
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        collisionDetection={closestCorners}
      >
        <div className="flex gap-6 overflow-x-auto pb-6">
          {columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              onAddCard={() => setShowAddCard(column.id)}
              onDeleteColumn={deleteColumn}
              onDeleteCard={deleteCard}
            />
          ))}

          <div className="min-w-[300px]">
            <Button
              onClick={() => setShowAddColumn(true)}
              variant="outline"
              className="w-full h-12 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add another list
            </Button>
          </div>
        </div>
      </DndContext>

      <AddColumnDialog
        open={showAddColumn}
        onOpenChange={setShowAddColumn}
        onAdd={addColumn}
      />

      {showAddCard && (
        <AddCardDialog
          open={!!showAddCard}
          onOpenChange={() => setShowAddCard(null)}
          onAdd={(title: string, description?: string) =>
            addCard(showAddCard, title, description)
          }
        />
      )}
    </div>
  );
}
