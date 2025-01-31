import { Database } from "bun:sqlite";
export const db = new Database("mydb.sqlite", { strict: true });

const existsQuery = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='changes'"
);

const exists = await existsQuery.run();

if (!exists) {
  await db.run(
    "CREATE TABLE changes (project TEXT, sha TEXT, file TEXT, line INTEGER, type TEXT)"
  );
}

const hasSha = db.prepare(
  "SELECT COUNT(*) as count FROM changes WHERE project = ? AND sha = ?"
);
export async function writeJsonToDb(
  project: string,
  sha: string,
  json: FileReport[]
) {
  // check if the sha already exists in the database
  const { count } = (await hasSha.get(project, sha)) as { count: number };

  // skip if the sha already exists
  if (count > 0) {
    return;
  }

  // insert the changes into the database
  for (const file of json) {
    for (const change of file.changes) {
      await db.run(
        "INSERT INTO changes (project, sha, file, line, type) VALUES (?, ?, ?, ?, ?)",
        [project, sha, file.file, change.line, change.type]
      );
    }
  }
}
const stats = db.prepare(
  `SELECT file, type, COUNT(*) as count FROM changes WHERE project = ? GROUP BY file, type ORDER BY count DESC`
);
export async function getStats(project: string) {
  return stats.all(project);
}
const projectsQuery = db.prepare("SELECT DISTINCT project FROM changes");
export async function getProjects() {
  return projectsQuery.all();
}
