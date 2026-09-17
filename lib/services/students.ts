import { getStudentById, updateStudentProfile } from "@/lib/db/queries";
import type { Student } from "@/lib/db/queries";
import type { StudentProfileInput } from "@/lib/validation";

/**
 * Saves a student's optional profile and returns the stored result.
 *
 * Takes the student id from the caller (which reads it from the session), not
 * from the request body — a body-supplied id would let any signed-in student
 * rewrite another's profile.
 */
export async function saveStudentProfile(
  studentId: number,
  profile: StudentProfileInput,
): Promise<Student | null> {
  await updateStudentProfile(studentId, profile);
  return getStudentById(studentId);
}
