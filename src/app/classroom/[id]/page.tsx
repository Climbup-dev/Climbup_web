import ClassroomClient from "./ClassroomClient";

export default async function ClassroomPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <ClassroomClient id={resolvedParams.id} />;
}
