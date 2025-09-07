import { BoardView } from "@/components/board-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BoardPage({ params }: PageProps) {
  const { id } = await params;
  return <BoardView boardId={id} />;
}
