import * as d3 from "d3";

let projects = [];

function assert(condition: any, message: any): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchProjects() {
  const response = await fetch("/projects");
  projects = await response.json();

  const projectSelect = document.getElementById("projects");
  assert(projectSelect, "projects select not found");

  for (const project of projects) {
    const option = document.createElement("option");
    option.value = project.project;
    option.innerText = project.project;
    projectSelect.appendChild(option);
  }

  let loadProject = projects[0].project;
  if (localStorage.getItem("project")) {
    loadProject = localStorage.getItem("project");
  }

  if (loadProject) {
    fetchStats(loadProject);
  }

  projectSelect.addEventListener("change", (e) => {
    const project = (e.target as HTMLSelectElement).value;

    // store in local storage
    localStorage.setItem("project", project);

    fetchStats(project);
  });
}

let data: {
  file: string;
  added_count: number;
  modified_count: number;
  deleted_count: number;
  type: string;
}[] = [];

async function fetchStats(project: string) {
  const response = await fetch(`/${project}`);
  data = await response.json();

  updateVis();
}

function updateVis() {
  d3.select("svg").selectAll("*").remove();

  const width = 3000;
  const height = 400;
  const margin = { top: 20, right: 30, bottom: 40, left: 50 };

  const xScale = d3
    .scaleBand()
    .domain(data.map((d) => d.file)) // Categories on x-axis
    .range([margin.left, width])
    .padding(0.3); // Space between grouped bars

  const xSubgroupScale = d3
    .scaleBand()
    .domain(["added", "modified", "deleted"]) // Subcategories
    .range([0, xScale.bandwidth()])
    .padding(0.15); // Space between bars within a group

  const yScale = d3
    .scaleLinear()
    .domain([
      0,
      d3.max(
        data.flatMap((d) => [d.added_count, d.deleted_count, d.modified_count])
      ) ?? 0,
    ]) // Get max value
    .nice()
    .range([height, 0]);

  const colors = d3
    .scaleOrdinal()
    .domain(["added", "modified", "deleted"])
    .range(["green", "orange", "red"]);

  const svg = d3
    .select("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScale))
    .selectAll("text")
    .attr("class", "axis-label");

  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .attr("class", "axis-label bold")
    .attr("transform", "rotate(-45)")
    .attr("text-anchor", "end");

  svg
    .selectAll(".bar-group")
    .data(data)
    .enter()
    .append("g")
    .attr("transform", (d) => `translate(${xScale(d.file)}, 0)`) // Position groups
    .selectAll("rect")
    .data((d) => [
      { value: d.added_count, type: "added", file: d.file },
      { value: d.modified_count, type: "modified", file: d.file },
      { value: d.deleted_count, type: "deleted", file: d.file },
    ])
    .enter()
    .append("rect")
    .attr(
      "x",
      (d) => xSubgroupScale(d.type)! + xSubgroupScale.bandwidth() / 2 - 12
    ) // Position bars within group
    .attr("y", (d) => yScale(d.value))
    .attr("width", xSubgroupScale.bandwidth()) // Prevent overlap
    .attr("height", (d) => height - yScale(d.value))
    .attr("fill", (d) => colors(d.type) as string)
    .on("pointerdown", (e, d) => {
      // remove from the data
      data = data.filter((x) => x.file !== d.file);
      updateVis();
    });
}

fetchProjects();
