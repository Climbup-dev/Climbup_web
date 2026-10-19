import CourseClassroomClient from "./CourseClassroomClient";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <CourseClassroomClient courseId={courseId} />;
}
