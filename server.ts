import { Hono } from "hono";
import { serveStatic } from 'hono/bun'
import { getProjects, getStats, initialize, writeJsonToDb } from "./db";

// build the frontend
await Bun.build({
    entrypoints: ["./index.html"],
    outdir: "./dist",
    minify: true,
});

await initialize();

const app = new Hono();

app.use('/*', serveStatic({ root: './dist' }))

app.get("/projects", async (c) => {
  const projects = await getProjects();
  return c.json(projects);
});

app.get("/:project", async (c) => {
  const project = c.req.param("project");
  const stats = await getStats(project);
  return c.json(stats);
});

app.post("/:project/:sha", async (c) => {
  const project = c.req.param("project");
  const sha = c.req.param("sha");

  const json = await c.req.json();
  await writeJsonToDb(project, sha, json);
  return c.json({ success: true });
});

export default {
  port: 8080,
  fetch: app.fetch,
};
