import { getStudentSession } from "@/lib/auth";
import { getStudentById, listSavedPropertyIds } from "@/lib/db/queries";

/**
 * Server-side view of the current student, for Server Components.
 * Returns null when signed out — pages must degrade, never throw.
 */
export async function currentStudent() {
  const session = await getStudentSession();
  if (!session) return null;

  const student = await getStudentById(session.studentId);
  if (!student) return null; // Account deleted while the cookie lived on.

  return student;
}

export async function currentStudentWithSaved() {
  const student = await currentStudent();
  if (!student) return { student: null, savedIds: new Set<number>() };

  const ids = await listSavedPropertyIds(student.id);
  return { student, savedIds: new Set(ids) };
}
