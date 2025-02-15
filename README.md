# Churn

Tool to analyze code churn in a git repository. Consists of a server and and indexing tool. The server is a REST API that serves the churn data. The indexing tool can be run in a cli to keep the data up to date or index a repository all at once.

<!-- image-->
![Churn](./docs/churn.png)

## Server

Run the server with:

```bash
docker compose up
```

The server will be available at `http://localhost:8080`. Its using an sqlite database to store the churn data. The database is stored in the `db` directory.

## Indexing

### Setup

Copy the `.env.example` file to `.env` and update the values.

```bash
UPLOAD_URL=http://localhost:8080
```

The indexer is using [bun](https://bun.sh) to run the typescript code. To install bun run:

```bash
curl -s https://bun.sh | bash
```

### Usage

To index the latest commit:

```bash
bun run index.ts --cwd /path/to/repo --project 'project-name'
```

To index all commits:

```bash
bun run index.ts --cwd /path/to/repo --all --project 'project-name'
```

If no project name is provided the environment variable `BITBUCKET_REPO_SLUG` will be used.

## TODOS: 

- [ ] Add auth
- [ ] Add more data
- [ ] Add filters
