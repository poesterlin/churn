interface FileReport {
  file: string;
  changes: Change[];
}

interface Change {
  line: number;
  type: "added" | "removed" | "modified";
}
