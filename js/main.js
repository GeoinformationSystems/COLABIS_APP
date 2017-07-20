//Global Vars

var map = false,
	SelectedFeatures;

//Basic JS Things

function ConvertIntToShortDaystring(d){
	d = parseInt(d);
	switch(d) {
		case 0: return 'so';
		case 1: return 'mo';
		case 2: return 'di';
		case 3: return 'mi';
		case 4: return 'do';
		case 5: return 'fr';
		case 6: return 'sa';
	}	
}

function PrintCleaningDays(obj){
	var array = [];
	var string = "";
	if(obj.f_mo == 'T') array.push('Monday');
	if(obj.f_di == 'T') array.push('Tuesday');
	if(obj.f_mi == 'T') array.push('Wednesday');
	if(obj.f_do == 'T') array.push('Thursday');
	if(obj.f_fr == 'T') array.push('Friday');
	if(obj.f_sa == 'T') array.push('Saturday');
	if(obj.f_so == 'T') array.push('Sunday');
	
	for(var i = 0; i<array.length;i++){
		if(string.length > 0 ) string += ', ';
		string += array[i];
	}
	
	return string;
}

function PrintLastCleaningDay(obj){
	var day = GetWeekDayFromTimelines(); // 1 2 3 4 5 6 0 1 2 
	var i,checkday;
	for(i=0;i<7;i++){
		checkday=day-i;
		if(checkday < 0){
			checkday = 7 + checkday; //last week
		}
		if(obj['f_'+ConvertIntToShortDaystring(checkday)] == 'T'){
			break;
		}
	}
	
	switch(i) {
		case 0:
			return 'Today';
			break;
		case 1:
			return 'Yesterday';
			break;
		default:
			return i + ' Days';
	}
}

function DeleteSelectedFeatures(){
	SelectedFeatures.getSource().updateParams({
		FEATUREID: false
	});
	angular.element(document.getElementById('angularjsappframe')).scope().resetselect();
}

function OpenLayersInit(){
	//Projection and needed Vars for wmts geoportal
	var myProjectionName = 'EPSG:25833';
	proj4.defs(myProjectionName, "+proj=utm +zone=33 +ellps=WGS84 +datum=WGS84 +units=m +no_defs");
	projection = ol.proj.get(myProjectionName);
	var extend = ol.proj.transformExtent([12.0000, 35.5000, 21.0000, 80.0500], 'EPSG:4326',projection);
	projection.setExtent(extend);
	var projectionExtent = projection.getExtent();
	var size = ol.extent.getWidth(projectionExtent) / 256;
	var resolutions = new Array(16);
	var matrixIds = new Array(16);
	var prevzero;
	for (var z = 0; z < 16; ++z) {
		resolutions[z] = size / Math.pow(2, z-0.61692);
		prevzero = z;
		if(prevzero < 10) prevzero = '0' + prevzero;
		matrixIds[z] = prevzero;
	}
	
	//DWD Kreise
	var geojsonFormat = new ol.format.GeoJSON();
	
	dwd_vectorSource = new ol.source.Vector({
		loader: function(extent, resolution, projection) {
			console.log(projection);
			var url = "https://geoserver.colabis.de/geoserver/ckan/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ckan:_53fbae20_e2fb_4fd1_b5d6_c798e11b96d1&cql_filter=state ='SN'&outputFormat=text/javascript&format_options=callback:loadFeatures";
			$.ajax({url: url, dataType: 'jsonp', jsonp: false});
		},
		projection: projection,
		format: new ol.format.GeoJSON()
	});

	var dwdkreise = new ol.layer.Vector({
		opacity: 0.8,
		title: 'DWD Wetterwarnungen',
	  	source: dwd_vectorSource,
		style: new ol.style.Style({
			stroke: new ol.style.Stroke({
				color: 'black',
				width: 3
			}),
			fill: new ol.style.Fill({
				color: 'rgba(0, 0, 0, 0)'
			})
        })
	});	
	
	
	loadFeatures = function(response) {
		if(response){
			dwd_vectorSource.addFeatures(geojsonFormat.readFeatures(response),{
				featureProjection: 'EPSG:4326',
				dataProjection: projection,
			});
		}
		$.ajax({
			url: "https://geoserver.colabis.de/geoserver/ckan/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ckan:_2518529a_fbf1_4940_8270_a1d4d0fa8c4d&outputFormat=text/javascript&CQL_FILTER=\"observations.EFFECTIVE\" > '"+ ReturnDateString() + "' and \"observations.EXPIRES\" < '"+ ReturnDateString(1) + "' and \"observations.GC_STATE\" = 'SN'&format_options=callback:HandleDwDWeatherWarningsToday",
			dataType: 'jsonp'
		});
	};
	
	
	HandleDwDWeatherWarningsToday = function(response){	
		var result = {};
	  	$.each(response.features, function (k, v) {
			var index = v.properties["geometry.WARNCELLID"];
	  		if(result[index] == undefined){
	      		result[index] = [];
	      	}
      
	      	result[index].push({
	      		name: v.properties["geometry.NAME"],
	          	group: v.properties["observations.EC_GROUP"],
	          	event: v.properties["observations.EVENT"],
	          	color: v.properties["observations.EC_AREA_COLOR"],
	          	desc: v.properties["observations.DESCRIPTION"],
	          	level: v.properties["observations.SEVERITY"],
          
	      	});
            
	     	if(k+1 == response.totalFeatures){
	      	//finish
	        RecolorDWDFeatures(result);
	      }
		});
	}

	RecolorDWDFeatures = function(dwd_data){
		if(dwd_data){
			console.log(dwd_data);
			dwd_vectorSource.forEachFeature(function(feature){
				var index = feature["values_"]["ags_2015"];
				if(dwd_data[index]){
					console.log('found: ' + index);
					var max = 0, current = 0, color="";
					for(var i=0; i < dwd_data[index].length; i++){
						var row = dwd_data[index][i];
						
						if(row.level.localeCompare("Moderate") == 0) current = 2;
						if(row.level.localeCompare("Minor") == 0) current = 1;

						if(current > max){
							max = current;
							color= row.color;
						}
					}
					
					color = color.split(" ");
					
					feature.setStyle(
						new ol.style.Style({
							stroke: new ol.style.Stroke({
								color: 'black',
								width: 3
							}),
							fill: new ol.style.Fill({
								color: 'rgba('+color[0]+', '+color[1]+', '+color[2]+', 0.3)'
							})
						})
					);
				} else {
					console.log('skiped: ' + index);
				}
			});
		}
	}
	

	//OSM
	var osm = new ol.layer.Tile({
		title: 'OSM',
		type: 'base',
		source: new ol.source.OSM()
    });
	
	//Orthophoto WMTS
	var wmts =  new ol.layer.Tile({
		title: 'Orthophoto',
		type: 'base',
		source: new ol.source.WMTS({
			url: 'https://geodienste.sachsen.de/wmts_geosn_dop-rgb/guest?',
			layer: 'sn_dop_020',
			matrixSet: 'grid_25833',
			format: 'image/png',
			projection: projection,
			tileGrid: new ol.tilegrid.WMTS({
				origin: ol.proj.transform([11.585055, 51.6967091], 'EPSG:4326', projection),
				resolutions: resolutions,
				matrixIds: matrixIds
			}),
			style: 'default',
			wrapX: true
		})
	});	

	//Orthophoto Hybrit WMTS
	var wmts_hybrit =  new ol.layer.Tile({
		title: 'Orthophoto hybrid',
		type: 'base',
		visible: false,
		source: new ol.source.WMTS({
			url: 'https://geodienste.sachsen.de/wmts_geosn_dop-strassen/guest?',
			layer: 'dop_strassen_hybrid',
			matrixSet: 'grid_25833',
			format: 'image/png',
			projection: projection,
			tileGrid: new ol.tilegrid.WMTS({
				origin: ol.proj.transform([11.585055, 51.6967091], 'EPSG:4326', projection),
				resolutions: resolutions,
				matrixIds: matrixIds
			}),
			style: 'default',
			wrapX: true
		})
	});		
	
	//Straßen WMS
	var road_network = new ol.layer.Image({
		visible: false,
		title: 'Road network',
		source: new ol.source.ImageWMS({
			url: 'http://www.list.smwa.sachsen.de/inspire/ows?SERVICE=WMS',
			projection: projection,
			params: {
				'LAYERS': 'Bundesautobahnen,Bundesstrassen,Europastrassen,Kreisstrassen,Staatsstrassen,Strassenplaene',
				'VERSION': '1.3',
				'FORMAT': 'image/png',	//background transparency !!
				'TILED': true
			},
			serverType: 'mapserver'
		})
	});
	
	//Pollution Rasters
	var pollution_raster = new ol.layer.Tile({
		visible: false,
		title: 'Pollution per day',
		source: new ol.source.TileWMS({
			url: 'http://geoserver.colabis.de:80/geoserver/ckan/wms',
			params: {
				FORMAT:	'image/png', 
				VERSION:'1.1.1',
				STYLES:	'',
				LAYERS:	'ckan:_8e2bef33_248f_42b5_bd50_0f474a54d11f',
				time: ReturnDateString()
			}
		})
	});
	
	//weekly frequency layer
	var weekly_frequency = new ol.layer.Tile({
      	visible: false,
		title: 'Cleaning frequency',
      	source: new ol.source.TileWMS({
        	url: 'http://geoserver.colabis.de/geoserver/ckan/wms',
    		params: {
				FORMAT: 'image/png', 
            	VERSION: '1.1.1',
           	 	tiled: true,
          		STYLES: 'rollfields_vector_frequency_colored_sld',
          		LAYERS: 'ckan:_d6bea91f_ac86_4990_a2d5_c603de92e22c',
    		}
      	})
	});	
	
	//Cleaned Today Features
	var cleaned_rollfields = new ol.layer.Tile({
      	visible: true,
		title: 'Cleaning current day',
      	source: new ol.source.TileWMS({
        	url: 'http://geoserver.colabis.de/geoserver/ckan/wms',
    		params: {
				FORMAT: 'image/png', 
            	VERSION: '1.1.1',
           	 	tiled: true,
          		STYLES: 'rollfields_vector_unfiltered_sld',
          		LAYERS: 'ckan:_d6bea91f_ac86_4990_a2d5_c603de92e22c',
  		  		CQL_FILTER: "f_" + ConvertIntToShortDaystring(GetWeekDayFromTimelines()) + " = 'T'",
    		}
      	})
	});
	
	//GEOCURE
	var geocure_testlayer = new ol.layer.Image({
		visible: false,
		opacity: 0.8,
		title: 'Geocure testlayer',
		source: new ol.source.ImageWMS({
			url: 'http://colabis.dev.52north.org/geocure/services/colabis-geoserver/maps/render',
			projection: new ol.proj.Projection({ //correcting axis
				code: 'EPSG:4326',
				axisOrientation: 'enu' //maybe only axis
			}),
			params: {
				layer: 'ckan:_d6bea91f_ac86_4990_a2d5_c603de92e22c',
			}
		})
	});

	//Selected
	SelectedFeatures = new ol.layer.Tile({
      	visible: true,
      	source: new ol.source.TileWMS({
        	url: 'http://geoserver.colabis.de/geoserver/ckan/wms',
    		params: {
				FORMAT: 'image/png', 
            	VERSION: '1.1.1',
           	 	tiled: true,
				STYLES: 'rollfields_vector_selected',
          		LAYERS: 'ckan:_d6bea91f_ac86_4990_a2d5_c603de92e22c',
				FEATUREID: false
    		}
      	})
	});

	//Define Groups
	var BaseLayers = new ol.layer.Group({
        title : 'Base maps',
		layers: [osm, wmts, wmts_hybrit]
	});
	
	var OverlayLayers = new ol.layer.Group({
        title: 'Overlays (Vector)',
		layers: [road_network, dwdkreise, cleaned_rollfields, weekly_frequency, geocure_testlayer]
	});
	
	var RasterLayers = new ol.layer.Group({
		title: 'Overlays (Raster)',
		layers: [pollution_raster]
	});
	
	var HiddenLayers = new ol.layer.Group({
		layers: [SelectedFeatures]
	});

	map = new ol.Map({
		target: 'map',
		layers: [BaseLayers, RasterLayers, OverlayLayers, HiddenLayers],
		view: new ol.View({
			center: ol.proj.transform([13.741,51.052], 'EPSG:4326', projection),	// Center Dresden
			projection: projection,
			//center: [13.741,51.052],
			//projection: 'EPSG:4326',
			zoom: 11,
		})
	});
	
	var layerSwitcher = new ol.control.LayerSwitcher();	
	map.addControl(layerSwitcher);
	
	var popupHandler = new ol.Overlay.Popup();
	map.addOverlay(popupHandler);	
	
    map.on('singleclick', function(evt) {
		
		//cleaned today or weakly must be active
		var source = false;	
		if(GetLayerByTitle('Cleaning frequency').get('visible')) source = GetLayerByTitle('Cleaning frequency').getSource();
		if(GetLayerByTitle('Cleaning current day').get('visible')) {
			source = GetLayerByTitle('Cleaning current day').getSource();
			map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
				console.log(feature);
			});
		}
		
		var coord = ol.proj.transform(evt.coordinate, projection, 'EPSG:4326');
		
		popupHandler.show(evt.coordinate, '<div><p><u>Clicked coordinates</u></p>' + 
			'<p>' +String(coord[0]).substring(0,10) +', '+ String(coord[1]).substring(0,10) + '</p>' +
			'<p>(EPSG:4326)</p></div>'
		);
		$('.ol-overlay-container').hide();
		
		if(source != false){	
			var url_lines = source.getGetFeatureInfoUrl(evt.coordinate, map.getView().getResolution(), map.getView().getProjection(),{'INFO_FORMAT': 'text/javascript'});
				
			if(url_lines){
				url_lines += '&format_options=callback:GetFeaturesJsonResult';
				$.ajax({
					url: url_lines,
					dataType: 'jsonp'
				});
			}
		}
		
		//pollution must be active
		if(GetLayerByTitle('Pollution per day').get('visible')){
			var url_raster = GetLayerByTitle('Pollution per day').getSource().getGetFeatureInfoUrl(evt.coordinate, map.getView().getResolution(), map.getView().getProjection(),{'INFO_FORMAT': 'text/javascript'});
			if(url_raster){
				url_raster += '&format_options=callback:GetRasterJsonResult';
				$.ajax({
					url: url_raster,
					dataType: 'jsonp'
				});
			}
		}
		
		if(dwd_vectorSource.get('visible')){
		
		}
    });	
}

$(function(){
	//order is important think good about changing it
	AdjustCSS();
	PrepareTimeline();
	DisplayTimelineLabel();
	UpdateLegend();
	OpenLayersInit();
});

var GetFeaturesJsonResult = function(response){	
	DeleteSelectedFeatures();
	
	if(response.features.length == 0) return;
	var feature = response.features[0];
	
	SelectedFeatures.getSource().updateParams({
		FEATUREID: feature.id
	});
	
	var data = {
		lyr : 'frequency',
		cycle : feature.properties.frequency,
		last : PrintLastCleaningDay(feature.properties),
		cleaningday : PrintCleaningDays(feature.properties),
		length: Math.round(feature.properties.shape_leng)
	};
	
	angular.element(document.getElementById('angularjsappframe')).scope().displayGeneralInformaton(data);
	$('.ol-overlay-container').show();
};

var GetRasterJsonResult = function(response){
	if(response.features.length > 0){
		var data = {
			lyr : 'pollution',
			pollution: response.features[0].properties.GRAY_INDEX
		}
		angular.element(document.getElementById('angularjsappframe')).scope().displayGeneralInformaton(data);
		$('.ol-overlay-container').show();
	}
}
	