// Whole years between a YYYY-MM-DD birth date and today; null when the
// date cannot be read.
export function ageFrom(birthDate: string) {
  const born = new Date(birthDate + "T00:00:00");
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  if (now.getMonth() < born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) age--;
  return age;
}
