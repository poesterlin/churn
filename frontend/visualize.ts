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

  if (projects.length > 0) {
    fetchStats(projects[0].project);
  }

  projectSelect.addEventListener("change", (e) => {
    const project = (e.target as HTMLSelectElement).value;
    fetchStats(project);
  });
}

async function fetchStats(project: string) {
  const response = await fetch(`/${project}`);
  const data: { file: string; count: number; type: string }[] =
    await response.json();

  const width = 600;
  const height = 400;
  const margin = { top: 20, right: 30, bottom: 40, left: 50 };

  const svg = d3.select("svg").attr("width", width).attr("height", height);

  const x = d3
    .scaleBand()
    .domain(data.map((d) => d.file))
    .range([margin.left, width - margin.right])
    .padding(0.3);

  const max = d3.max(data, (d) => d.count) ?? 0;

  const y = d3
    .scaleLinear()
    .domain([0, max])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-45)")
    .attr("text-anchor", "end");

  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .selectAll("text")
    .attr("class", "axis-label");

  svg
    .selectAll(".bar")
    .data(data)
    .enter()
    .append("rect")
    .attr("style", (d) => `z-index: ${Math.ceil(y(max - d.count))}`)
    .attr("class", (d) => [d.type, "bar"].join(" "))
    .attr("x", (d) => x(d.file) ?? 0)
    .attr("y", (d) => y(d.count))
    .attr("height", (d) => y(0) - y(d.count))
    .attr("width", x.bandwidth());
}

fetchProjects();
