import type { RoutineEntry } from './storage.js';

export type WeeklySummary = {
  from: string;
  to: string;
  days: number;
  totals: {
    calories: number;
    exerciseMinutes: number;
    sleepHours: number;
  };
  averages: {
    calories: number;
    exerciseMinutes: number;
    sleepHours: number;
  };
  streakDays: number;
};

function meetsStreak(entry: RoutineEntry): boolean {
  return (
    (entry.exerciseMinutes ?? 0) >= 20 ||
    (entry.sleepHours ?? 0) >= 6 ||
    (entry.caloriesKcal ?? 0) > 0
  );
}

export function summarize(
  entries: RoutineEntry[],
  from: string,
  to: string,
): WeeklySummary {
  const calorieEntries = entries.filter((e) => e.caloriesKcal !== null);
  const exerciseEntries = entries.filter((e) => e.exerciseMinutes !== null);
  const sleepEntries = entries.filter((e) => e.sleepHours !== null);

  const totalCalories = calorieEntries.reduce((s, e) => s + (e.caloriesKcal ?? 0), 0);
  const totalExercise = exerciseEntries.reduce((s, e) => s + (e.exerciseMinutes ?? 0), 0);
  const totalSleep = sleepEntries.reduce((s, e) => s + (e.sleepHours ?? 0), 0);

  // streak from latest entry backward.
  const sorted = [...entries].sort((a, b) => (a.entryDate > b.entryDate ? -1 : 1));
  let streak = 0;
  let prevDate: string | null = null;
  for (const e of sorted) {
    if (!meetsStreak(e)) break;
    if (prevDate !== null) {
      const a = new Date(`${prevDate}T00:00:00Z`).getTime();
      const b = new Date(`${e.entryDate}T00:00:00Z`).getTime();
      if (a - b !== 86400000) break;
    }
    streak += 1;
    prevDate = e.entryDate;
  }

  const round1 = (n: number) => Math.round(n * 10) / 10;

  return {
    from,
    to,
    days: entries.length,
    totals: {
      calories: Math.round(totalCalories),
      exerciseMinutes: Math.round(totalExercise),
      sleepHours: round1(totalSleep),
    },
    averages: {
      calories: calorieEntries.length ? Math.round(totalCalories / calorieEntries.length) : 0,
      exerciseMinutes: exerciseEntries.length
        ? Math.round(totalExercise / exerciseEntries.length)
        : 0,
      sleepHours: sleepEntries.length ? round1(totalSleep / sleepEntries.length) : 0,
    },
    streakDays: streak,
  };
}
