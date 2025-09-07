"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BoardData } from "@/lib/types";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  Plus,
  Calendar,
  User,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { AddBoardDialog } from "./add-board-dialog";
import { hasEnvVars } from "@/lib/utils";

export function BoardsList() {
  const [boards, setBoards] = useState<BoardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [showAddBoard, setShowAddBoard] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (hasEnvVars) {
      fetchBoards();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBoards = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data, error } = await supabase
        .from("boards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching boards:", error);
        return;
      }

      setBoards(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const createBoard = async (title: string, description?: string) => {
    try {
      setCreatingBoard(true);
      console.log(`Creating board: ${title}`);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data, error } = await supabase
        .from("boards")
        .insert({
          title,
          description,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating board:", error);
        alert(`Error creating board: ${error.message}`);
        return;
      }

      if (data) {
        console.log("Board created successfully:", data.title);
        setBoards((prev) => [data, ...prev]);
        setShowAddBoard(false);

        // Navigate to the new board after creation
        router.push(`/board/${data.id}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert(`Unexpected error: ${error}`);
    } finally {
      setCreatingBoard(false);
    }
  };

  const openBoard = (boardId: string) => {
    router.push(`/board/${boardId}`);
  };

  const deleteBoard = async (
    boardId: string,
    boardTitle: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation(); // Prevent opening the board

    const confirmed = confirm(
      `Are you sure you want to delete the board "${boardTitle}"? This action cannot be undone and will delete all columns and cards.`
    );

    if (!confirmed) return;

    try {
      const supabase = createClient();
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
      // Remove the board from local state
      setBoards((prev) => prev.filter((board) => board.id !== boardId));
    } catch (error) {
      console.error("Error:", error);
      alert(`Unexpected error: ${error}`);
    }
  };

  if (!hasEnvVars) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <div className="mx-auto w-24 h-24 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-12 h-12 text-orange-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            Supabase Configuration Required
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
            To use the full Trello functionality with authentication and
            database, please set up your Supabase environment variables.
          </p>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 max-w-lg mx-auto text-left">
            <h4 className="font-semibold mb-2">Quick Setup:</h4>
            <ol className="text-sm space-y-1">
              <li>1. Create a Supabase project at supabase.com</li>
              <li>2. Run the SQL script from setup-database.sql</li>
              <li>3. Add your environment variables to .env.local</li>
              <li>4. Restart the development server</li>
            </ol>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Check TRELLO_SETUP.md for detailed instructions
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 relative">
      {/* Creating board overlay */}
      {creatingBoard && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl flex flex-col items-center gap-4 min-w-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                Creating Board
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Please wait while we create your new board...
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            My Boards
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Create and manage your project boards
          </p>
        </div>
        <Button
          onClick={() => setShowAddBoard(true)}
          disabled={creatingBoard}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Board
        </Button>
      </div>

      {boards.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <User className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            No boards yet
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Create your first board to start organizing your projects
          </p>
          <Button
            onClick={() => setShowAddBoard(true)}
            disabled={creatingBoard}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create your first board
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {boards.map((board) => (
            <Card
              key={board.id}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border-0 relative group"
              onClick={() => openBoard(board.id)}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-white line-clamp-2">
                      {board.title}
                    </h3>
                    {board.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-3">
                        {board.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => deleteBoard(board.id, board.title, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <Calendar className="w-3 h-3 mr-1" />
                  {new Date(board.created_at).toLocaleDateString()}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AddBoardDialog
        open={showAddBoard}
        onOpenChange={setShowAddBoard}
        onAdd={createBoard}
        isCreating={creatingBoard}
      />
    </div>
  );
}
