"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
// import { Textarea } from "./ui/textarea";
import { MoreHorizontal, Trash2, Edit, Save, X } from "lucide-react";
import { CardType } from "./board";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface CardItemProps {
  card: CardType;
  onDelete: (cardId: string) => void;
  onEdit: (cardId: string, title: string, description?: string) => void;
}

export function CardItem({ card, onDelete, onEdit }: CardItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [editDescription, setEditDescription] = useState(
    card.description || ""
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    if (editTitle.trim()) {
      onEdit(card.id, editTitle.trim(), editDescription.trim() || undefined);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditTitle(card.title);
    setEditDescription(card.description || "");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <Card
        ref={setNodeRef}
        style={style}
        className="group p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
      >
        <div className="space-y-2">
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Card title"
            autoFocus
            className="text-sm font-medium"
          />
          <textarea
            value={editDescription}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setEditDescription(e.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder="Card description (optional)"
            className="text-sm min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" onClick={handleSave} disabled={!editTitle.trim()}>
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="group p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0" {...attributes} {...listeners}>
          <h4 className="font-medium text-gray-800 dark:text-white mb-1 break-words">
            {card.title}
          </h4>
          {card.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 break-words">
              {card.description}
            </p>
          )}
        </div>

        <div
          className="flex-shrink-0 flex gap-1"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-100 hover:bg-blue-100 dark:hover:bg-blue-600"
            onClick={() => {
              console.log("✏️ Edit button clicked!");
              alert("Edit button clicked!");
              setIsEditing(true);
            }}
            title="Edit card"
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-100 hover:bg-red-100 dark:hover:bg-red-600 text-red-600"
            onClick={() => {
              console.log("🗑️ Delete button clicked!");
              alert("Delete button clicked!");
              onDelete(card.id);
            }}
            title="Delete card"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
