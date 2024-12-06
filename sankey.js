// Set up SVG dimensions
const width = 960;
const height = 500;

// Create SVG canvas
const svg = d3.select("#sankey-chart")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

// Initialize Sankey generator
const sankey = d3.sankey()
  .nodeWidth(20)
  .nodePadding(25)
  .extent([[1, 1], [width - 1, height - 5]]);

// Initialize tooltip
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("background-color", "white")
  .style("border", "1px solid #ccc")
  .style("padding", "8px")
  .style("border-radius", "4px")
  .style("pointer-events", "none")
  .style("opacity", 0);

// Load and process data
d3.csv("data.csv").then(data => {
  // Parse numerical values
  data.forEach(d => {
    d.Year = +d.Year;
    d.Carbon_Footprint_MT = +d.Carbon_Footprint_MT;
  });

  // Get unique years
  const years = Array.from(new Set(data.map(d => d.Year))).sort();

  // Initialize controls
  let currentYearIndex = 0;
  let animationInterval;

  const yearLabel = d3.select("#year-label");
  const playButton = d3.select("#play-button");
  const pauseButton = d3.select("#pause-button");

  // Function to update the Sankey diagram
  function updateSankey(year) {
    // Filter data for the selected year
    const yearData = data.filter(d => d.Year === year);

    // Prepare nodes and links
    const nodes = [];
    const nodeMap = new Map();
    const links = [];

    yearData.forEach(d => {
      if (!nodeMap.has(d.Material_Type)) {
        nodeMap.set(d.Material_Type, { name: d.Material_Type });
        nodes.push(nodeMap.get(d.Material_Type));
      }
      if (!nodeMap.has(d.Eco_Friendly_Manufacturing)) {
        nodeMap.set(d.Eco_Friendly_Manufacturing, { name: d.Eco_Friendly_Manufacturing });
        nodes.push(nodeMap.get(d.Eco_Friendly_Manufacturing));
      }
      links.push({
        source: nodeMap.get(d.Material_Type),
        target: nodeMap.get(d.Eco_Friendly_Manufacturing),
        value: d.Carbon_Footprint_MT
      });
    });

    // Clear previous diagram
    svg.selectAll("*").remove();

    // Apply Sankey layout
    sankey({ nodes, links });

    // Draw links
    svg.append("g")
      .selectAll("path")
      .data(links)
      .join("path")
      .attr("class", "link")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("stroke", d => d3.schemeCategory10[nodes.indexOf(d.source) % 10])
      .attr("stroke-width", d => Math.max(1, d.width))
      .on("mouseover", (event, d) => {
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`<strong>Source:</strong> ${d.source.name}<br><strong>Target:</strong> ${d.target.name}<br><strong>Value:</strong> ${d.value}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mousemove", event => {
        tooltip.style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => {
        tooltip.transition().duration(200).style("opacity", 0);
      });

    // Draw nodes
    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("transform", d => `translate(${d.x0},${d.y0})`);

    node.append("rect")
      .attr("height", d => d.y1 - d.y0)
      .attr("width", sankey.nodeWidth())
      .attr("fill", d => d3.schemeCategory10[nodes.indexOf(d) % 10])
      .attr("stroke", "#000");

    node.append("text")
      .attr("x", -6)
      .attr("y", d => (d.y1 - d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .text(d => d.name)
      .filter(d => d.x0 < width / 2)
      .attr("x", 6 + sankey.nodeWidth())
      .attr("text-anchor", "start");
  }

  // Function to play the animation
  function playAnimation() {
    animationInterval = setInterval(() => {
      if (currentYearIndex >= years.length) {
        currentYearIndex = 0; // Reset to the first year when the animation completes
      }
      updateSankey(years[currentYearIndex]);
      yearLabel.text(`Year: ${years[currentYearIndex]}`);
      currentYearIndex++;
    }, 1000); // Update every 2 seconds
  }

  // Function to pause the animation
  function pauseAnimation() {
    clearInterval(animationInterval);
  }

  // Attach event listeners to play/pause buttons
  playButton.on("click", playAnimation);
  pauseButton.on("click", pauseAnimation);

  // Initialize with the first year
  updateSankey(years[0]);
  yearLabel.text(`Year: ${years[0]}`);
}).catch(error => console.error("Error loading data:", error));

// Back button functionality
document.getElementById("back-button").addEventListener("click", () => {
    window.location.href = "index.html";
  });
