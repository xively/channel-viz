(function ( $ ){

	/*
	EXAMPLE CONFIGURATION

		var defaultKey	= 'fje329iun52ngtuijo2f4jeun432A', // Unique master Xively API key to be used as a default
		defaultFeeds	= [61916,12425,94322], // Comma separated array of Xively Feed ID numbers
		applicationName	= 'My Company\'s Application', // Replaces Xively logo in the header
		dataDuration	= '90days', // Default duration of data to be displayed // ref: https://xively.com/dev/docs/api/data/read/historical_data/
		dataInterval	= 10800, // Default interval for data to be displayed (in seconds)
		dataColor		= '0A1922', // CSS HEX value of color to represent data (omit leading #)
		hideForm		= 0;
	*/

	var defaultKey		= '', // Unique master Xively API key to be used as a default
		defaultFeeds	= [], // Comma separated array of Xively Feed ID numbers
		applicationName	= '', // Replaces Xively logo in the header
		dataDuration	= '', // Default duration of data to be displayed // ref: https://xively.com/dev/docs/api/data/read/historical_data/
		dataInterval	= 0, // Default interval for data to be displayed (in seconds)
		dataColor		= '', // CSS HEX value of color to represent data (omit leading #)
		hideForm		= 0; // To hide input form use value of 1, otherwise set to 0

// Function Declarations

	// URL Parameters
	function getParam(key) {
	 	var value = location.hash.match(new RegExp(key+'=([^&]*)'));
		if(value) {
			return value[1];
		} else {
			return "";
		}
	}

	// Graph Annotations
	function addAnnotation(force) {
		if (messages.length > 0 && (force || Math.random() >= 0.95)) {
			annotator.add(seriesData[2][seriesData[2].length-1].x, messages.shift());
		}
	}

	// Add One (1) Day to Date Object
	Date.prototype.addDays = function (d) {
		if (d) {
			var t = this.getTime();
			t = t + (d * 86400000);
			this.setTime(t);
		}
	};

	// Subtract One (1) Day to Date Object
	Date.prototype.subtractDays = function (d) {
		if (d) {
			var t = this.getTime();
			t = t - (d * 86400000);
			this.setTime(t);
		}
	};

	// Parse Xively ISO Date Format to Date Object
	Date.prototype.parseISO = function(iso){
		var stamp= Date.parse(iso);
		if(!stamp) throw iso +' Unknown date format';
		return new Date(stamp);
	}

	// Set xively API Key
	function setApiKey(key) {
		xively.setKey(key);
	}

	function updateFeeds(feedId, datastreamIds, duration, interval) {
		xively.feed.get(feedId, function(feedData) {
			if(feedData.datastreams) {
				if(datastreamIds == '' || !datastreamIds) {
					feedData.datastreams.forEach(function(datastream) {
						datastreamIds += datastream.id + " ";
					});
				}
				feedData.datastreams.forEach(function(datastream) {
					var now = new Date();
					var then = new Date();
					var updated = new Date;
					updated = updated.parseISO(datastream.at);
					var diff = null;
					if(duration == '6hours') diff = 21600000;
					 if(duration == '1day') diff = 86400000;
					 if(duration == '1week') diff = 604800000;
					 if(duration == '1month') diff = 2628000000;
					 if(duration == '90days') diff = 7884000000;
					then.setTime(now.getTime() - diff);
					if(updated.getTime() > then.getTime()) {
						if(datastreamIds && datastreamIds != '' && datastreamIds.indexOf(datastream.id) >= 0) {
							xively.datastream.history(feedId, datastream.id, {duration: duration, interval: interval, limit: 1000}, function(datastreamData) {

								var series = [];
								var points = [];

								// Create Datastream UI
								$('.datastream-' + datastream.id).empty();
								$('.datastream-' + datastream.id).remove();
								$('#feed-' + feedId + ' .datastream.hidden').clone().appendTo('#feed-' + feedId + ' .datastreams').addClass('datastream-' + datastream.id).removeClass('hidden');

								// Check for Datastream Tags
								var tagsHtml = '';
								if(datastreamData.tags) {
									tagsHtml = '<div style="font-size: 14px;"><span class="radius secondary label">' + datastreamData.tags.join('</span> <span class="radius secondary label">') + '</span></div>';
								} else {
									tagsHtml = '';
								}

								// Fill Datastream UI with Data
								$('#feed-' + feedId + ' .datastreams .datastream-' + datastream.id + ' .datastream-name').html(datastream.id);
								$('#feed-' + feedId + ' .datastreams .datastream-' + datastream.id + ' .datastream-value').html(datastream.current_value);

								// Include Datastream Unit (If Available)
								if(datastream.unit) {
									if(datastream.unit.symbol) {
										$('#feed-' + feedId + ' .datastreams .datastream-' + datastream.id + ' .datastream-value').html(datastream.current_value + datastream.unit.symbol);
									} else {
										$('#feed-' + feedId + ' .datastreams .datastream-' + datastream.id + ' .datastream-value').html(datastream.current_value);
									}
								} else {
									$('#feed-' + feedId + ' .datastreams .datastream-' + datastream.id + ' .datastream-value').html(datastream.current_value);
								}
								$('.datastream-' + datastream.id).removeClass('hidden');

								// Historical Datapoints
								if(datastreamData.datapoints) {

									// Add Each Datapoint to Array
									datastreamData.datapoints.forEach(function(datapoint) {
										points.push({x: new Date(datapoint.at).getTime()/1000.0, y: parseFloat(datapoint.value)});
									});

									// Add Datapoints Array to Graph Series Array
									series.push({
										name: datastream.id,
										data: points,
										color: '#' + dataColor
									});

									// Initialize Graph DOM Element
									$('#feed-' + feedId + ' .datastreams .datastream-' + datastream.id + ' .graph').attr('id', 'graph-' + feedId + '-' + datastream.id);

						 			// Build Graph
									var graph = new Rickshaw.Graph( {
										element: document.querySelector('#graph-' + feedId + '-' + datastream.id),
										width: 600,
										height: 200,
										renderer: 'line',
										min: parseFloat(datastream.min_value) - .25*(parseFloat(datastream.max_value) - parseFloat(datastream.min_value)),
										max: parseFloat(datastream.max_value) + .25*(parseFloat(datastream.max_value) - parseFloat(datastream.min_value)),
										padding: {
											top: 0.02,
											right: 0.02,
											bottom: 0.02,
											left: 0.02
										},
										series: series
									});

									graph.render();

									var ticksTreatment = 'glow';

									// Define and Render X Axis (Time Values)
									var xAxis = new Rickshaw.Graph.Axis.Time( {
										graph: graph,
										ticksTreatment: ticksTreatment
									});
									xAxis.render();

									// Define and Render Y Axis (Datastream Values)
									var yAxis = new Rickshaw.Graph.Axis.Y( {
										graph: graph,
										tickFormat: Rickshaw.Fixtures.Number.formatKMBT,
										ticksTreatment: ticksTreatment
									});
									yAxis.render();

									// Enable Datapoint Hover Values
									var hoverDetail = new Rickshaw.Graph.HoverDetail({
										graph: graph,
										formatter: function(series, x, y) {
											var swatch = '<span class="detail_swatch" style="background-color: ' + series.color + ' padding: 4px;"></span>';
											var content = swatch + "&nbsp;&nbsp;" + parseFloat(y) + '&nbsp;&nbsp;<br>';
											return content;
										}
									});

									$('#feed-' + feedId + ' .datastreams .datastream-' + datastream.id + ' .slider').prop('id', 'slider-' + feedId + '-' + datastream.id);
									var slider = new Rickshaw.Graph.RangeSlider({
	            	   					graph: graph,
	        	       					element: $('#slider-' + feedId + '-' + datastream.id)
	               					});
								} else {
									$('#feed-' + feedId + ' .datastreams .datastream-' + datastream.id + ' .graphWrapper').addClass('hidden');
								}
							});
						} else {
							console.log('Datastream not requested! (' + datastream.id + ')');
						}
					} else {
						$('#feed-' + feedId + ' .datastreams .datastream-' + datastream.id + ' .graphWrapper').html('<div class="alert alert-box no-info">Sorry, this datastream does not have any associated data.</div>');
					}
				});
			}
			$('#loadingData').foundation('reveal', 'close');
		});
	}

	function setFeeds(feeds) {
		$('#welcome').addClass('hidden');
		feeds.forEach(function(id) {

			var thisFeedId, thisFeedDatastreams;
			if(id.indexOf('!') > 0) {
				thisFeedId = id.substring(0, id.indexOf('!'));
				thisFeedDatastreams = id.substring(id.indexOf('!')+1).split('!');
			} else {
				thisFeedId = id;
			}
			id = thisFeedId;

			if($('#feed-' + id)) {
				$('#feed-' + id).remove();
			}
			xively.feed.history(id, {  duration: "6hours", interval: 30 }, function (data) {
				if(data.id == id) {
					// Duplicate Example to Build Feed UI
					$('#exampleFeed').clone().appendTo('#feeds').attr('id', 'feed-' + id).removeClass('hidden');

					// ID
					$('#feed-' + data.id + ' .title .value').html(data.title);

					// Title
					$('#feed-' + data.id + ' .id .value').html(data.id);

					// Description
					if(data.description) {
						$('#feed-' + data.id + ' .description .value').html(data.description);
					} else {
						$('#feed-' + data.id + ' .description').addClass('hidden');
					}

					// Link
					$('#feed-' + data.id + ' .link .value').html('<a href="https://xively.com/feeds/' + data.id + '/">View on Xively &raquo;</a>');

					// Creator
					var creator = /[^/]*$/.exec(data.creator)[0];
					$('#feed-' + data.id + ' .creator .value').html('<a href="' + data.creator + '">' + creator + '</a>');

					// Date Updated
					$('#feed-' + data.id + ' .updated .value').html(data.updated);

					// Tags
					if(data.tags) {
						$('#feed-' + data.id + ' .tags .value').html('<span class="radius secondary label">' + data.tags.join('</span> <span class="radius secondary label">') + '</span>');
					} else {
						$('#feed-' + data.id + ' .tags').addClass('hidden');
					}

					// Location
					if(data.location) {
						if(data.location.name || data.location.lat || data.location.ele || data.location.disposition) {

							// Location Name
							if(data.location.name) {
								$('#feed-' + data.id + ' .location-name .value').html(data.location.name);
							} else {
								$('#feed-' + data.id + ' .location-name').addClass('hidden');
							}

							// Location Coordinates
							if(data.location.lat && data.location.lon) {
								$('#feed-' + data.id + ' .latitude .value').html(data.location.lat);
								$('#feed-' + data.id + ' .longitude .value').html(data.location.lon);
							} else {
								$('#feed-' + data.id + ' .latitude').addClass('hidden');
								$('#feed-' + data.id + ' .longitude').addClass('hidden');
							}

							// Location Elevation
							if(data.location.ele) {
								$('#feed-' + data.id + ' .elevation .value').html(data.location.ele);
							} else {
								$('#feed-' + data.id + ' .elevation').addClass('hidden');
							}

							// Location Disposition
							if(data.location.disposition) {
								$('#feed-' + data.id + ' .disposition .value').html(data.location.disposition);
							} else {
								$('#feed-' + data.id + ' .disposition').addClass('hidden');
							}

							// Location Map
							if(data.location.lat && data.location.lon) {
								$('#feed-' + data.id + ' .map .value').html('<a href="http://maps.google.com/maps?z=14&t=m&q=loc:' + data.location.lat + '+' + data.location.lon + '">View on Google Maps &raquo;</a>');
							} else {
								$('#feed-' + data.id + ' .map').addClass('hidden');
							}
						} else {
							// Location Information Unavailable
							$('#feed-' + data.id + ' .no-location').removeClass('hidden');
								$('#feed-' + data.id + ' .location-name').addClass('hidden');
								$('#feed-' + data.id + ' .latitude').addClass('hidden');
								$('#feed-' + data.id + ' .longitude').addClass('hidden');
								$('#feed-' + data.id + ' .elevation').addClass('hidden');
								$('#feed-' + data.id + ' .disposition').addClass('hidden');
								$('#feed-' + data.id + ' .map').addClass('hidden');
						}
					} else {
						// Location Information Unavailable
						$('#feed-' + data.id + ' .no-location').removeClass('hidden');
							$('#feed-' + data.id + ' .location-name').addClass('hidden');
							$('#feed-' + data.id + ' .latitude').addClass('hidden');
							$('#feed-' + data.id + ' .longitude').addClass('hidden');
							$('#feed-' + data.id + ' .elevation').addClass('hidden');
							$('#feed-' + data.id + ' .disposition').addClass('hidden');
							$('#feed-' + data.id + ' .map').addClass('hidden');
					}

					$('#feed-' + data.id + ' .duration-hour').click(function() {
						$('#loadingData').foundation('reveal', 'open');
						updateFeeds(data.id, thisFeedDatastreams, '6hours', 30);
						return false;
					});

					$('#feed-' + data.id + ' .duration-day').click(function() {
						$('#loadingData').foundation('reveal', 'open');
						updateFeeds(data.id, thisFeedDatastreams, '1day', 60);
						return false;
					});

					$('#feed-' + data.id + ' .duration-week').click(function() {
						$('#loadingData').foundation('reveal', 'open');
						updateFeeds(data.id, thisFeedDatastreams, '1week', 900);
						return false;
					});

					$('#feed-' + data.id + ' .duration-month').click(function() {
						$('#loadingData').foundation('reveal', 'open');
						updateFeeds(data.id, thisFeedDatastreams, '1month', 1800);
						return false;
					});

					$('#feed-' + data.id + ' .duration-90').click(function() {
						$('#loadingData').foundation('reveal', 'open');
						updateFeeds(data.id, thisFeedDatastreams, '90days', 10800);
						return false;
					});

					// Handle Datastreams
					if(dataDuration != '' && dataInterval != 0) {
						updateFeeds(data.id, thisFeedDatastreams, dataDuration, dataInterval);
					} else {
						updateFeeds(data.id, thisFeedDatastreams, '6hours', 30);
					}
				} else {
					// Duplicate Example to Build Feed UI
					$('#exampleFeedNotFound').clone().appendTo('#feeds').attr('id', 'feed-' + id).removeClass('hidden');
					$('#feed-' + id + ' h2').html(id);
				}
			});
		});
	}
// END Function Declarations

// BEGIN Initialization
	if(hideForm == 1) {
		$('#form').hide();
	}

	var today = new Date();
	var yesterday = new Date(today.getTime()-1000*60*60*24*1);
	var lastWeek = new Date(today.getTime()-1000*60*60*24*7);

	var key = getParam('key');
	var feedString = getParam('feeds');

	// Check for Default Values
	if(key == '' && defaultKey != '') {
		key = defaultKey;
	}

	if(feedString == '' && defaultFeeds.toString(',') != '') {
		feedString = defaultFeeds.toString(',');
	}

	if(applicationName != '') {
		$('h1').html(applicationName).css('color', 'white');
		document.title = applicationName + ' - Powered by Xively';
	}

	if(dataColor == '') {
		dataColor = '0A1922';
	}

	var feeds = feedString.split(',');

	$('#apiKeyInput').val(key);
	$('#feedsInput').val(feedString);

	$("#apiKeyInput").mouseover(function() {
		console.log($("#apiKeyInput").prop('disabled'));
		if($("#apiKeyInput").prop('disabled')) {
			$("#apiKeyInput").prop('disabled', false);
		}
	});

	if(key != '' && feedString != '') {
		setApiKey($('#apiKeyInput').val());
		feeds = $('#feedsInput').val().replace(/\s+/g, '').split(',');
		setFeeds(feeds);
	}

	if(key != '') {
		$("#apiKeyInput").prop('disabled', true);
	}

	$('#apiKeyInput').change(function() {
		if($('#apiKeyInput').val() == '') {
			$('#welcome').addClass('hidden');
			$('#invalidApiKey').removeClass('hidden');
			$('#validApiKey').addClass('hidden');
		} else {
			xively.setKey($('#apiKeyInput').val());
			xively.feed.get(61916, function(data) {
				if(data.id == 61916) {
					$("#apiKeyInput").prop('disabled', true);
					$('#welcome').addClass('hidden');
					$('#validApiKey').removeClass('hidden');
					$('#invalidApiKey').addClass('hidden');
				} else {
					$('#welcome').addClass('hidden');
					$('#validApiKey').addClass('hidden');
					$('#invalidApiKey').removeClass('hidden');
				}
			});
		}
		return false;
	});

	$('#setFeeds').click(function() {
		setApiKey($('#apiKeyInput').val());
		feeds = $('#feedsInput').val().replace(/\s+/g, '').split(',');
		window.location = './index.html#key=' + $('#apiKeyInput').val() + '&feeds=' + $('#feedsInput').val();
		return false;
	});
// END Initialization

})( jQuery );
