import { Database } from "bun:sqlite";

export const db = new Database("./db/mydb.sqlite", { strict: false });

export async function initialize() {
  await db.query(
    "CREATE TABLE IF NOT EXISTS changes (project TEXT, sha TEXT, file TEXT, line INTEGER, type TEXT)"
  );
}

export async function writeJsonToDb(
  project: string,
  sha: string,
  json: FileReport[]
) {
  const hasSha = db.query(
    "SELECT COUNT(*) as count FROM changes WHERE project = ? AND sha = ?"
  );
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

export async function getStats(project: string) {
  const stats = db.query(
    `SELECT file, type, COUNT(*) as count FROM changes WHERE project = ? GROUP BY file, type ORDER BY count DESC LIMIT 30`
  );
  return stats.all(project);
}

export async function getProjects() {
  const projectsQuery = db.query("SELECT DISTINCT project FROM changes");
  return projectsQuery.all();
}
