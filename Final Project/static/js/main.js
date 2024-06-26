
var w = 650;
var h = 880;
var proj = d3.geo.mercator();
var path = d3.geo.path().projection(proj);
var t = proj.translate(); // the projection's default translation
var s = proj.scale() // the projection's default scale

d3.json("/get_banks_data", function (banksData) { // Load the state data from Flask

    d3.json("/full_data_india", function (json) {

        var sliderContainer = d3.select("#slider-container");
        var clickedState = "All States";
        var selectedStates = [];
        var selectedRegions = []
        var clickedPath = null;
        var selectedDate = new Date(2022, 11, 31).getTime();
        var sliderYear = "2022";

        var sliderDateFormat = d3.time.format("%Y");
        var prevYear = null;
        var startDate = new Date(2006, 2, 31);
        var endDate = new Date(2022, 11, 31);
        var quarterSteps = [];
        var slider;


        while (startDate <= endDate) {
            quarterSteps.push(startDate.getTime());
            startDate.setMonth(startDate.getMonth() + 3);
        }

        // console.log("QS length: " + quarterSteps.length)
        function updateSlider(selDate) {
            slider = d3.slider()
                .min(new Date(2006, 2, 31).getTime())
                .max(new Date(2022, 11, 31).getTime())
                .ticks(67)
                .tickFormat(function (d) {
                    // Format the tick value as a year string
                    var datefor = sliderDateFormat(new Date(d));
                    if (datefor != prevYear) {
                        prevYear = datefor;
                        return datefor;
                    }
                    else {
                        return "";
                    }
                })
                .stepValues(quarterSteps)
                .value(selDate)
                .showRange(true)
                .callback(updateDashboard);

            sliderContainer.html("");
            sliderContainer.call(slider);
        }

        d3.select("#playButton").on("click", function () {
            var t = 5000; // 5 seconds
            var startTime = new Date(2006, 2, 31).getTime();
            var endTime = new Date(2022, 11, 31).getTime();
            var currentValue = startTime;
            slider.value(currentValue);

            var intervalId = setInterval(function () {
                // Incrementally update the slider value
                currentValue += (endTime - startTime) / 100;
                slider.value(currentValue);
                sliderContainer.html("");
                sliderContainer.call(slider);
                // Update the dashboard
                updateDashboard();

                // Stop the interval when the slider reaches the end
                if (currentValue >= endTime) {
                    clearInterval(intervalId);
                }
            }, 10); // Update the slider every 10ms during the transition
        });


        //   slider.on("slidechange", function (evt, value) {
        //     updateMap();
        // });

        // Add the slider to the container


        // var colorScale = d3.scale.linear()
        //     .domain([0, 5500])
        //     .range(["#FFF7BC", "#E65100"]);
        var colorScale = d3.scale.linear()
            .domain([0, 5000, 5500])
            .range(["#fdbb2d", "#b21f1f", "#3c3c9d"]);

        var colorScales = {
            "northern": d3.scale.linear().domain([0, 5500]).range(["#f7fbff", "#08306b"]),
            "southern": d3.scale.linear().domain([0, 5500]).range(["#f7fcf5", "#00441b"]),
            "eastern": d3.scale.linear().domain([0, 5500]).range(["#fff7bc", "#7f2704"]),
            "western": d3.scale.linear().domain([0, 5500]).range(["#ffffcc", "#662506"]),
            "northeastern": d3.scale.linear().domain([0, 5500]).range(["#e0f3db", "#238b45"]),
            "central": d3.scale.linear().domain([0, 5500]).range(["#ffffb2", "#b10026"])
        };

        // Get unique regions and their respective states
        var regionStateArray = d3.nest()
            .key(function (d) { return d.Region; })
            .rollup(function (v) { return d3.set(v.map(function (d) { return d.State; })).values(); })
            .entries(banksData);

        // Store regions in an array for use in color scales
        var regions = regionStateArray.map(function (d) { return d.key; });
        console.log(regions)

        function updateMap(selectedQuarter) {
            var svgcheck = d3.select("#indiachart").select("svg");

            // Check if the SVG element exists
            if (!svgcheck.empty()) {
                // If it exists, remove it
                svgcheck.remove();
            }

            var svg = d3.select("#indiachart")
                .append("svg:svg")
                .attr("width", w)
                .attr("height", h)
                .style("background-color", "#172144")
                .call(initialize);

            var map = svg.append("svg:g")


            var india = map.append("svg:g")
                .attr("id", "india")
                .style('stroke', '#df0892')
                .style('stroke-width', '0.2');

            // Add title to the chart
            svg.append("text")
                .attr("x", (w / 2))
                .attr("y", 0 - (20 / 2) + 45)
                .attr("text-anchor", "middle")
                .style("font-size", "18px")
                .attr("font-weight", "bold")
                .text("MAP OF INDIA ");

            // var title = svg.append("text")
            //     .attr("x", (width / 2))
            //     .attr("y", 0 - (margin.top / 2) + 25)
            //     .attr("text-anchor", "middle")
            //     .style("font-size", "20px");



            // Update the map using the selected date


            var stateSum = {};

            banksData.forEach(function (d) {
                if (d["Quarter : Population Group"].startsWith(selectedQuarter)) {
                    var state = d.State;
                    var value = d.Value;
                    if (stateSum[state]) {
                        stateSum[state] += value;
                    } else {
                        stateSum[state] = value;
                    }
                }
            });

            // var values = Object.values(stateSum);
            // var minValue = Math.min(...values);
            // var maxValue = Math.max(...values);


            india.selectAll("path")
                .data(json.features)
                .enter().append("path")
                .attr("d", path)
                .attr("id", "state")
                .style("fill", function (d) {
                    var stateName = d.id; // Get the name of the state from the GeoJSON data
                    var regionNames = { "Eastern Region": "eastern", "Southern Region": "southern", "North Eastern Region": "northeastern", "Northern Region": "northern", "Central Region": "central", "Western Region": "western" }

                    return colorScale(stateSum[stateName]); // Use the value to get the color from the color scale
                })
                .on("mouseover", handleMouseOver)
                .on("mouseout", handleMouseOut)
                .on("click", handleClick)
                .append("title")
                .text(function (d) {
                    var stateName = d.id;
                    return "State : " + stateName + "\n No. of Bank Offices : " + stateSum[stateName];
                });


            function handleClick(d) {
                var stateName = d.id;
                clickedState = stateName;
                clickedPath = d3.select(this);
                var isSelected = clickedPath.classed("selected");

                updateDashboard();

                // Add state id to selectedStates list if not already present
                if (selectedStates.indexOf(stateName) === -1) {
                    selectedStates.push(stateName);
                }



                if (isSelected) {
                    clickedPath.classed("selected", false);
                    // Remove state id from selectedStates list if already present
                    selectedStates.splice(selectedStates.indexOf(stateName), 1);
                } else {
                    clickedPath.classed("selected", true);
                }

            }

            if (selectedStates.length !== 0) {
                // Remove dimmed filter from selected paths and highlight them
                d3.selectAll("#state").classed("dimmed", true);
                d3.selectAll("#state")
                    .filter(function (d) { return selectedStates.indexOf(d.id) !== -1; })
                    .classed("dimmed", false);
            }

            var defs = svg.append("defs");

            var linearGradient = defs.append("linearGradient")
                .attr("id", "legend-gradient")
                .attr("x1", "0%")
                .attr("y1", "0%")
                .attr("x2", "100%")
                .attr("y2", "0%");

            linearGradient.selectAll("stop")
                .data(colorScale.range())
                .enter().append("stop")
                .attr("offset", function (d, i) { return i / (colorScale.range().length - 1); })
                .attr("stop-color", function (d) { return d; });

            var legend = svg.append("g")
                .attr("class", "legend")
                .attr("transform", "translate(" + (w - 200 - 380) + "," + (h - 100) + ")");
            //70,780
            legend.append("rect")
                .attr("width", 500)
                .attr("height", 20)
                .style("fill", "url(#legend-gradient)");

            var xScale = d3.scale.linear()
                .domain([0, 5500])
                .range([0, 500]);

            var xAxis = d3.svg.axis()
                .scale(xScale)
                .orient("bottom")
                .ticks(5);

            var ticks = legend.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0,20)")
                .call(xAxis)
                .selectAll(".tick line")
                .style("stroke", "black")
                .style("stroke-width", "1px");

            ticks.each(function (d, i) {
                var tick = d3.select(this);
                var x = tick.attr("x1");
                var y = parseFloat(tick.attr("y1")) - 5;
                var width = tick.attr("x2") - x;
                var height = 10;

                legend.append("rect")
                    .attr("x", x)
                    .attr("y", y)
                    .attr("width", width)
                    .attr("height", height)
                    .style("fill", colorScale(d));
            });

            legend.selectAll("text")
                .data(colorScale.domain())
                .enter().append("text")
                .attr("x", function (d, i) { return xScale(i); })
                .attr("y", -5)
                .attr("text-anchor", "middle")
                .text(function (d) { return d; });

        }
        function handleMouseOver() {
            d3.select(this).attr("stroke-width", "1.4")
        }
        function handleMouseOut() {
            d3.select(this).attr("stroke-width", "0.2")
        }

        function initialize() {
            proj.scale(7000);
            proj.translate([-1280, 820]);
        }

        function updateBarChart(selectedStates, sliderYear) {
            var svgcheck = d3.select("#barchart").select("svg");

            // Check if the SVG element exists
            if (!svgcheck.empty()) {
                // If it exists, remove it
                svgcheck.remove();
            }

            // Define the dimensions of the chart
            var margin = { top: 80, right: 40, bottom: 80, left: 80 },
                width = 560 - margin.left - margin.right,
                height = 440 - margin.top - margin.bottom;

            // Define the x and y scales
            var x = d3.scale.ordinal().rangeRoundBands([0, width], 0.1);
            var y = d3.scale.linear().range([height, 0]);

            // Define the x and y axes
            var xAxis = d3.svg.axis().scale(x).orient("bottom");
            var yAxis = d3.svg.axis().scale(y).orient("left").ticks(10);

            // Create the SVG element and set its size
            var svg = d3.select("#barchart")
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .style("background-color", "#172144")
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            // Add title to the chart
            svg.append("text")
                .attr("x", (width / 2))
                .attr("y", 0 - (margin.top / 2))
                .attr("text-anchor", "middle")
                .style("font-size", "18px")
                .attr("font-weight", "bold")
                .text("NUMBER OF BANK OFFICES BY YEAR IN ");

            var title = svg.append("text")
                .attr("x", (width / 2))
                .attr("y", 0 - (margin.top / 2) + 25)
                .attr("text-anchor", "middle")
                .style("font-size", "18px");

            // Create a string of the selected states for the title
            var stateString = "ALL STATES";
            if (selectedStates.length > 1) {
                stateString = "SELECTED STATES";
            } else if (selectedStates.length === 1) {
                stateString = selectedStates[0] + " State";
            } else {
                stateString = "ALL STATES";
            }


            // title.append("tspan")
            //     .text(selectedStates.join(", "))
            //     .style("font-weight", "bold");

            title.append("tspan")
                .text(" " + stateString)
                .style("font-weight", "normal");

            // Process the data and create the chart
            var yearSum = {};
            banksData.forEach(function (d) {
                if (clickedState === "All States" && selectedStates.length === 0) {
                    quarterPopulation = d["Quarter : Population Group"]
                    var yearString = quarterPopulation.split(" ")[1];
                    var year = parseInt(yearString);
                    var value = d.Value;
                    if (yearSum[year]) {
                        yearSum[year] += value;
                    } else {
                        yearSum[year] = value;
                    }
                }
                else {
                    if (selectedStates.indexOf(d["State"]) !== -1) {
                        quarterPopulation = d["Quarter : Population Group"];
                        var yearString = quarterPopulation.split(" ")[1];
                        var year = parseInt(yearString);
                        var value = d.Value;
                        if (yearSum[year]) {
                            yearSum[year] += value;
                        } else {
                            yearSum[year] = value;
                        }
                    }
                }
            });


            // Convert the data into an array of objects with year and value properties
            var data = [];
            for (var year in yearSum) {
                if (year <= sliderYear) {
                    data.push({ year: year, value: yearSum[year] });
                }
            }
            // var colorScaleBar = d3.scale.linear()
            //     .domain([d3.min(data, function (d) { return d.value; }), d3.max(data, function (d) { return d.value; })])
            //     .range(["#00BFA5", "#005C4F"]);

            var colorScaleBar = d3.scale.linear()
                .domain([d3.min(data, function (d) { return d.value; }),
                (d3.max(data, function (d) { return d.value; }) * 9 / 10),
                d3.max(data, function (d) { return d.value; })])
                .range(["#fdbb2d", "#b21f1f", "#3c3c9d"]);

            // Set the domains of the x and y scales
            x.domain(data.map(function (d) { return d.year; }));
            y.domain([0, d3.max(data, function (d) { return d.value; })]);

            // Add the x axis to the chart
            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis)
                .selectAll("text")
                .attr("transform", "rotate(-45)")
                .style("text-anchor", "end");

            // Add the y axis to the chart
            svg.append("g")
                .attr("class", "y axis")
                .call(yAxis)
                .append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 6)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .text("No. of Bank Offices");

            // Add the bars to the chart with transition
            svg.selectAll(".bar")
                .data(data)
                .enter().append("rect")
                .attr("class", "bar")
                .attr("x", function (d) { return x(d.year); })
                .attr("width", x.rangeBand())
                .attr("y", height)
                .attr("height", 0)
                .style("fill", function (d) { return colorScaleBar(d.value); })
                .on("mouseover", function (d) {
                    d3.select(this)
                        .append("title")
                        .text("No of Bank Offices : " + d.value);
                })
                .on("mouseout", function (d) {
                    d3.select(this).select("title").remove();
                })
                .on("click", function (d) {
                    handleClick(d.year);
                })
                // .transition()
                // .duration(1000)
                .attr("y", function (d) { return y(d.value); })
                .attr("height", function (d) { return height - y(d.value); });

            function handleClick(year) {
                selectedDate = new Date(year, 11, 31).getTime();
                updateSlider(selectedDate);
                updateDashboard();
            }


        }

        function updateTreeMap() {
            // Remove any existing SVG elements
            d3.select("#treemapChart").selectAll("*").remove();

            // Define the size of the chart
            // var width = 560;
            // var height = 420;
            var margin = {top: 30, right: 0, bottom: 0, left: 0};
var width = 560 - margin.left - margin.right;
var height = 420 - margin.top - margin.bottom;

            // Define the color scale for the chart
            var color = d3.scale.ordinal()
                .domain(["Metropolitan", "Urban", "Semi-urban", "Rural"])
                .range(["#fdbb2d", "#b21f1f", "#3c3c9d", "#1a2a6c"]);

            // Define the layout for the treemap chart
            var treemap = d3.layout.treemap()
                .size([width, height])
                .sticky(true)
                .value(function (d) { return d.Value; });

            var popSum = {};
            banksData.forEach(function (d) {
                quarterPopulation = d["Quarter : Population Group"];
                if (clickedState === "All States" && selectedStates.length === 0) {
                    if (quarterPopulation.split(" ")[1] === sliderYear) {
                        var popString = quarterPopulation.split(" ")[3];
                        if (!(popString === "Total")) {
                            var value = d.Value;
                            if (popSum[popString]) {
                                popSum[popString] += value;
                            } else {
                                popSum[popString] = value;
                            }
                        }
                    }
                }
                else {
                    if (quarterPopulation.split(" ")[1] === sliderYear && selectedStates.includes(d["State"])) {
                        var popString = quarterPopulation.split(" ")[3];
                        if (!(popString === "Total")) {
                            var value = d.Value;
                            if (popSum[popString]) {
                                popSum[popString] += value;
                            } else {
                                popSum[popString] = value;
                            }
                        }
                    }
                }
            });

            // Convert the data into an array of objects with year and value properties
            var data = popSum;

            // Define the treemap layout
            var treemap = d3.layout.treemap()
                .size([width, height])
                .sticky(true)
                .value(function (d) { return d.size; });

            // Define the root node of the treemap
            var root = {
                name: "root",
                children: []
            };

            // Convert the data into the format required by the treemap layout
            for (var group in data) {
                root.children.push({
                    name: group,
                    size: data[group]
                });
            }

            // Define the SVG container for the chart
            var svg2 = d3.select("#treemapChart")
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .style("background-color", "#172144");

                svg2.append("text")
                .attr("x", (width / 2) )
                .attr("y", 0 - (margin.top / 2) +440 -15)
                .attr("text-anchor", "middle")
                .style("font-size", "18px")
                .attr("font-weight", "bold")
                .text("POPULATION GROUP-WISE TREEMAP");

            // Compute the treemap layout
            var nodes = treemap.nodes(root);

            // Create a cell for each node in the treemap
            var cell = svg2.selectAll(".cell")
                .data(nodes)
                .enter()
                .append("g")
                .attr("class", "cell")
                .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });

            // Add the rect elements to the cell group
            cell.append("rect")
                .attr("width", function (d) { return d.dx; })
                .attr("height", function (d) { return d.dy; })
                .style("fill", function (d) { return color(d.value); })
                .append("title") // create a new line using tspan
                .attr("x", function (d) { return d.dx / 2; })
                .attr("dy", "1.2em") // move down one line
                .text(function (d) { return "No. of Bank Offices: " + d.value; });

            // Add the text elements to the cell group
            cell.append("text")
                .attr("x", function (d) { return d.dx / 2; })
                .attr("y", function (d) { return d.dy / 2; })
                .attr("dy", ".35em")
                .style("text-anchor", "middle")
                .text(function (d) {
                    var name = d.name;
                    var value = d.value;
                    if (value != 0) {
                        return name + " "; // add a space between name and value
                    }
                    else {
                        return " ";
                    }

                })
                .append("tspan") // create a new line using tspan
                .attr("x", function (d) { return d.dx / 2; })
                .attr("dy", "1.2em") // move down one line
                .style("font-size", 24)
                .style("color", "#fff")
                .text(function (d) {
                    if (d.value != 0) {
                        return d.value; // add a space between name and value
                    }
                    else {
                        return " ";
                    }
                });


        }

        function updateDetailsBox() {
            var width = 250;
            var height = 880;

            d3.select("#details-box").selectAll("*").remove();

            // Create the SVG container for the box
            var svg = d3.select("#details-box")
                .append("svg")
                .style("background", "linear-gradient(60deg, #1e1474 0%, #df0892 100%)")
                .style("border", "none")
                .attr("width", width)
                .attr("height", height);

            // Create a group for the box
            var boxGroup = svg.append("g").style("fill", "none");

            boxGroup.append("rect")
                .attr("width", width)
                .attr("height", height)
                .style("fill", "none");

            var textElem = boxGroup.append("text")
                .text("GROUP 91")
                .attr("x", width / 2)
                .attr("y", height / 2 - 350)
                .attr("text-anchor", "middle")
                .style("font-size", "14px")
                .attr("font-weight", "bold");

            // Add the tspan element for the second line of text
            textElem.append("tspan")
                .attr("x", width / 2)
                .attr("dy", "1.2em")
                .style("font-size", 18)
                .attr("font-weight", "bold")
                .attr("color", "#E65100")
                .text("ANUJAY GHOSH");

            // Add the rectangle around the text
            // define the linear gradient
            var gradient = boxGroup.append("defs")
                .append("linearGradient")
                .attr("id", "grad")
                .attr("x1", "0%")
                .attr("y1", "0%")
                .attr("x2", "0%")
                .attr("y2", "100%");
            gradient.append("stop")
                .attr("offset", "0%")
                .attr("stop-color", "#fff")
                .attr("stop-opacity", "0.1");
            gradient.append("stop")
                .attr("offset", "100%")
                .attr("stop-color", "#fff")
                .attr("stop-opacity", "0.5");

            boxGroup.insert("rect", ":first-child")
                .attr("x", textElem.node().getBBox().x - 20)
                .attr("y", textElem.node().getBBox().y - 20)
                .attr("width", textElem.node().getBBox().width + 40)
                .attr("height", textElem.node().getBBox().height + 40)
                .attr("fill", "url(#grad)")
                .attr("stroke", "none")
                .attr("rx", 20)
                .attr("filter", "drop-shadow(0px 0px 5px rgba(0, 0, 0, 0.5))");


            // Add text for sliderYear to the box group
            boxGroup.append("text")
                .text("YEAR : ")
                .attr("x", width / 2)
                .attr("y", height / 2 - 250)
                .attr("text-anchor", "middle")
                .style("font-size", "14px")
                .attr("font-weight", "bold")
                .append("tspan") // create a new line using tspan
                .attr("x", width / 2)
                .attr("dy", "1.2em") // move down one line
                .style("font-size", 18)
                .attr("font-weight", "bold")
                .attr("color", "#E65100")
                .text(sliderYear);


            boxGroup.append("text")
                .text(" ")
                .attr("x", width / 2)
                .attr("y", height / 2 + 50)
                .attr("text-anchor", "middle")
                .style("font-size", "36px");



            if (selectedRegions.length < 6) {
                boxGroup.append("text")
                    .text("SELECTED REGION/S : ")
                    .attr("x", width / 2)
                    .attr("y", height / 2 - 150)
                    .attr("text-anchor", "middle")
                    .style("font-size", "14px")
                    .attr("font-weight", "bold")
                    .selectAll("tspan") // use selectAll to create multiple tspans
                    .data(selectedRegions)
                    .enter()
                    .append("tspan")
                    .attr("x", width / 2)
                    .attr("dy", "1.2em") // move down one line for each state
                    .style("font-size", 18)
                    .style("color", "#E65100")
                    .text(function (d) { return d; });
            } else {
                boxGroup.append("text")
                    .text("SELECTED REGION/S : ")
                    .attr("x", width / 2)
                    .attr("y", height / 2 - 150)
                    .attr("text-anchor", "middle")
                    .style("font-size", "14px")
                    .attr("font-weight", "bold")
                    .append("tspan") // create a new line using tspan
                    .attr("x", width / 2)
                    .attr("dy", "1.2em") // move down one line
                    .style("font-size", 18)
                    .attr("font-weight", "bold")
                    .attr("color", "#E65100")
                    .text("All Regions");
            }
            // Add text for clickedState to the box group

            if (selectedStates.length !== 0) {
                // Add text for clickedState to the box group
                boxGroup.append("text")
                    .text("SELECTED STATE/S : ")
                    .attr("x", width / 2)
                    .attr("y", height / 2 + 100)
                    .attr("text-anchor", "middle")
                    .style("font-size", "14px")
                    .attr("font-weight", "bold")
                    .selectAll("tspan") // use selectAll to create multiple tspans
                    .data(selectedStates)
                    .enter()
                    .append("tspan")
                    .attr("x", width / 2)
                    .attr("dy", "1.2em") // move down one line for each state
                    .style("font-size", 18)
                    .style("color", "#E65100")
                    .text(function (d) { return d; });
            } else {
                boxGroup.append("text")
                    .text("SELECTED STATE/S : ")
                    .attr("x", width / 2)
                    .attr("y", height / 2 + 100)
                    .attr("text-anchor", "middle")
                    .style("font-size", "14px")
                    .attr("font-weight", "bold")
                    .append("tspan") // create a new line using tspan
                    .attr("x", width / 2)
                    .attr("dy", "1.2em") // move down one line
                    .style("font-size", 18)
                    .attr("font-weight", "bold")
                    .attr("color", "#E65100")
                    .text("All States");
            }


        }

        function updateDonutChart() {
            // Define the donut chart dimensions
            var width = 360,
                height = 440,
                radius = Math.min(width, height) / 2;

            d3.select("#donutChart").selectAll("*").remove();

            // Define the color scale for the chart
            var color = d3.scale.category10();

            // Define the data for the chart
            var data = d3.nest()
                .key(function (d) { return d["Bank"]; })
                .rollup(function (v) {
                    if (clickedState === "All States" && selectedStates.length === 0) {
                        var filteredData = v.filter(function (d) {
                            quarterPopulation = d["Quarter : Population Group"]
                            var yearString = quarterPopulation.split(" ")[1];
                            return yearString === sliderYear;
                        });

                        return d3.sum(filteredData, function (d) { return d["Value"]; });
                    }
                    else {
                        var filteredData = v.filter(function (d) {
                            quarterPopulation = d["Quarter : Population Group"]
                            var yearString = quarterPopulation.split(" ")[1];
                            return (yearString === sliderYear) && selectedStates.includes(d["State"]);
                        });

                        return d3.sum(filteredData, function (d) { return d["Value"]; });
                    }
                })
                .entries(banksData);

            // Define the SVG container for the chart
            var svg = d3.select("#donutChart")
                .append("svg")
                .attr("width", width)
                .attr("height", height)
                .style("background-color", "#172144")
                .append("g")
                .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

            // Add title to the chart
            svg.append("text")
                .attr("x", (width / 2) - 180)
                .attr("y", 0 - (20 / 2) - 290 +130)
                .attr("text-anchor", "middle")
                .style("font-size", "18px")
                .attr("font-weight", "bold")
                .text("BANK-WISE PIE CHART");

            // Define the donut layout
            var donut = d3.layout.pie()
                .value(function (d) { return d.values; })
                .sort(null);

            // Define the arc generator
            var arc = d3.svg.arc()
                .innerRadius(radius - 100)
                .outerRadius(radius - 50);

            // Create a path for each slice in the donut
            // Define the tooltip element
            var tooltip = svg.append("text")
                .attr("class", "tooltip")
                .attr("text-anchor", "middle")
                .attr("font-size", "16px");

            var totalValue = d3.sum(data, function (d) { return d.values; });
            tooltip.selectAll("*").remove();
            tooltip.attr("y", "0")
                .append("tspan")
                .attr("class", "tooltip-value")
                .attr("text-anchor", "middle")
                .attr("font-size", "16px")
                .attr("fill", "#df0892")
                .attr("font-weight", "bold")
                .text("ALL BANKS");
            tooltip.append("tspan")
                .attr("y", "18px")
                .attr("x", "0")
                .attr("class", "tooltip-value")
                .attr("text-anchor", "middle")
                .attr("font-size", "16px")
                .text(totalValue);
            tooltip.append("tspan")
                .attr("class", "tooltip-value")
                .attr("text-anchor", "middle")
                .attr("font-size", "16px")
                .attr("y", "36px")
                .attr("x", "0")
                .text((totalValue * 100 / totalValue).toFixed(1) + "%");


            // Add the path elements to the SVG container
            var path = svg.selectAll("path")
                .data(donut(data))
                .enter()
                .append("path")
                .attr("d", arc)
                .attr("fill", function (d) { return color(d.data.key); })
                .on("mouseover", function (d) {
                    d3.select(this).transition()
                        .duration(200)
                        .attr("d", arc.innerRadius(radius - 110).outerRadius(radius - 40));
                    // Show bank name and value on hover
                    var bankName = d.data.key;
                    var value = d.value;
                    tooltip.selectAll("*").remove();
                    tooltip.append("tspan")
                        .attr("class", "tooltip-value")
                        .attr("text-anchor", "middle")
                        .attr("font-size", "16px")
                        .attr("fill", function (d) { return color(bankName); })
                        .attr("font-weight", "bold")
                        .text(bankName);
                    tooltip.append("tspan")
                        .attr("class", "tooltip-value")
                        .attr("text-anchor", "middle")
                        .attr("font-size", "16px")
                        .attr("y", "18px")
                        .attr("x", "0")
                        .text(value);
                    tooltip.append("tspan")
                        .attr("class", "tooltip-value")
                        .attr("text-anchor", "middle")
                        .attr("font-size", "16px")
                        .attr("y", "36px")
                        .attr("x", "0")
                        .text((value * 100 / totalValue).toFixed(1) + "%");

                })
                .on("mouseout", function (d) {
                    // Show total value on mouseout
                    var totalValue = d3.sum(data, function (d) { return d.values; });
                    tooltip.selectAll("*").remove();
                    tooltip.append("tspan")
                        .attr("class", "tooltip-value")
                        .attr("text-anchor", "middle")
                        .attr("font-size", "16px")
                        .attr("fill", "#df0892")
                        .attr("font-weight", "bold")
                        .text("ALL BANKS");
                    tooltip.append("tspan")
                        .attr("class", "tooltip-value")
                        .attr("text-anchor", "middle")
                        .attr("font-size", "16px")
                        .attr("y", "18px")
                        .attr("x", "0")
                        .text(totalValue);
                    tooltip.append("tspan")
                        .attr("class", "tooltip-value")
                        .attr("text-anchor", "middle")
                        .attr("font-size", "16px")
                        .attr("y", "36px")
                        .attr("x", "0")
                        .text((totalValue * 100 / totalValue).toFixed(1) + "%");
                    d3.select(this).transition()
                        .duration(200)
                        .attr("d", arc.innerRadius(radius - 100).outerRadius(radius - 50));
                });

        }

        function updateBubbleChart() {

            var colorScale = d3.scale.category10();

            // Filter the data to get the sum of value for each region
            // var regionData = d3.nest()
            //     .key(function (d) { return d.Region; })
            //     .rollup(function (v) { return d3.sum(v, function (d) { return d.Value; }); })
            //     .entries(banksData);

            var regionData = d3.nest()
                .key(function (d) { return d["Region"]; })
                .rollup(function (v) {
                    if (clickedState === "All States" && selectedStates.length === 0) {
                        var filteredData = v.filter(function (d) {
                            quarterPopulation = d["Quarter : Population Group"]
                            var yearString = quarterPopulation.split(" ")[1];
                            return yearString === sliderYear;
                        });

                        return d3.sum(filteredData, function (d) { return d["Value"]; });
                    }
                    else {
                        var filteredData = v.filter(function (d) {
                            quarterPopulation = d["Quarter : Population Group"]
                            var yearString = quarterPopulation.split(" ")[1];
                            return (yearString === sliderYear) && selectedStates.includes(d["State"]);
                        });

                        return d3.sum(filteredData, function (d) { return d["Value"]; });
                    }
                })
                .entries(banksData);

            selectedRegions = [];
            for (var i = 0; i < regionData.length; i++) {
                if (regionData[i].values !== 0) {
                    selectedRegions.push(regionData[i].key);
                }
            }



            // Set the dimensions and margins of the chart
            var margin = { top: 20, right: 20, bottom: 30, left: 40 },
                width = 360 - margin.left - margin.right,
                height = 420 - margin.top - margin.bottom;

            // Remove any existing chart elements
            d3.select("#bubbleChart").selectAll("*").remove();

            // Create the SVG element
            var svg = d3.select("#bubbleChart")
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .style("background-color", "#172144")
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                svg.append("text")
                .attr("x", (width / 2) )
                .attr("y", 0 - (20 / 2) +30)
                .attr("text-anchor", "middle")
                .style("font-size", "18px")
                .attr("font-weight", "bold")
                .text("REGION-WISE BUBBLE CHART");
                // 150,30
                //  -30, -170

            // Create the simulation with collision detection
            var simulation = d3.layout.force()
                .nodes(regionData)
                .charge(-400)
                .gravity(0.1)
                .size([width, height])
                .on("tick", tick);

            // Define a linear scale for the bubble sizes
            var sizeScale = d3.scale.linear()
                .domain([0, d3.max(regionData, function (d) { return d.values; })])
                .range([15, 85]);

            // Create the bubbles
            var bubbles = svg.selectAll(".bubble")
                .data(regionData)
                .enter().append("circle")
                .attr("class", "bubble")
                .attr("r", function (d) { return sizeScale(d.values); })
                .style("fill", function (d) { return colorScale(d.key); })
                .call(simulation.drag);

            bubbles
                .append("title")
                .text(function (d) {
                    var val = d.values;
                    return "No. of Bank Offices : " + val;
                });

            bubbles.on("click", handleBubbleClick);

            function handleBubbleClick(d) {
                selectedStates = []; // initialize an empty array
                switch (d.key) {
                    case "Central Region":
                        selectedStates = ["Chhattisgarh", "Madhya Pradesh", "Uttarakhand", "Uttar Pradesh"];
                        break;
                    case "Eastern Region":
                        selectedStates = ["Andaman & Nicobar Islands", "Bihar", "Jharkhand", "Odisha", "Sikkim", "West Bengal"];
                        break;
                    case "North Eastern Region":
                        selectedStates = ["Arunachal Pradesh", "Assam", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Tripura"];
                        break;
                    case "Northern Region":
                        selectedStates = ["Chandigarh", "Haryana", "Himachal Pradesh", "Jammu & Kashmir", "Ladakh", "Nct of Delhi", "Punjab", "Rajasthan"];
                        break;
                    case "Southern Region":
                        selectedStates = ["Andhra Pradesh", "Karnataka", "Kerala", "Lakshadweep", "Puducherry", "Tamil Nadu", "Telangana"];
                        break;
                    case "Western Region":
                        selectedStates = ["Dadra And Nagar Haveli And Daman And Diu", "Goa", "Gujarat", "Maharashtra"];
                        break;
                    default:
                        break;
                }

                updateDashboard();
            }


            // Add labels to the bubbles
            var labels = svg.selectAll(".label")
                .data(regionData)
                .enter().append("text")
                .attr("class", "label")
                .attr("text-anchor", "middle")
                .text(function (d) { return d.key; });

            // Update the simulation on each tick
            function tick(e) {
                bubbles
                    .attr("cx", function (d) { return d.x; })
                    .attr("cy", function (d) { return d.y+15; });
                labels
                    .attr("x", function (d) { return d.x; })
                    .attr("y", function (d) { return d.y + 20; });
            }

            // Start the simulation
            simulation.start();
        }



        function updateDashboard() {
            selectedDate = new Date(slider.value());
            var quarterEnd = new Date(selectedDate.getFullYear(), Math.floor(selectedDate.getMonth() / 3) * 3 + 3, 0);
            // console.log("Quarter end" + quarterEnd);
            selectedDate = quarterEnd;
            // console.log("Selected Dae:" + selectedDate);

            var isoString = selectedDate.toISOString(); // convert to ISO string
            var year = isoString.substring(0, 4); // extract year
            var month = isoString.substring(5, 7); // extract month
            var selectedMonth = d3.time.format("%B")(new Date(year, month - 1)); // format month as full month word
            var selectedQuarter = `${selectedMonth} ${year}`; // combine month and year

            updateSlider(selectedDate);

            updateMap(selectedQuarter);

            sliderYear = isoString.substring(0, 4); // extract year

            updateBarChart(selectedStates, sliderYear);

            updateTreeMap();

            updateDonutChart();

            updateBubbleChart();

            var index = selectedStates.indexOf("Dadra And Nagar Haveli And Daman And Diu");
            if (index !== -1) {
                selectedStates.splice(index, 1);
            }

            updateDetailsBox();


        }

        updateSlider(selectedDate);

        updateDashboard();

    });



});