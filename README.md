# Churn

Tool to analyze code churn in a git repository. Consists of a server and and indexing tool. The server is a REST API that serves the churn data. The indexing tool can be run in a cli to keep the data up to date or index a repository all at once.

## Server

Run the server with:

```bash
docker compose up
```

The server will be available at `http://localhost:8080`. Its using an sqlite database to store the churn data. The database is stored in the `db` directory.

## Indexing

The indexer is using [bun](https://bun.sh) to run the typescript code. To install bun run:

```bash
curl -s https://bun.sh | bash
```

To index the latest commit:

```bash
bun run index.ts --cwd /path/to/repo
```

To index all commits:

```bash
bun run index.ts --cwd /path/to/repo --all
```
