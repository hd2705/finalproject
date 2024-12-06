d3.csv('data.csv').then(data => {
    const width = window.innerWidth * 0.9;  // Full page width with 10% margin
    const height = window.innerHeight * 0.8; // Full page height with 20% margin
  
    // Process the data to ensure numeric values for relevant columns
    data.forEach(d => {
      d.Water_Usage_Liters = +d.Water_Usage_Liters;
      d.Waste_Production_KG = +d.Waste_Production_KG;
      d.Average_Price_USD = +d.Average_Price_USD;
      d.Year = +d.Year;
    });
  
    // Get unique countries, years, and material types
    const countries = Array.from(new Set(data.map(d => d.Country)));
    const years = Array.from(new Set(data.map(d => d.Year))).sort();
    const materialTypes = Array.from(new Set(data.map(d => d.Material_Type)));
  
    // Create scales for the chart
    const xScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.Water_Usage_Liters)) // X-axis: Water Usage
      .range([80, width - 80]); // Add margins for the axes
  
    const yScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.Waste_Production_KG)) // Y-axis: Waste Production
      .range([height - 80, 80]); // Add margins for the axes
  
    const sizeScale = d3.scaleSqrt()
      .domain(d3.extent(data, d => d.Average_Price_USD))
      .range([5, 30]); // Bubble size scale

    const colorScale = d3.scaleOrdinal()
      .domain(materialTypes)
      .range(d3.schemeTableau10); // Color scheme for material types
  
    // Create SVG container
    const svg = d3.select("#chart-container").append("svg")
      .attr("width", width)
      .attr("height", height);
  
    // Add X-axis
    const xAxis = d3.axisBottom(xScale).ticks(10).tickFormat(d3.format(".2s"));
    svg.append("g")
      .attr("transform", `translate(0, ${height - 80})`) // Position at the bottom
      .call(xAxis);
  
    // Add Y-axis
    const yAxis = d3.axisLeft(yScale).ticks(10).tickFormat(d3.format(".2s"));
    svg.append("g")
      .attr("transform", `translate(80, 0)`) // Position at the left
      .call(yAxis);
  
    // Add X-axis label
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 40)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("fill", "#333")
      .text("Water Usage (Liters)");
  
    // Add Y-axis label
    svg.append("text")
      .attr("x", -height / 2)
      .attr("y", 40)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("fill", "#333")
      .attr("transform", "rotate(-90)")
      .text("Waste Production (KG)");
  
    // Create dropdowns for selecting a country and year
    const controlsDiv = d3.select("#filter-controls");
  
    const countryDropdown = controlsDiv.select("#country-filter")
      .on("change", function() {
        const selectedCountry = this.value;
        updateGraph(selectedCountry, document.getElementById('year-filter').value);
      });
  
    countryDropdown.selectAll("option")
      .data(countries) // Removed "All" option
      .join("option")
      .attr("value", d => d)
      .text(d => d);

    // Automatically select the first country
    countryDropdown.property("value", countries[0]);
  
    const yearDropdown = controlsDiv.select("#year-filter")
      .on("change", function() {
        const selectedYear = this.value;
        updateGraph(document.getElementById('country-filter').value, selectedYear);
      });
  
    yearDropdown.selectAll("option")
      .data(years) // Removed "All" option
      .join("option")
      .attr("value", d => d)
      .text(d => d);

    // Automatically select the first year
    yearDropdown.property("value", years[0]);
  
    // Tooltip setup
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background-color", "white")
      .style("border", "1px solid #ccc")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("opacity", 0);
  
    // Function to update the graph based on filters
    function updateGraph(countryFilter, yearFilter) {
      let filteredData = data;
  
      // Apply filters for country and year
      if (countryFilter) {
        filteredData = filteredData.filter(d => d.Country === countryFilter);
      }
      if (yearFilter) {
        filteredData = filteredData.filter(d => d.Year === +yearFilter);
      }
  
      // Add bubbles (circles)
      const bubbles = svg.selectAll("circle")
        .data(filteredData)
        .join("circle")
        .attr("cx", d => xScale(d.Water_Usage_Liters))  // X-axis: Water Usage
        .attr("cy", d => yScale(d.Waste_Production_KG))  // Y-axis: Waste Production
        .attr("r", d => sizeScale(d.Average_Price_USD))  // Size based on Average Price
        .attr("fill", d => colorScale(d.Material_Type)) // Color based on Material Type
        .on("mouseover", (event, d) => {
          tooltip.transition().duration(200).style("opacity", 1);
          tooltip.html(`
            <strong>Material Type:</strong> ${d.Material_Type}<br>
            <strong>Country:</strong> ${d.Country}<br>
            <strong>Year:</strong> ${d.Year}<br>
            <strong>Average Price:</strong> $${d.Average_Price_USD}<br>
            <strong>Total Water Usage:</strong> ${d.Water_Usage_Liters} Liters<br>
            <strong>Total Waste Production:</strong> ${d.Waste_Production_KG} KG
          `)
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
    }
  
    // Initial rendering with first country and year
    updateGraph(countries[0], years[0]);
  });
// Back button functionality
document.getElementById("back-button").addEventListener("click", () => {
    window.location.href = "index.html";
  });