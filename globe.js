const width = window.innerWidth;
const height = window.innerHeight;

// Define the projection for the globe
const projection = d3.geoOrthographic()
    .scale(Math.min(width, height) / 2.2)
    .translate([width / 2, height / 2])
    .clipAngle(90);

// Define the path generator
const path = d3.geoPath(projection);

// Create an SVG container
const svg = d3.select("#globe")
    .attr("width", width)
    .attr("height", height);

// Add a background circle for the ocean
svg.append("circle")
    .attr("cx", width / 2)
    .attr("cy", height / 2)
    .attr("r", projection.scale())
    .attr("fill", "#87CEEB"); // Light blue for oceans

// Tooltip for country names
const tooltip = d3.select("#tooltip");

// Countries to color dark green
const greenCountries = [
    "Australia", "Japan", "United States of America", "Italy", 
    "Brazil", "France", "India", "United Kingdom", 
    "Germany", "China"
];

// Variables for drag interaction
let lastRotation = projection.rotate();
let dragStartCoords = null;

// Drag behavior for rotating the globe
// Drag behavior for rotating the globe
svg.call(d3.drag()
    .on("start", event => {
        dragStartCoords = [event.x, event.y]; // Store initial drag coordinates
    })
    .on("drag", event => {
        const newCoords = [event.x, event.y]; // Get new drag coordinates
        if (dragStartCoords) {
            // Calculate drag distances
            let dx = newCoords[0] - dragStartCoords[0];
            let dy = newCoords[1] - dragStartCoords[1];

            // Limit movement to 2cm equivalent (adjust as needed for your scale)
            const maxDrag = 20; // Maximum pixel distance for drag
            dx = Math.max(-maxDrag, Math.min(maxDrag, dx));
            dy = Math.max(-maxDrag, Math.min(maxDrag, dy));

            // Update projection rotation
            const currentRotation = projection.rotate();
            projection.rotate([
                currentRotation[0] + dx * 0.1, // Scale dx for rotation
                Math.max(-90, Math.min(90, currentRotation[1] - dy * 0.1)), // Limit vertical rotation to avoid flipping
                currentRotation[2]
            ]);

            // Update globe paths
            svg.selectAll("path").attr("d", path);
        }
    })
    .on("end", () => {
        lastRotation = projection.rotate(); // Save the final rotation state
        dragStartCoords = null; // Clear drag start coordinates
    })
);

// Load TopoJSON and render land areas only
d3.json("https://unpkg.com/world-atlas@2/countries-110m.json").then(world => {
    // Convert TopoJSON to GeoJSON
    const countries = topojson.feature(world, world.objects.countries).features;

    // Draw land features
    svg.selectAll("path")
        .data(countries)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", d => {
            const countryName = d.properties.name; // Adjust to match TopoJSON property
            return greenCountries.includes(countryName) ? "green" : "#90EE90"; // Light green for other countries
        })
        .attr("stroke", "#000") // Border color
        .attr("stroke-width", 0.5)
        .on("mouseover", (event, d) => {
            // Show tooltip with country name
            tooltip.classed("hidden", false)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 20}px`)
                .text(d.properties.name);
        })
        .on("mousemove", (event) => {
            // Move tooltip with the mouse
            tooltip.style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 20}px`);
        })
        .on("mouseout", () => {
            // Hide tooltip when mouse leaves
            tooltip.classed("hidden", true);
        })
        .on("click", () => {
            // Redirect to index.html on click
            window.location.href = "globe.html";
        });

    // Add spinning functionality
    const velocity = 1.4; // Adjust rotation speed
    let spinning = true;

    // Pause spinning on hover
    svg.on("mouseover", () => spinning = false)
       .on("mouseout", () => spinning = true);

    d3.timer(() => {
        if (spinning) {
            const rotate = projection.rotate();
            projection.rotate([rotate[0] + velocity, rotate[1], rotate[2]]);
            svg.selectAll("path").attr("d", path); // Update path positions
            svg.selectAll("circle").attr("d", path);
        }
    });
}).catch(error => {
    console.error("Error loading TopoJSON:", error);
});
