import { BoardView } from "@/components/board-view";

export default async function BoardPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  return <BoardView boardId={id} />;
}
