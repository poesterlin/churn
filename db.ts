import { Database } from "bun:sqlite";

export const db = new Database("./db/mydb.sqlite", { strict: false });

export async function initialize() {
  await db
    .query(
      "CREATE TABLE IF NOT EXISTS changes (project TEXT, sha TEXT, file TEXT, line INTEGER, type TEXT)"
    )
    .run();

  // create index for faster lookups
  await db
    .query(
      "CREATE INDEX IF NOT EXISTS idx_changes_project_sha ON changes (project, sha)"
    )
    .run();

  db.exec("PRAGMA journal_mode = WAL;");
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
    `SELECT 
        file, 
        SUM(CASE WHEN type = 'added' THEN 1 ELSE 0 END) AS added_count,
        SUM(CASE WHEN type = 'modified' THEN 1 ELSE 0 END) AS modified_count,
        SUM(CASE WHEN type = 'removed' THEN 1 ELSE 0 END) AS deleted_count
    FROM changes 
    WHERE project = ? 
    GROUP BY file 
    ORDER BY deleted_count DESC 
    LIMIT 30;`
  );
  return stats.all(project);
}

export async function getProjects() {
  const projectsQuery = db.query("SELECT DISTINCT project FROM changes");
  return projectsQuery.all();
}
