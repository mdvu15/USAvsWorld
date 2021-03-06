var width = window.innerWidth,
    height = window.innerHeight,
    active = d3.select(null);

var projection = d3.geoAlbersUsa() // updated for d3 v4
    .scale(1000)
    .translate([width / 2, height / 2]);

var zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", zoomed);

var path = d3.geoPath()
    .projection(projection);

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)
    .on("click", stopped, true);

var g1 = svg.append("g");

svg.call(zoom); // delete this line to disable free zooming
    // .call(zoom.event); // not in d3 v4

d3.json("usTopo.json", function(error, us) {
    
    if (error) throw error;

    var data = topojson.feature(us, us.objects.states).features;

    var config = {"color1":"#d3e5ff","color2":"#08306B","stateDataColumn":"state_or_territory","valueDataColumn":"population_estimate_for_july_1_2013_number"}
    // var WIDTH = 800, HEIGHT = 500;
    var COLOR_COUNTS = 9;
    // var SCALE = 0.7;
    function Interpolate(start, end, steps, count) {
        var s = start,
            e = end,
            final = s + (((e - s) / steps) * count);
        return Math.floor(final);
    }
    
    function Color(_r, _g, _b) {
        var r, g, b;
        var setColors = function(_r, _g, _b) {
            r = _r;
            g = _g;
            b = _b;
        };
    
        setColors(_r, _g, _b);
        this.getColors = function() {
            var colors = {
                r: r,
                g: g,
                b: b
            };
            return colors;
        };
    }
    
    function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    function valueFormat(d) {
      if (d > 1000) {
        return Math.round(d / 1000 * 10) / 10 + "K";
      } else {
        return d;
      }
    }
    
    var COLOR_FIRST = config.color1, COLOR_LAST = config.color2;
    
    var rgb = hexToRgb(COLOR_FIRST);
    
    var COLOR_START = new Color(rgb.r, rgb.g, rgb.b);
    
    rgb = hexToRgb(COLOR_LAST);
    var COLOR_END = new Color(rgb.r, rgb.g, rgb.b);
    
    // var valueById = d3.map();

    var startColors = COLOR_START.getColors(),
        endColors = COLOR_END.getColors();
    
    var colors = [];
    
    for (var i = 0; i < COLOR_COUNTS; i++) {
      var r = Interpolate(startColors.r, endColors.r, COLOR_COUNTS, i);
      var g = Interpolate(startColors.g, endColors.g, COLOR_COUNTS, i);
      var b = Interpolate(startColors.b, endColors.b, COLOR_COUNTS, i);
      colors.push(new Color(r, g, b));
    }
    
    var quantize = d3.scaleQuantize()
        .domain([0, 1.0])
        .range(d3.range(COLOR_COUNTS).map(function(i) { return i }));

    d3.tsv("stateNames.tsv", function(tsv){ // Added to label states
        names = {};
        gdp = {}
        tsv.forEach(function(d){
            names[d.id] = d.name;
            gdp[d.id] = d.gdp;
        });

    quantize.domain([d3.min(tsv, function(d){ return gdp[d.id] }),
        d3.max(tsv, function(d){ return gdp[d.id] })]);

    g1.selectAll("path")
        .data(data)
        .enter().append("path")
        .attr("class", "feature")
        .on("click", clicked)
        .style("fill", function(d) {
            var i = quantize(gdp[d.id]);
            var color = colors[i].getColors();
            return "rgb(" + color.r + "," + color.g +
                "," + color.b + ")";
        })      
        .attr("d", path)
        .on("mousemove", label)
        .on("mouseout", function() {
                $(this).attr("fill-opacity", "1.0");
                $("#tooltip-container").hide();
            });

    g1.append("path")
        .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
        .attr("class", "mesh")
        .attr("d", path);
    
    });
});


/*
==============================================================
== HELPER FUNCTIONS
==============================================================
*/

function label(d) {
    var html = "";

    html += "<div class=\"tooltip_kv\">";
    html += "<span class=\"tooltip_key\">";
    html += names[d.id];
    html += "</span>";
    html += "</div>";
    
    $("#tooltip-container").html(html);
    $(this).attr("fill-opacity", "0.8");
    $("#tooltip-container").show();
    
    var coordinates = d3.mouse(this);
    
    var map_width = $('.feature')[0].getBoundingClientRect().width;
    
    if (d3.event.layerX < map_width / 2) {
      d3.select("#tooltip-container")
        .style("top", (d3.event.layerY + 15) + "px")
        .style("left", (d3.event.layerX + 15) + "px");
    } else {
      var tooltip_width = $("#tooltip-container").width();
      d3.select("#tooltip-container")
        .style("top", (d3.event.layerY + 15) + "px")
        .style("left", (d3.event.layerX - tooltip_width - 30) + "px");
    }
}

function clicked(d) {

  if (active.node() === this) return reset();
  active.classed("active", false);
  active = d3.select(this).classed("active", true);

  // $('.feature.active').css("fill-opacity", "0.8")

    // Here we add more details inside the div
    var htmlDetails = "";
    htmlDetails += "<div>Detail of " ;
    htmlDetails += names[d.id];
    htmlDetails += "</div>";
    $("#details").html(htmlDetails);
    $("#details").show();

  var bounds = path.bounds(d),
      dx = bounds[1][0] - bounds[0][0],
      dy = bounds[1][1] - bounds[0][1],
      x = (bounds[0][0] + bounds[1][0]) / 2,
      y = (bounds[0][1] + bounds[1][1]) / 2,
      scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height))),
      translate = [width / 2 - scale * x, height / 2 - scale * y];

    svg.transition()
      .duration(750)
      .call( zoom.transform, d3.zoomIdentity.translate(translate[0],translate[1]).scale(scale) ); // updated for d3 v4

    
}

function reset() {
  active.classed("active", false);
  active = d3.select(null);

  $("#details").hide();
  // $(".feature").css("fill-opacity","1");

  svg.transition()
      .duration(750)
      .call( zoom.transform, d3.zoomIdentity ); // updated for d3 v4
}

function zoomed() {
  g1.style("stroke-width", 1.5 / d3.event.transform.k + "px");
  g1.attr("transform", d3.event.transform); // updated for d3 v4
}

function stopped() {
  if (d3.event.defaultPrevented) d3.event.stopPropagation();
}