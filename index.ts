import { $ } from "bun";

const sha = removeEmptyLines(await $`git rev-parse HEAD`.text());

console.log(`Current commit SHA: ${sha}`);

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

// write to a file
Bun.write("changes.json", JSON.stringify(files, null, 2));
console.log("Changes saved to changes.json");

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

//   console.log({ startBefore, lengthBefore, startAfter, lengthAfter });
//   console.log({ linesAdded, linesKept, linesRemoved });

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

interface FileReport {
  file: string;
  changes: Change[];
}

interface Change {
  line: number;
  type: "added" | "removed" | "modified";
}
