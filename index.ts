import { $ } from "bun";
import { cwd } from "process";
import { parseArgs } from "util";

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    all: {
      type: "boolean",
    },
    cwd: {
      type: "string",
      default: cwd(),
    },
    project: {
      type: "string",
      default: process.env.BITBUCKET_REPO_SLUG,
    },
  },
  strict: false,
});

$.cwd(values.cwd as string);

async function getDiffForSha(sha: string) {
  const diff = $`git diff -U0 ${sha}^ ${sha}`.lines();

  const files: FileReport[] = [];
  let currentFile: string | null = null;
  for await (const line of diff) {
    //   console.log(line);

    if (line.startsWith("+++")) {
      currentFile = line.split(" ")[1].replace("b/", "");
      continue;
    }

    if (!line.startsWith("@@") || !currentFile) {
      continue;
    }

    const [_p, before, now, _q] = line.split(" ");

    const changedLines = getChangedLines(before, now);
    const file = files.find((x) => x.file === currentFile);
    if (file) {
      file.changes.push(...changedLines);
    } else {
      files.push({ file: currentFile, changes: changedLines });
    }
  }
  return files;
}

if (values.all) {
  // go through the history and upload all the changes
  const history = $`git rev-list HEAD`.lines();
  let successful = 0;
  for await (const commit of history) {
    if (!commit || commit === "" || commit.length < 10) {
      continue;
    }

    try {
      const files = await getDiffForSha(commit);
      await uploadChanges(commit, files);
      successful++;

      process.stdout.write(`\t${successful}: commit ${commit} uploaded\r`)
    } catch (error) {
      console.error("failed to upload changes for commit " + commit);
    }
  }

  console.log(`successfully uploaded ${successful} commits`);
} else {
  // get the current commit SHA
  const sha = removeEmptyLines(await $`git rev-parse HEAD`.text());

  const files = await getDiffForSha(sha);
  await uploadChanges(sha, files);
}

function removeEmptyLines(text: string) {
  return text.split("\n").filter(Boolean).join("");
}

/**
 * function to get the changed lines from the diff,
 * @param start example: -1,5
 * @param end example: +1,8
 * @returns lines that were changed, example [{i: 1, type: 'added'}, {i: 2, type: 'removed'}, {i: 3, type: 'modified'}]
 */
function getChangedLines(before: string, after: string): Change[] {
  const [startBefore, lengthBefore = 1] = before
    .split(",")
    .map((x) => x.replace("-", ""))
    .map((x) => parseInt(x));

  const [startAfter, lengthAfter = 1] = after
    .split(",")
    .map((x) => x.replace("+", ""))
    .map((x) => parseInt(x));

  const lines: Change[] = [];

  const linesAdded = lengthAfter - lengthBefore;
  const linesRemoved = lengthBefore - lengthAfter;
  const linesKept = lengthAfter - Math.max(linesAdded, 0);

  // add all the modified lines to the array
  for (let i = 0; i < linesKept; i++) {
    lines.push({ line: startAfter + i, type: "modified" });
  }

  // add all the added lines to the array
  for (let i = 0; i < linesAdded; i++) {
    lines.push({ line: startAfter + i + linesKept, type: "added" });
  }

  // add all the removed lines to the array
  for (let i = 0; i < linesRemoved; i++) {
    lines.push({ line: startBefore + i + linesKept, type: "removed" });
  }

  return lines;
}

async function uploadChanges(sha: string, files: FileReport[]) {
  const endpoint = process.env.UPLOAD_URL;
  const url = `${endpoint}/${values.project}/${sha}`;

  await fetch(url, {
    method: "POST",
    body: JSON.stringify(files),
    headers: {
      "Content-Type": "application/json",
    },
  });
}
