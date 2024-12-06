const width = 975, height = 610;
// Variables for animation controls
let isPlaying = false;
let animationInterval = null;
let currentYear = 2010; // Starting year for the animation

const countryNameMapping = {
  "USA": "United States of America",
  "United States": "United States of America",
  "UK": "United Kingdom"
};

// Fetch the map and CSV data
Promise.all([
  d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json'),
  d3.csv('data.csv')
]).then(([worldData, data]) => {

  const materialTypes = Array.from(new Set(data.map(d => d.Material_Type)));
  const materialDropdown = d3.select("#material-type");
  materialDropdown.selectAll("option")
      .data(["All", ...materialTypes])
      .join("option")
      .attr("value", d => d)
      .text(d => d);

  const countries = topojson.feature(worldData, worldData.objects.countries).features;

  const filterData = (year, materialType, ecoFriendly) => {
    return data.filter(d => {
      const validYear = +d.Year === +year;
      const validMaterial = materialType === "All" || d.Material_Type === materialType;
      const validEcoFriendly = ecoFriendly === "All" || d.Eco_Friendly_Manufacturing === ecoFriendly;
      return validYear && validMaterial && validEcoFriendly;
    });
  };

  const svg = d3.select("#chart")
    .append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height);

  const projection = d3.geoNaturalEarth1().scale(160).translate([width / 2, height / 2]);
  const path = d3.geoPath().projection(projection);
  const g = svg.append("g");

  // Define the zoom behavior and apply it to g instead of svg
  const zoom = d3.zoom().scaleExtent([1, 8]).on("zoom", zoomed);

  function zoomed(event) {
    g.attr("transform", event.transform);
    g.selectAll("path").attr("stroke-width", 1 / event.transform.k);
  }

  svg.call(zoom).on("dblclick.zoom", resetZoom);

  // Function to reset zoom
  function resetZoom() {
    svg.transition().duration(750).call(
      zoom.transform,
      d3.zoomIdentity.translate(width / 2, height / 2).scale(1)
    );
  }

  // Function to zoom to the bounding box of the clicked feature
  function zoomToFeature(feature) {
    const [[x0, y0], [x1, y1]] = path.bounds(feature); // Calculate bounding box of the feature
    const dx = x1 - x0,
          dy = y1 - y0,
          x = (x0 + x1) / 2,
          y = (y0 + y1) / 2,
          scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height))),
          translate = [width / 2 - scale * x, height / 2 - scale * y];
    
    svg.transition().duration(750).call(
      zoom.transform,
      d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
    );
  }

  // Define color scales for each data type
  const colorScaleFootprint = d3.scaleSequential(d3.interpolateGreens).domain([0, 500]);
  const colorScaleSustainability = d3.scaleSequential(d3.interpolateOranges).domain([1, 5]);
  const colorScaleWaterUsage = d3.scaleSequential(d3.interpolateBlues);
  const colorScaleWasteProduction = d3.scaleSequential(d3.interpolatePurples);

  // Create tooltip div
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background-color", "white")
    .style("border", "1px solid #ccc")
    .style("padding", "8px")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("opacity", 0);

  // Update map based on selected filters
  const updateMap = (year, materialType, ecoFriendly, dataType) => {
    const filteredData = filterData(year, materialType, ecoFriendly);
    const countryDataMap = new Map();
    let minVal, maxVal;

    filteredData.forEach(d => {
      const countryName = countryNameMapping[d.Country] || d.Country;
      let value;

      if (dataType === "Carbon Footprint") {
        value = +d.Carbon_Footprint_MT;
        countryDataMap.set(countryName, value);
      } else if (dataType === "Sustainability Rating") {
        value = d.Sustainability_Rating === 'A' ? 1 : d.Sustainability_Rating === 'B' ? 2 : d.Sustainability_Rating === 'C' ? 3 : d.Sustainability_Rating === 'D' ? 4 : 5;
        countryDataMap.set(countryName, value);
      } else if (dataType === "Water Usage (Liters)") {
        value = +d.Water_Usage_Liters;
        countryDataMap.set(countryName, value);
      } else if (dataType === "Waste Production (KG)") {
        value = +d.Waste_Production_KG;
        countryDataMap.set(countryName, value);
      }

      if ((dataType === "Water Usage (Liters)" || dataType === "Waste Production (KG)") && value != null) {
        if (minVal === undefined || value < minVal) minVal = value;
        if (maxVal === undefined || value > maxVal) maxVal = value;
      }
    });

    const colorScale = dataType === "Carbon Footprint" ? colorScaleFootprint
                    : dataType === "Sustainability Rating" ? colorScaleSustainability
                    : dataType === "Water Usage (Liters)" ? colorScaleWaterUsage.domain([minVal, maxVal])
                    : colorScaleWasteProduction.domain([minVal, maxVal]);

    g.selectAll("path")
      .data(countries)
      .join("path")
      .attr("fill", d => {
        const countryValue = countryDataMap.get(d.properties.name);
        return countryValue != null ? colorScale(countryValue) : "#ccc";
      })
      .attr("d", path)
      .attr("stroke", "white")
      .on("click", (event, d) => {
        zoomToFeature(d);  // Zoom to the selected country
        showCountryDetails(d.properties.name, selectedYear, selectedMaterial, selectedEcoFriendly, countryDataMap);  // Show details in the sidebar
      })
      .on("mouseover", (event, d) => {
        const countryValue = countryDataMap.get(d.properties.name);
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`<strong>${d.properties.name}</strong><br>Value: ${countryValue !== undefined ? countryValue : "N/A"}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mousemove", (event) => {
        tooltip.style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => {
        tooltip.transition().duration(200).style("opacity", 0);
      });
  };
  
// Function to update year on range slider and re-render visualization
function updateYear(year, data) {
  document.getElementById("year-range").value = year;
  document.getElementById("year-label").innerText = year;
  updateMap(year, selectedMaterial, selectedEcoFriendly, selectedDataType);
}

// Play/pause button functions for animation control
function playAnimation(data) {
  isPlaying = true;
  document.getElementById("play-button").disabled = true;
  document.getElementById("pause-button").disabled = false;

  animationInterval = setInterval(() => {
      if (currentYear > 2024) {
          currentYear = 2010; // Reset to the start year if reached the end
      }
      updateYear(currentYear, data);
      currentYear++;
  }, 400); // Adjust speed (1000ms = 1 second per year)
}

function pauseAnimation() {
  isPlaying = false;
  document.getElementById("play-button").disabled = false;
  document.getElementById("pause-button").disabled = true;

  clearInterval(animationInterval);
}

// Add event listeners to Play and Pause buttons and year slider
// Add event listeners to Play and Pause buttons and year slider
function addEventListeners(data) {
  document.getElementById("play-button").addEventListener("click", () => playAnimation(data));
  document.getElementById("pause-button").addEventListener("click", pauseAnimation);

  // Year slider listener to allow manual adjustments
  document.getElementById("year-range").addEventListener("input", event => {
      currentYear = +event.target.value;
      updateYear(currentYear, data);
  });

  // Add event listener for "View Trends" button (this should NOT be inside the year slider listener)
  // Dropdown event listener
document.getElementById("visualization-select").addEventListener("change", function () {
  const selectedValue = this.value;

  // Navigate to the corresponding page based on the selection
  if (selectedValue === "trends") {
    window.location.href = "trends.html"; // Stacked Area Chart page
  } else if (selectedValue === "sankey") {
    window.location.href = "sankey.html"; // Sankey Diagram page
  } else if (selectedValue === "bubble") {
    window.location.href = "bubble.html"; // bubble chart page
  }
});

}


// Function to show details in sidebar
function showCountryDetails(country, year, materialType, ecoFriendly, countryDataMap) {
  const detailsSidebar = document.getElementById("details-sidebar");
  const countryName = document.getElementById("country-name");
  const detailsYear = document.getElementById("details-year");
  const detailsMaterialType = document.getElementById("details-material-type");
  const detailsEcoFriendly = document.getElementById("details-eco-friendly");
  const detailsCarbonFootprint = document.getElementById("details-carbon-footprint");
  const detailsSustainabilityRating = document.getElementById("details-sustainability-rating");
  const detailsWaterUsage = document.getElementById("details-water-usage");
  const detailsWasteProduction = document.getElementById("details-waste-production");

  // Find the data for the selected country and year
  const countryData = data.find(d => 
    (countryNameMapping[d.Country] || d.Country) === country &&
    +d.Year === +year &&
    (materialType === "All" || d.Material_Type === materialType) &&
    (ecoFriendly === "All" || d.Eco_Friendly_Manufacturing === ecoFriendly)
  );

  // Update sidebar content with specific values for each metric
  countryName.textContent = country;
  detailsYear.textContent = year;
  detailsMaterialType.textContent = materialType;
  detailsEcoFriendly.textContent = ecoFriendly;
  detailsCarbonFootprint.textContent = countryData ? countryData.Carbon_Footprint_MT : "N/A";
  detailsSustainabilityRating.textContent = countryData ? countryData.Sustainability_Rating : "N/A";
  detailsWaterUsage.textContent = countryData ? countryData.Water_Usage_Liters : "N/A";
  detailsWasteProduction.textContent = countryData ? countryData.Waste_Production_KG : "N/A";

  // Show the sidebar
  detailsSidebar.style.display = "block";

  // Add click event to redirect to the new page
  countryName.addEventListener("click", () => {
    window.location.href = `country-details.html?country=${encodeURIComponent(country)}`;
  });
}

  // Close sidebar functionality
  document.getElementById("close-sidebar").addEventListener("click", () => {
    document.getElementById("details-sidebar").style.display = "none";
  });

  function resetZoom() {
    svg.transition().duration(750).call(
      zoom.transform,
      d3.zoomIdentity.translate(width / 2, height / 2).scale(1)
    );
  }

  let selectedYear = 2024;
  let selectedMaterial = "All";
  let selectedEcoFriendly = "All";
  let selectedDataType = "Carbon Footprint";

  updateMap(selectedYear, selectedMaterial, selectedEcoFriendly, selectedDataType);

  d3.select("#year-range").on("input", function () {
    selectedYear = +this.value;
    d3.select("#year-label").text(this.value);
    updateMap(selectedYear, selectedMaterial, selectedEcoFriendly, selectedDataType);
  });

  d3.select("#material-type").on("change", function () {
    selectedMaterial = this.value;
    updateMap(selectedYear, selectedMaterial, selectedEcoFriendly, selectedDataType);
  });

  d3.select("#eco-friendly").on("change", function () {
    selectedEcoFriendly = this.value;
    updateMap(selectedYear, selectedMaterial, selectedEcoFriendly, selectedDataType);
  });

  d3.select("#data-type").on("change", function () {
    selectedDataType = this.value;
    updateMap(selectedYear, selectedMaterial, selectedEcoFriendly, selectedDataType);
  });
  // Call addEventListeners to set up Play/Pause controls and slider adjustments
  addEventListeners(data);
  
}).catch(error => {
  console.error("Error loading data:", error);
});
