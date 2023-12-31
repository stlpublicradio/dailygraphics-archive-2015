// global vars
var $graphic = null;
var pymChild = null;

var BAR_HEIGHT = 25;
var BAR_GAP = 10;
var BAR_GAP_INNER = 2;
var GRAPHIC_DATA_URL = 'data.csv';
var GRAPHIC_DEFAULT_WIDTH = 600;
var LABEL_MARGIN = 6;
var LABEL_WIDTH = 85;
var MOBILE_THRESHOLD = 500;
var VALUE_MIN_WIDTH = 25;

var colors = {
    'brown': '#6b6256','tan': '#a5a585','ltgreen': '#70a99a','green': '#449970','dkgreen': '#31716e','ltblue': '#55b7d9','blue': '#358fb3','dkblue': '#006c8e','yellow': '#f1bb4f','orange': '#f6883e','tangerine': '#e8604d','red': '#cc203b','pink': '#c72068','maroon': '#8c1b52','purple': '#571751'
};
var color;
var graphicData;
var isMobile = false;

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');


/*
 * Initialize
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        d3.csv(GRAPHIC_DATA_URL, function(error, data) {
            graphicData = data;

            color = d3.scale.ordinal()
                .range([colors['yellow'], colors['blue'], colors['pink']])
                .domain(d3.keys(graphicData[0]).filter(function(key) { return key !== 'Group'; }));

            graphicData.forEach(function(d) {
                d['key'] = d['Group'];
                d['value'] = [];
                color.domain().map(function(name) {
                    d['value'].push({ 'label': name, 'amt': +d[name] });
                    delete d[name];
                });
                delete d['Group'];
            });

            pymChild = new pym.Child({
                renderCallback: render
            });
        });
    } else {
        pymChild = new pym.Child({ });
    }
}


/*
 * RENDER THE GRAPHIC
 */
var render = function(containerWidth) {
    // fallback if page is loaded outside of an iframe
    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }

    // check the container width; set mobile flag if applicable
    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // clear out existing graphics
    $graphic.empty();

    // draw the new graphic
    // (this is a separate function in case I want to be able to draw multiple charts later.)
    drawGraph(containerWidth);

    // update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


var drawGraph = function(graphicWidth) {
    var graph = d3.select('#graphic');
    var margin = {
        top: 0,
        right: 15,
        bottom: 20,
        left: (LABEL_WIDTH + LABEL_MARGIN)
    };
    var numGroups = graphicData.length;
    var numGroupBars = graphicData[0]['value'].length;
    var groupHeight = (BAR_HEIGHT * numGroupBars) + (BAR_GAP_INNER * (numGroupBars - 1));
    var ticksX = 7;

    // define chart dimensions
    var width = graphicWidth - margin['left'] - margin['right'];
    var height = (((((BAR_HEIGHT + BAR_GAP_INNER) * numGroupBars) - BAR_GAP_INNER) + BAR_GAP) * numGroups) - BAR_GAP + BAR_GAP_INNER;

    var x = d3.scale.linear()
        .domain([ 0, d3.max(graphicData, function(c) {
                return d3.max(c['value'], function(v) {
                    var n = v['amt'];
                    return Math.ceil(n/10) * 10; // round to next 10
                });
            })
        ])
        .range([0, width]);

    var y = d3.scale.linear()
        .range([ height, 0 ]);

    // define axis and grid
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return fmtComma(d);
        });

    var xAxisGrid = function() {
        return xAxis;
    }

    // draw the legend
    var legend = graph.append('ul')
        .attr('class', 'key')
        .selectAll('g')
            .data(graphicData[0]['value'])
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item key-' + i + ' ' + classify(d['label']);
            });
    legend.append('b')
        .style('background-color', function(d) {
        	return color(d['label']);
        });
    legend.append('label')
        .text(function(d) {
            return d['label'];
        });

    // draw the chart
    var chart = graph.append('div')
        .attr('class', 'chart');

    var svg = chart.append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

    // x-axis (bottom)
    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    // x-axis gridlines
    svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxisGrid()
            .tickSize(-height, 0, 0)
            .tickFormat('')
        );

    // draw the bars
    var barGroup = svg.selectAll('.bar-group')
        .data(graphicData)
        .enter().append('g')
            .attr('class', 'g')
            .attr('transform', function(d,i) {
                if (i == 0) {
                    return 'translate(0,0)';
                } else {
                    return 'translate(0,' + ((groupHeight + BAR_GAP) * i) + ')';
                }
            });

    barGroup.selectAll('rect')
        .data(function(d) { return d['value']; })
        .enter().append('rect')
            .attr('height', BAR_HEIGHT)
            .attr('x', function(d, i) {
                return 0;
            })
            .attr('y', function(d, i) {
                if (i == 0) {
                    return 0;
                } else {
                    return (BAR_HEIGHT * i) + (BAR_GAP_INNER * i);
                }
            })
            .attr('width', function(d) {
                return x(d['amt']);
            })
            .style('fill', function(d) {
            	return color(d['label']);
            })
            .attr('class', function(d) {
                return 'y-' + d['label'];
            });

    // show the values for each bar
    barGroup.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(function(d) { return d['value']; })
        .enter().append('text')
            .attr('x', function(d) {
                return x(d['amt']);
            })
            .attr('y', function(d, i) {
                if (i == 0) {
                    return 0;
                } else {
                    return (BAR_HEIGHT * i) + BAR_GAP_INNER;
                }
            })
            .attr('dx', function(d) {
                if (x(d['amt']) < VALUE_MIN_WIDTH) {
                    return 6;
                } else {
                    return -6;
                }
            })
            .attr('dy', (BAR_HEIGHT / 2) + 4)
            .attr('text-anchor', function(d) {
                if (x(d['amt']) < VALUE_MIN_WIDTH) {
                    return 'begin';
                } else {
                    return 'end';
                }
            })
            .attr('class', function(d) {
                var c = classify(d['label']);
                if (x(d['amt']) < VALUE_MIN_WIDTH) {
                    c += ' outer';
                } else {
                    c += ' inner';
                }
                return c;
            })
            .text(function(d) {
            	return fmtComma(d['amt']);
            });

    // draw labels for each bar
    var labels = chart.append('ul')
        .attr('class', 'labels')
        .attr('style', 'width: ' + LABEL_WIDTH + 'px; top: 4px; left: 0;')
        .selectAll('li')
            .data(graphicData)
        .enter().append('li')
            .attr('style', function(d,i) {
                var s = '';
                s += 'width: ' + (margin['left'] - 10) + 'px; ';
                s += 'height: ' + BAR_HEIGHT + 'px; ';
                s += 'left: ' + 0 + 'px; ';

                if (i == 0) {
                    s += 'top: 0px; ';
                } else {
                    s += 'top: ' + ((groupHeight + BAR_GAP) * i) + 'px; ';
                }
                return s;
            })
            .attr('class', function(d,i) {
                return classify(d['key']);
            })
            .append('span')
                .text(function(d) {
                    return d['key']
                });
}


/*
 * HELPER FUNCTIONS
 */
var classify = function(str) { // clean up strings to use as CSS classes
    return str.replace(/\s+/g, '-').toLowerCase();
}


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);