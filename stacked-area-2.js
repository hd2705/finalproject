// Load CSV data
d3.csv('data.csv').then(data => {
    const width = 960, height = 500;
  
    // Prepare the SVG container
    const svg = d3.select("#stacked-area-chart")
      .append("svg")
      .attr("width", width)
      .attr("height", height);
  
    const margin = { top: 20, right: 30, bottom: 50, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
  
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
  
    // Parse numerical values
    data.forEach(d => {
      d.Year = +d.Year;
      d.Carbon_Footprint_MT = +d.Carbon_Footprint_MT;
      d.Water_Usage_Liters = +d.Water_Usage_Liters;
      d.Waste_Production_KG = +d.Waste_Production_KG;
    });
  
    const years = Array.from(new Set(data.map(d => +d.Year))).sort(d3.ascending);
    const materialTypes = Array.from(new Set(data.map(d => d.Material_Type)));
  
    // Scales
    const xScale = d3.scaleLinear()
      .domain(d3.extent(years))
      .range([0, chartWidth]);
  
    const yScale = d3.scaleLinear()
      .range([chartHeight, 0]);
  
    const colorScale = d3.scaleOrdinal()
      .domain(materialTypes)
      .range(d3.schemeCategory10);
  
    // Axes
    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d"));
    const yAxis = d3.axisLeft(yScale);
  
    g.append("g")
      .attr("transform", `translate(0, ${chartHeight})`)
      .call(xAxis);
  
    const yAxisGroup = g.append("g").call(yAxis);
  
    // Stack generator
    const stack = d3.stack().keys(materialTypes);
  
    const area = d3.area()
      .x(d => xScale(d.data.Year))
      .y0(d => yScale(d[0]))
      .y1(d => yScale(d[1]));
  
    // Select existing dropdown
    const metricDropdown = d3.select("#metric-select");
  
    // Update chart based on selected metric
    function updateChart(metric) {
      // Group data by year and material type
      const nestedData = d3.groups(data, d => d.Year, d => d.Material_Type);
  
      const stackedData = years.map(year => {
        const yearData = nestedData.find(d => +d[0] === year)?.[1] || [];
        const totalPerType = Object.fromEntries(materialTypes.map(type => [type, 0]));
  
        yearData.forEach(([type, records]) => {
          totalPerType[type] = d3.sum(records, r => +r[metric] || 0);
        });
  
        totalPerType.Year = year;
        return totalPerType;
      });
  
      const series = stack(stackedData);
  
      // Update scales
      yScale.domain([0, d3.max(series, layer => d3.max(layer, d => d[1]))]).nice();
      yAxisGroup.transition().call(yAxis);
  
      // Bind data to paths
      const layers = g.selectAll(".layer")
        .data(series);
  
      layers.enter()
        .append("path")
        .attr("class", "layer")
        .merge(layers)
        .transition()
        .duration(500)
        .attr("d", area)
        .attr("fill", d => colorScale(d.key));
  
      layers.exit().remove();
    }
  
    // Initial chart setup
    updateChart("Carbon_Footprint_MT");
  
    // Event listener for dropdown
    metricDropdown.on("change", function () {
      const selectedMetric = this.value;
      updateChart(selectedMetric);
    });
  
    // Tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background-color", "white")
      .style("border", "1px solid #ccc")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("opacity", 0);
  
    g.selectAll(".layer")
      .on("mouseover", (event, d) => {
        tooltip.transition().duration(200).style("opacity", 1);
      })
      .on("mousemove", (event, d) => {
        const [x, y] = d3.pointer(event);
        const year = Math.round(xScale.invert(x - margin.left));
        const total = d3.sum(d, e => e[1] - e[0]);
  
        tooltip.html(`<strong>${d.key}</strong><br>Year: ${year}<br>Total: ${total.toFixed(2)}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => {
        tooltip.transition().duration(200).style("opacity", 0);
      });
  
    // Legend
    const legend = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${height - 20})`);
  
    const legendItemWidth = 150;
  
    materialTypes.forEach((type, index) => {
      const legendGroup = legend.append("g")
        .attr("transform", `translate(${index * legendItemWidth}, 0)`);
  
      legendGroup.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", colorScale(type))
        .attr("y", -10);
  
      legendGroup.append("text")
        .attr("x", 20)
        .attr("y", 0)
        .attr("font-size", "12px")
        .attr("text-anchor", "start")
        .text(type);
    });
  
    // Back button functionality
    document.getElementById("back-button").addEventListener("click", () => {
      window.location.href = "index.html";
    });
  });
  