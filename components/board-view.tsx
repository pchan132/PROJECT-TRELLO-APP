"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { createClient } from "@/lib/supabase/client";
import { BoardData, ColumnData, CardData } from "@/lib/types";
import { Column } from "./column";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Plus, ArrowLeft, Trash2, Edit, Save, X } from "lucide-react";
import { AddColumnDialog } from "./add-column-dialog";
import { AddCardDialog } from "./add-card-dialog";
import Link from "next/link";

interface BoardViewProps {
  boardId: string;
}

export function BoardView({ boardId }: BoardViewProps) {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [columns, setColumns] = useState<ColumnData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [deletingBoard, setDeletingBoard] = useState(false);
  const [editingBoard, setEditingBoard] = useState(false);
  const [editBoardTitle, setEditBoardTitle] = useState("");
  const [editBoardDescription, setEditBoardDescription] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedCard, setDraggedCard] = useState<CardData | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [showAddCard, setShowAddCard] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  // Add debug info for Supabase connection
  useEffect(() => {
    console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("Board ID:", boardId);
  }, [boardId]);

  useEffect(() => {
    fetchBoardData();
  }, [boardId]);

  const fetchBoardData = async () => {
    try {
      console.log("Fetching board data...");
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log("No user found, redirecting to login");
        router.push("/auth/login");
        return;
      }

      console.log("User found:", user.id);

      // Fetch board
      const { data: boardData, error: boardError } = await supabase
        .from("boards")
        .select("*")
        .eq("id", boardId)
        .eq("user_id", user.id)
        .single();

      if (boardError || !boardData) {
        console.error("Error fetching board:", boardError);
        router.push("/");
        return;
      }

      console.log("Board data fetched:", boardData.title);
      setBoard(boardData);

      // Fetch columns with cards
      const { data: columnsData, error: columnsError } = await supabase
        .from("columns")
        .select(
          `
          *,
          cards (*)
        `
        )
        .eq("board_id", boardId)
        .order("order_index", { ascending: true });

      if (columnsError) {
        console.error("Error fetching columns:", columnsError);
        return;
      }

      console.log("Columns data fetched:", columnsData?.length || 0, "columns");

      // Sort cards within each column
      const sortedColumns = (columnsData || []).map((column) => ({
        ...column,
        cards: (column.cards || []).sort(
          (a: CardData, b: CardData) => a.order_index - b.order_index
        ),
      }));

      console.log("Setting columns with cards from database:");
      sortedColumns.forEach((col) => {
        console.log(`📂 Column: ${col.title} (ID: ${col.id})`);
        if (col.cards && col.cards.length > 0) {
          col.cards.forEach((card: CardData) => {
            console.log(
              `  📄 Card: "${card.title}" (ID: ${card.id}, order: ${card.order_index}, column: ${card.column_id})`
            );
          });
        } else {
          console.log(`  ❌ No cards in this column`);
        }
      });

      setColumns(sortedColumns);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = event.active.id as string;
    setActiveId(activeId);

    // Store the original card data before any state changes
    const originalCard = findCard(activeId);
    setDraggedCard(originalCard || null);

    console.log(
      "Drag started for card:",
      activeId,
      "Original card:",
      originalCard
    );
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Simplified drag over - only show visual feedback without state updates
    // This prevents unnecessary re-renders during dragging
    const { active, over } = event;
    if (!over || !active) return;

    // Just log for debugging, no state changes
    // console.log("Drag over:", active.id, "->", over.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) {
      console.log("No drop target found");
      setDraggedCard(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    console.log("Drag ended:", { activeId, overId });

    // Use the stored draggedCard instead of findCard to avoid state confusion
    const activeCard = draggedCard;
    if (!activeCard) {
      console.log("Active card not found in draggedCard:", activeId);
      setDraggedCard(null);
      return;
    }

    const overCard = findCard(overId);
    const overColumn = findColumn(overId);

    // Determine target column
    const targetColumnId = overColumn?.id || overCard?.column_id;

    console.log("Drag end details:", {
      activeCard: activeCard.id,
      activeCardTitle: activeCard.title,
      activeColumn: activeCard.column_id,
      targetColumnId,
      overCard: overCard?.id,
      overCardTitle: overCard?.title,
      overColumn: overColumn?.id,
      isOverCard: !!overCard,
      isOverColumn: !!overColumn,
      isDifferentColumn: activeCard.column_id !== targetColumnId,
    });

    // Check if we're actually moving to a different position
    if (activeId === overId && !overColumn) {
      console.log("Dropped on same card - no movement needed");
      setDraggedCard(null);
      return;
    }

    // Check if target column exists
    if (!targetColumnId) {
      console.log("❌ No valid target column found");
      setDraggedCard(null);
      return;
    }

    // Log what action we're taking
    if (overCard && activeCard.column_id === overCard.column_id) {
      console.log("🔄 Reordering within same column");
    } else if (targetColumnId && activeCard.column_id !== targetColumnId) {
      console.log(
        `🚀 Moving between different columns: ${activeCard.column_id} → ${targetColumnId}`
      );
    } else {
      console.log("❓ Unclear movement scenario");
    }

    if (overCard && activeCard.column_id === overCard.column_id) {
      // Reordering within the same column
      console.log("🔄 Reordering within same column");

      const activeColumn = findColumn(activeCard.column_id);
      if (!activeColumn) {
        console.error("❌ Active column not found");
        setDraggedCard(null);
        return;
      }

      const cards = activeColumn.cards || [];
      const oldIndex = cards.findIndex((card) => card.id === activeId);
      const newIndex = cards.findIndex((card) => card.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newCards = arrayMove(cards, oldIndex, newIndex);

        // Update state immediately for responsive UI
        setColumns((prev) => {
          return prev.map((col) => {
            if (col.id === activeCard.column_id) {
              return { ...col, cards: newCards };
            }
            return col;
          });
        });

        try {
          // Update order_index in database
          await updateCardOrder(newCards);
          console.log("✅ Same-column reorder completed successfully");
        } catch (error) {
          console.error("❌ Error updating card order:", error);
          alert("Error updating card order. Refreshing...");
        }

        // Always refresh from database to ensure consistency
        console.log("🔄 Refreshing data after same-column reorder...");
        await fetchBoardData();
      }
    } else if (activeCard.column_id !== targetColumnId) {
      // Moving to different column - calculate correct position and save to database
      console.log(
        `🚀 Moving to different column: ${activeCard.column_id} → ${targetColumnId}`
      );

      try {
        // Set processing state
        setProcessing(true);

        // Get the target column
        const targetColumn = findColumn(targetColumnId);
        let dropPosition = 0;

        if (overCard && overCard.column_id === targetColumnId) {
          // Find the position of the card we're dropping over in the target column
          const targetCards = targetColumn?.cards || [];
          const overCardIndex = targetCards.findIndex(
            (card) => card.id === overCard.id
          );

          // Insert before the card we're dropping over
          dropPosition =
            overCardIndex >= 0 ? overCardIndex : targetCards.length;
          console.log(
            `📍 Dropping over card "${overCard.title}" at position ${dropPosition} in target column`
          );
        } else {
          // Dropping on empty column or at the end
          dropPosition = (targetColumn?.cards || []).length;
          console.log(
            `📍 Dropping at end of column at position ${dropPosition}`
          );
        }

        console.log(`🎯 Final drop position: ${dropPosition}`);
        console.log(
          `📋 Target column cards count: ${(targetColumn?.cards || []).length}`
        );
        await moveCardToColumn(activeId, targetColumnId, dropPosition);

        console.log("✅ Card movement completed successfully");
      } catch (error) {
        console.error("❌ Error during card movement:", error);
        alert("Error moving card. Please try again.");
        // Refresh to restore correct state
        await fetchBoardData();
      } finally {
        // Always clear processing state
        setProcessing(false);
      }
    } else {
      console.log("No valid drop target found");
    }

    setDraggedCard(null);
  };

  const findCard = (id: string): CardData | undefined => {
    for (const column of columns) {
      const card = (column.cards || []).find((card) => card.id === id);
      if (card) return card;
    }
  };

  const findColumn = (id: string): ColumnData | undefined => {
    return columns.find((column) => column.id === id);
  };

  const moveCardToColumn = async (
    cardId: string,
    newColumnId: string,
    dropPosition?: number
  ) => {
    try {
      console.log(
        `🚀 Starting moveCardToColumn: ${cardId} to ${newColumnId} at position ${
          dropPosition ?? "end"
        }`
      );

      // Optimistic UI update first for better user experience
      console.log("⚡ Applying optimistic UI update...");
      setColumns((prev) => {
        const newColumns = [...prev];
        let cardToMove: CardData | null = null;

        // Find and remove the card from its current column
        for (const column of newColumns) {
          const cardIndex = (column.cards || []).findIndex(
            (c) => c.id === cardId
          );
          if (cardIndex !== -1) {
            cardToMove = (column.cards || [])[cardIndex];
            column.cards = (column.cards || []).filter((c) => c.id !== cardId);
            break;
          }
        }

        // Add the card to the new column
        if (cardToMove) {
          const targetColumn = newColumns.find((c) => c.id === newColumnId);
          if (targetColumn) {
            const updatedCard = { ...cardToMove, column_id: newColumnId };
            if (dropPosition !== undefined) {
              targetColumn.cards = targetColumn.cards || [];
              targetColumn.cards.splice(dropPosition, 0, updatedCard);
            } else {
              targetColumn.cards = [...(targetColumn.cards || []), updatedCard];
            }
          }
        }

        return newColumns;
      });

      // Now proceed with database operations
      console.log("🔌 Testing Supabase connection...");
      const { data: connectionTest, error: connectionError } = await supabase
        .from("cards")
        .select("count")
        .limit(1);

      if (connectionError) {
        console.error("❌ Supabase connection failed:", connectionError);
        alert(`Database connection error: ${connectionError.message}`);
        return;
      }

      console.log("✅ Supabase connection successful");

      // Check user authentication
      console.log("👤 Checking user authentication...");
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("❌ User authentication failed:", authError);
        alert("Please log in again. Authentication expired.");
        return;
      }

      console.log("✅ User authenticated:", user.id);

      // Get current card data from database BEFORE update
      console.log(`🔍 Fetching current card data for: ${cardId}`);
      const { data: currentCard, error: cardError } = await supabase
        .from("cards")
        .select("id, column_id, order_index, title")
        .eq("id", cardId)
        .single();

      if (cardError || !currentCard) {
        console.error("❌ Failed to fetch current card:", cardError);
        alert(
          "Database connection error. Please check your internet connection and try again."
        );
        return;
      }

      console.log("📋 Current card data from DB (BEFORE):", {
        id: currentCard.id,
        title: currentCard.title,
        column_id: currentCard.column_id,
        order_index: currentCard.order_index,
      });

      // Get current cards count in target column from database
      console.log(`🔍 Fetching target column cards for column: ${newColumnId}`);
      const { data: targetColumnCards, error: targetError } = await supabase
        .from("cards")
        .select("id, title, order_index")
        .eq("column_id", newColumnId)
        .order("order_index", { ascending: true });

      if (targetError) {
        console.error("❌ Failed to fetch target column cards:", targetError);
        alert("Database connection error. Please try again.");
        return;
      }

      console.log(
        `📊 Target column ${newColumnId} currently has ${
          targetColumnCards?.length || 0
        } cards:`,
        targetColumnCards?.map((card) => ({
          id: card.id,
          title: card.title,
          order_index: card.order_index,
        }))
      );

      // Calculate new order index based on drop position
      let newOrderIndex: number;
      if (dropPosition !== undefined && dropPosition >= 0) {
        // Insert at specific position - we need to shift other cards
        newOrderIndex = dropPosition;
        console.log(`📍 Inserting card at position ${dropPosition}`);

        // First, shift existing cards in target column to make room
        console.log(
          `🔄 Shifting cards in target column to make room at position ${dropPosition}`
        );
        if (targetColumnCards && targetColumnCards.length > 0) {
          // Update all cards at position >= dropPosition to have order_index + 1
          const cardsToShift = targetColumnCards.filter(
            (card) => card.order_index >= dropPosition
          );
          console.log(
            `📦 Cards to shift: ${cardsToShift.length}`,
            cardsToShift.map((c) => `"${c.title}" (${c.order_index})`)
          );

          for (const card of cardsToShift) {
            const newPosition = card.order_index + 1;
            console.log(
              `🔄 Shifting "${card.title}": ${card.order_index} → ${newPosition}`
            );

            const { error: shiftError } = await supabase
              .from("cards")
              .update({
                order_index: newPosition,
                updated_at: new Date().toISOString(),
              })
              .eq("id", card.id);

            if (shiftError) {
              console.error(
                `❌ Error shifting card "${card.title}":`,
                shiftError
              );
            } else {
              console.log(
                `✅ Shifted card "${card.title}" to position ${newPosition}`
              );
            }
          }
        }
      } else {
        // Add to end of column
        newOrderIndex = targetColumnCards?.length || 0;
        console.log(`📍 Adding card at end (position ${newOrderIndex})`);
      }

      console.log(`📤 Attempting to update card "${currentCard.title}":`, {
        from: {
          column_id: currentCard.column_id,
          order_index: currentCard.order_index,
        },
        to: { column_id: newColumnId, order_index: newOrderIndex },
      });

      // Perform the database update with retry mechanism
      let updateSuccess = false;
      let retryCount = 0;
      const maxRetries = 3;

      while (!updateSuccess && retryCount < maxRetries) {
        retryCount++;
        console.log(
          `🔄 Attempt ${retryCount}/${maxRetries} to update database...`
        );

        const { data, error } = await supabase
          .from("cards")
          .update({
            column_id: newColumnId,
            order_index: newOrderIndex,
            updated_at: new Date().toISOString(),
          })
          .eq("id", cardId)
          .select("*");

        console.log(`📊 Database update response (attempt ${retryCount}):`, {
          data,
          error,
        });

        if (error) {
          console.error(`❌ Database error on attempt ${retryCount}:`, error);
          if (retryCount === maxRetries) {
            alert(
              `Database error after ${maxRetries} attempts: ${error.message}`
            );
            await fetchBoardData();
            return;
          }
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          updateSuccess = true;
          console.log(
            `✅ Card updated successfully on attempt ${retryCount}:`,
            data?.[0]
          );

          // Immediate verification - fetch card AFTER update
          console.log("🔍 Verifying update in database...");
          const { data: verifyData, error: verifyError } = await supabase
            .from("cards")
            .select("id, title, column_id, order_index, updated_at")
            .eq("id", cardId)
            .single();

          if (verifyError) {
            console.error("❌ Failed to verify card update:", verifyError);
          } else {
            console.log(`✅ Verified card in database (AFTER):`, {
              id: verifyData.id,
              title: verifyData.title,
              column_id: verifyData.column_id,
              order_index: verifyData.order_index,
              updated_at: verifyData.updated_at,
            });

            // Check if the update was actually applied
            if (
              verifyData.column_id === newColumnId &&
              verifyData.order_index === newOrderIndex
            ) {
              console.log("🎉 Database update confirmed successfully!");
              console.log(
                `✨ Card "${verifyData.title}" is now in column ${verifyData.column_id} at position ${verifyData.order_index}`
              );
            } else {
              console.error(
                "❌ Database update verification failed!",
                "\n📝 Expected:",
                { column_id: newColumnId, order_index: newOrderIndex },
                "\n📋 Actual:",
                {
                  column_id: verifyData.column_id,
                  order_index: verifyData.order_index,
                }
              );
              // Force a manual update if verification fails
              console.log("🔧 Attempting manual correction...");
              const { error: correctError } = await supabase
                .from("cards")
                .update({
                  column_id: newColumnId,
                  order_index: newOrderIndex,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", cardId);

              if (correctError) {
                console.error("❌ Manual correction failed:", correctError);
              } else {
                console.log("✅ Manual correction successful");
              }
            }
          }
        }
      }

      // Reorder cards in both source and target columns (optimized)
      if (currentCard.column_id !== newColumnId) {
        console.log(`🔄 Card moved between columns - cleaning up both columns`);

        // Run reordering in background to improve performance
        console.log(`🧹 Cleaning up source column ${currentCard.column_id}`);
        reorderCardsInColumn(currentCard.column_id).catch((error) =>
          console.error("Error reordering source column:", error)
        );

        console.log(`🔍 Verifying target column ${newColumnId} order`);
        reorderCardsInColumn(newColumnId).catch((error) =>
          console.error("Error reordering target column:", error)
        );
      } else {
        console.log(`🔄 Reordering cards within same column ${newColumnId}`);
        reorderCardsInColumn(newColumnId).catch((error) =>
          console.error("Error reordering same column:", error)
        );
      }

      // Delayed refresh to allow database operations to complete
      console.log("🔄 Scheduling board data refresh...");
      setTimeout(() => {
        fetchBoardData().catch((error) =>
          console.error("Error refreshing board data:", error)
        );
      }, 300);
    } catch (error) {
      console.error("Error moving card:", error);
      alert(`Unexpected error: ${error}`);
      await fetchBoardData();
    }
  };
  const reorderCardsInColumn = async (columnId: string) => {
    try {
      console.log(`🔄 Starting reorderCardsInColumn for column: ${columnId}`);

      // Get all cards in the column from database, ordered by current order_index
      const { data: cardsInColumn, error } = await supabase
        .from("cards")
        .select("id, order_index, title")
        .eq("column_id", columnId)
        .order("order_index", { ascending: true });

      if (error) {
        console.error("❌ Error fetching cards for reordering:", error);
        return;
      }

      console.log(
        `📋 Found ${cardsInColumn?.length || 0} cards in column ${columnId}:`
      );
      cardsInColumn?.forEach((card, index) => {
        console.log(
          `  ${index}: "${card.title}" (current order: ${card.order_index})`
        );
      });

      // Update order_index for each card to be sequential (0, 1, 2, ...)
      if (cardsInColumn && cardsInColumn.length > 0) {
        console.log(
          `📝 Updating order_index for ${cardsInColumn.length} cards...`
        );

        // Create batch update operations
        const updatePromises = cardsInColumn.map(async (card, index) => {
          // Only update if the order_index is different
          if (card.order_index !== index) {
            console.log(
              `🔄 Updating "${card.title}": ${card.order_index} → ${index}`
            );

            const { error: updateError } = await supabase
              .from("cards")
              .update({
                order_index: index,
                updated_at: new Date().toISOString(),
              })
              .eq("id", card.id);

            if (updateError) {
              console.error(
                `❌ Error updating card "${card.title}" order:`,
                updateError
              );
              return { success: false, card: card.title, error: updateError };
            } else {
              console.log(
                `✅ Updated card "${card.title}" to order_index ${index}`
              );
              return { success: true, card: card.title, newOrder: index };
            }
          } else {
            console.log(
              `⏭️ Card "${card.title}" already at correct position ${index}`
            );
            return {
              success: true,
              card: card.title,
              newOrder: index,
              skipped: true,
            };
          }
        });

        // Wait for all updates to complete
        const results = await Promise.all(updatePromises);

        // Log results
        const successful = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;
        const skipped = results.filter((r) => r.success && r.skipped).length;

        console.log(`📊 Reordering results for column ${columnId}:`);
        console.log(`  ✅ Successful: ${successful}`);
        console.log(`  ❌ Failed: ${failed}`);
        console.log(`  ⏭️ Skipped (already correct): ${skipped}`);

        if (failed > 0) {
          console.error(`❌ ${failed} cards failed to update order_index`);
        } else {
          console.log(
            `🎉 Successfully reordered all cards in column ${columnId}`
          );
        }
      } else {
        console.log(`📭 No cards found in column ${columnId} to reorder`);
      }
    } catch (error) {
      console.error("❌ Error reordering cards:", error);
    }
  };

  const updateCardOrder = async (cards: CardData[]) => {
    try {
      console.log("🔄 Updating card order for", cards.length, "cards");

      // Create batch update operations
      const updatePromises = cards.map(async (card, index) => {
        console.log(`📝 Updating "${card.title}": order_index ${index}`);

        const { error } = await supabase
          .from("cards")
          .update({
            order_index: index,
            updated_at: new Date().toISOString(),
          })
          .eq("id", card.id);

        if (error) {
          console.error(`❌ Error updating card "${card.title}" order:`, error);
          return { success: false, card: card.title, error };
        } else {
          console.log(
            `✅ Updated card "${card.title}" to order_index ${index}`
          );
          return { success: true, card: card.title, newOrder: index };
        }
      });

      // Wait for all updates to complete
      const results = await Promise.all(updatePromises);

      // Log results
      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      console.log(`📊 Card order update results:`);
      console.log(`  ✅ Successful: ${successful}`);
      console.log(`  ❌ Failed: ${failed}`);

      if (failed > 0) {
        console.error(`❌ ${failed} cards failed to update order`);
        throw new Error(`Failed to update ${failed} cards`);
      } else {
        console.log("🎉 All cards order updated successfully");
      }
    } catch (error) {
      console.error("❌ Error updating card order:", error);
      throw error; // Re-throw so caller can handle
    }
  };

  const addColumn = async (title: string) => {
    try {
      const { data, error } = await supabase
        .from("columns")
        .insert({
          title,
          board_id: boardId,
          order_index: columns.length,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating column:", error);
        return;
      }

      if (data) {
        setColumns((prev) => [...prev, { ...data, cards: [] }]);
        setShowAddColumn(false);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const addCard = async (
    columnId: string,
    title: string,
    description?: string
  ) => {
    try {
      const targetColumn = columns.find((col) => col.id === columnId);
      const orderIndex = (targetColumn?.cards || []).length;

      const { data, error } = await supabase
        .from("cards")
        .insert({
          title,
          description,
          column_id: columnId,
          order_index: orderIndex,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating card:", error);
        return;
      }

      if (data) {
        setColumns((prev) =>
          prev.map((col) =>
            col.id === columnId
              ? { ...col, cards: [...(col.cards || []), data] }
              : col
          )
        );
        setShowAddCard(null);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // Test Supabase connection function
  const testSupabaseConnection = async () => {
    try {
      console.log("🧪 Testing Supabase connection...");
      const { data, error } = await supabase
        .from("cards")
        .select("count")
        .limit(1);

      if (error) {
        console.error("❌ Supabase connection test failed:", error);
        return false;
      }

      console.log("✅ Supabase connection test successful");
      return true;
    } catch (error) {
      console.error("❌ Supabase connection test error:", error);
      return false;
    }
  };

  const editCard = async (
    cardId: string,
    title: string,
    description?: string
  ) => {
    try {
      console.log("✏️ EDIT CARD FUNCTION CALLED!", {
        cardId,
        title,
        description,
      });

      // Set processing state
      setProcessing(true);

      // Test Supabase connection first
      const connectionOk = await testSupabaseConnection();
      if (!connectionOk) {
        alert(
          "Database connection failed. Please check your internet connection and try again."
        );
        return;
      }

      // Check authentication
      console.log("👤 Checking user authentication...");
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("❌ Authentication failed:", authError);
        alert("Please log in again. Authentication expired.");
        return;
      }

      console.log("✅ User authenticated:", user.id);

      // Update the card in database
      console.log("📤 Sending update request to Supabase...");
      const { data: updateResult, error } = await supabase
        .from("cards")
        .update({
          title: title,
          description: description || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cardId)
        .select("*");

      console.log("📊 Supabase update response:", { updateResult, error });

      if (error) {
        console.error("❌ Error updating card:", error);
        alert(`Error updating card: ${error.message}`);
        return;
      }

      if (!updateResult || updateResult.length === 0) {
        console.error("❌ No card was updated in database");
        alert("Error: Card was not found in database.");
        return;
      }

      console.log("✅ Card updated successfully in database:", updateResult[0]);

      // Update local state for immediate UI feedback
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          cards: (col.cards || []).map((card) =>
            card.id === cardId
              ? { ...card, title, description: description || undefined }
              : card
          ),
        }))
      );

      // Refresh from database to ensure consistency
      console.log("🔄 Refreshing board data...");
      setTimeout(() => {
        fetchBoardData().catch((error) =>
          console.error("Error refreshing board data:", error)
        );
      }, 300);

      console.log("🎉 Card edit completed successfully");
    } catch (error) {
      console.error("❌ Error during card edit:", error);
      alert(`Unexpected error: ${error}`);
      // Refresh to restore correct state
      await fetchBoardData();
    } finally {
      // Always clear processing state
      setProcessing(false);
    }
  };

  const deleteCard = async (cardId: string) => {
    console.log("🚨 DELETE CARD FUNCTION CALLED!", { cardId });

    try {
      // Set processing state
      setProcessing(true);

      console.log(`🗑️ Starting card deletion process for: ${cardId}`);

      // Test Supabase connection first
      const connectionOk = await testSupabaseConnection();
      if (!connectionOk) {
        alert(
          "Database connection failed. Please check your internet connection and try again."
        );
        return;
      }

      // Get card info before deletion for confirmation and reordering
      console.log("🔍 Fetching card data with ownership verification...");
      const { data: cardToDelete, error: fetchError } = await supabase
        .from("cards")
        .select(
          `
          id, 
          title, 
          column_id,
          columns!inner (
            id,
            board_id,
            boards!inner (
              id,
              user_id
            )
          )
        `
        )
        .eq("id", cardId)
        .single();

      if (fetchError || !cardToDelete) {
        console.error("❌ Error fetching card to delete:", fetchError);
        alert(
          "Error: Could not find the card to delete or you don't have permission."
        );
        return;
      }

      console.log("🎯 Card found for deletion:", {
        id: cardToDelete.id,
        title: cardToDelete.title,
        column_id: cardToDelete.column_id,
        board_user_id: (cardToDelete.columns as any)?.boards?.user_id,
      });

      // Ask for confirmation
      const confirmed = confirm(
        `Are you sure you want to delete the card "${cardToDelete.title}"? This action cannot be undone.`
      );

      if (!confirmed) {
        console.log("🚫 Card deletion cancelled by user");
        return;
      }

      console.log(`🗑️ Deleting card: "${cardToDelete.title}" (ID: ${cardId})`);

      // Check Supabase connection and authentication
      console.log("🔌 Checking Supabase connection and authentication...");
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("❌ Authentication failed:", authError);
        alert("Please log in again. Authentication expired.");
        return;
      }

      console.log("✅ User authenticated:", user.id);

      // Show immediate UI feedback - remove card from state first
      console.log("⚡ Applying optimistic UI update...");
      setColumns((prev) =>
        prev.map((col) => {
          if (col.id === cardToDelete.column_id) {
            return {
              ...col,
              cards: (col.cards || []).filter((card) => card.id !== cardId),
            };
          }
          return col;
        })
      );

      // Delete the card from database
      console.log("📤 Sending delete request to Supabase...");
      const { data: deleteResult, error } = await supabase
        .from("cards")
        .delete()
        .eq("id", cardId)
        .select("*"); // Return deleted row for verification

      console.log("📊 Supabase delete response:", { deleteResult, error });

      if (error) {
        console.error("❌ Error deleting card from Supabase:", error);
        alert(`Error deleting card: ${error.message}`);

        // Restore the card in UI if deletion failed
        console.log("🔄 Restoring UI state due to deletion error...");
        await fetchBoardData();
        return;
      }

      if (!deleteResult || deleteResult.length === 0) {
        console.error("❌ No card was deleted from database");
        alert("Error: Card was not found in database or already deleted.");
        await fetchBoardData();
        return;
      }

      console.log(
        `✅ Card "${cardToDelete.title}" deleted successfully from database`,
        deleteResult[0]
      );

      // Verify deletion by trying to fetch the card again
      console.log("🔍 Verifying card deletion...");
      const { data: verifyCard, error: verifyError } = await supabase
        .from("cards")
        .select("id")
        .eq("id", cardId)
        .maybeSingle();

      if (verifyError) {
        console.warn("⚠️ Error verifying deletion:", verifyError);
      } else if (verifyCard) {
        console.error("❌ Card still exists in database after deletion!");
        alert(
          "Warning: Card may not have been deleted properly. Refreshing..."
        );
        await fetchBoardData();
        return;
      } else {
        console.log("✅ Deletion verified: Card no longer exists in database");
      }

      // Reorder remaining cards in the column (optimized)
      console.log(
        `🔄 Reordering remaining cards in column ${cardToDelete.column_id}`
      );
      await reorderCardsInColumn(cardToDelete.column_id);

      // Final refresh to ensure consistency
      console.log("🔄 Final refresh after card deletion...");
      await fetchBoardData();

      console.log("🎉 Card deletion completed successfully");
    } catch (error) {
      console.error("❌ Error during card deletion:", error);
      alert(`Unexpected error: ${error}`);
      // Refresh to restore correct state
      await fetchBoardData();
    } finally {
      // Always clear processing state
      setProcessing(false);
    }
  };

  const deleteColumn = async (columnId: string) => {
    try {
      const { error } = await supabase
        .from("columns")
        .delete()
        .eq("id", columnId);

      if (error) {
        console.error("Error deleting column:", error);
        return;
      }

      setColumns((prev) => prev.filter((col) => col.id !== columnId));
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const startEditingBoard = () => {
    if (!board) return;
    setEditBoardTitle(board.title);
    setEditBoardDescription(board.description || "");
    setEditingBoard(true);
  };

  const cancelEditingBoard = () => {
    setEditingBoard(false);
    setEditBoardTitle("");
    setEditBoardDescription("");
  };

  const saveBoard = async () => {
    if (!board || !editBoardTitle.trim()) return;

    try {
      setProcessing(true);
      console.log(`Updating board: ${board.title} -> ${editBoardTitle}`);

      const { data, error } = await supabase
        .from("boards")
        .update({
          title: editBoardTitle.trim(),
          description: editBoardDescription.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", boardId)
        .select()
        .single();

      if (error) {
        console.error("Error updating board:", error);
        alert(`Error updating board: ${error.message}`);
        return;
      }

      if (data) {
        console.log("Board updated successfully:", data);
        setBoard(data);
        setEditingBoard(false);
        setEditBoardTitle("");
        setEditBoardDescription("");
      }
    } catch (error) {
      console.error("Error:", error);
      alert(`Unexpected error: ${error}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleBoardEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      saveBoard();
    } else if (e.key === "Escape") {
      cancelEditingBoard();
    }
  };

  const deleteBoard = async () => {
    if (!board) return;

    const confirmed = confirm(
      `Are you sure you want to delete the board "${board.title}"? This action cannot be undone and will delete all columns and cards.`
    );

    if (!confirmed) return;

    try {
      setDeletingBoard(true);
      console.log(`Starting board deletion: ${board.title}`);

      const { error } = await supabase
        .from("boards")
        .delete()
        .eq("id", boardId);

      if (error) {
        console.error("Error deleting board:", error);
        alert(`Error deleting board: ${error.message}`);
        return;
      }

      console.log(`Board ${boardId} deleted successfully`);
      router.push("/");
    } catch (error) {
      console.error("Error:", error);
      alert(`Unexpected error: ${error}`);
    } finally {
      setDeletingBoard(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            Board not found
          </h1>
          <Link href="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Boards
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16 bg-background">
        <div className="w-full max-w-7xl flex justify-between items-center p-3 px-5 text-sm">
          <div className="flex gap-5 items-center">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Boards
              </Button>
            </Link>
            {editingBoard ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editBoardTitle}
                  onChange={(e) => setEditBoardTitle(e.target.value)}
                  onKeyDown={handleBoardEditKeyDown}
                  className="text-xl font-bold h-8 bg-white dark:bg-gray-700"
                  placeholder="Board title"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={saveBoard}
                  disabled={!editBoardTitle.trim() || processing}
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <Save className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelEditingBoard}
                  disabled={processing}
                  className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                  {board.title}
                </h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startEditingBoard}
                  disabled={processing || deletingBoard}
                  className="opacity-70 hover:opacity-100 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={deleteBoard}
              disabled={deletingBoard || processing || editingBoard}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deletingBoard ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Board
                </>
              )}
            </Button>
          </div>
        </div>
      </nav>

      <div className="flex-1 p-6 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 relative">
        {/* Processing overlay */}
        {processing && (
          <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="text-sm font-medium">Processing...</span>
            </div>
          </div>
        )}

        {/* Board deletion overlay */}
        {deletingBoard && (
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl flex flex-col items-center gap-4 min-w-[300px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Deleting Board
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Please wait while we delete "{board?.title}" and all its
                  content...
                </p>
              </div>
            </div>
          </div>
        )}

        {editingBoard ? (
          <div className="mb-6">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <Input
                  value={editBoardDescription}
                  onChange={(e) => setEditBoardDescription(e.target.value)}
                  onKeyDown={handleBoardEditKeyDown}
                  placeholder="Board description (optional)"
                  className="bg-white dark:bg-gray-700"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Press Ctrl+Enter to save, Esc to cancel
                </p>
              </div>
            </div>
          </div>
        ) : (
          (board.description || editingBoard) && (
            <div className="mb-6 group">
              <div className="flex items-start gap-2">
                <p className="text-gray-600 dark:text-gray-300 flex-1">
                  {board.description || (
                    <span className="italic text-gray-400">
                      Click to add description...
                    </span>
                  )}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startEditingBoard}
                  disabled={processing || deletingBoard}
                  className="opacity-0 group-hover:opacity-70 hover:opacity-100 text-gray-600 hover:text-gray-700 hover:bg-gray-50 transition-opacity"
                >
                  <Edit className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )
        )}

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
                column={{
                  id: column.id,
                  title: column.title,
                  order: column.order_index,
                  cards: (column.cards || []).map((card) => ({
                    id: card.id,
                    title: card.title,
                    description: card.description,
                    columnId: card.column_id,
                    order: card.order_index,
                  })),
                }}
                onAddCard={() => setShowAddCard(column.id)}
                onDeleteColumn={deleteColumn}
                onDeleteCard={deleteCard}
                onEditCard={editCard}
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
    </div>
  );
}
