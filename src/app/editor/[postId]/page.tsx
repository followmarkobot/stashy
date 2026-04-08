import PostEditor from "@/components/PostEditor";

export const dynamic = "force-dynamic";

export default function EditorPage({ params }: { params: { postId: string } }) {
  return <PostEditor mode="edit" postId={params.postId} />;
}
