function GetLegendData(){
	return [
		{
			layertitle: 'Cleaning current day',
			data: [{
					name: 'Cleaning today',
					color: '#000'
				}]
		},
		{
			layertitle: 'Cleaning frequency',
			data: [{
					name: 'One time a week',
					color: '#81F781'
				},{
					name: 'Two times a week',
					color: '#8181F7'
				},{
					name: 'Three times a week',
					color: '#F7BE81'
				}]
		},
		{
			layertitle: 'Pollution per day',
			data: [{
					name: 'Pollution',
					color: 'none; background-image: linear-gradient(to right, #FFFFFF 20%, #FE2E2E);'
				}]
		},		
	];
}

function GetAllLayers(){
	var result = [];
	
	if(!map) return result;

	map.getLayers().getArray().forEach(function(layer){
		if(layer instanceof ol.layer.Group){
			layer.getLayers().getArray().forEach(function(lyr){
				result.push(lyr);
			})
		} else {
			result.push(layer);
		}
	});
	
	return result;
}

function GetLayerByTitle(title){	
	var check = GetAllLayers(); //returns array containing all layers, its needed because of layergroups
	if(check.length == 0) return null;
	var result = null;
	check.forEach(function(lyr){
		if(lyr.get('title') && lyr.get('title').localeCompare(title) == 0){ //check if layer has a legend and only add that legend elem
			result = lyr;
			return;
		};
	});
	return result;
}

function AdjustLegendCss(){
	$('#legend').height((42 + parseInt($('#legend #content').height())) + "px");
}

function UpdateLegend(){
	var legenddata = GetLegendData();
	var visibility = false;
	var lyr = null;
	for(var i=0; i<legenddata.length; i++){
		lyr = GetLayerByTitle(legenddata[i].layertitle);
		var lyrElement = legenddata[i].layertitle.replace(/\s/g, '');
		if(lyr != null){
			if(lyr.get('visible') == true){
				visibility = true;
				if($('#legend #content > #' + lyrElement).length){
					$('#legend #content > #' + lyrElement).show();
					AdjustLegendCss();
				} else {
					var dataString = '';
					legenddata[i].data.forEach(function(legend){
						dataString=dataString.concat(
							'<div class="data">'+
								'<div class="label">'+legend.name+'</div>'+
								'<div class="line" style="background:'+legend.color+'"></div>'+
							'</div>');
					});
					$('#legend #content').append(
						'<div id="' + lyrElement + '">'+
							'<h2>'+ legenddata[i].layertitle +'</h2>'+
							dataString +
						'</div>'
					);
					AdjustLegendCss();
				}
			} else if($('#legend #content > #' + lyrElement).length){	//if exist
				$('#legend #content > #' + lyrElement).hide();
				AdjustLegendCss();
			}
		}
	}

	//when nothing to show hide legendbox
	if(visibility == true){
		$('#legend').show();
		AdjustLegendCss();
	} else {
		$('#legend').hide();
	}
}

function LayerVisibilityChanged(lyr){
	
	//adjust css from legendbox if timeline hides
	if(lyr.get('title').localeCompare("Cleaning current day") == 0){
		if(lyr.get('visible') != true){
			$('#footer').fadeOut(400);
			$("#legend").animate({
				bottom: '20px',
			}, 400 );
		} else {
			GetLayerByTitle('Cleaning frequency').setVisible(false);
			GetLayerByTitle('Geocure testlayer').setVisible(false);
			layerSwitcher.renderPanel();
			$("#legend").animate({
				bottom: '70px',
			}, 400 );
			$('#footer').fadeIn(400);
		}
	} else if((lyr.get('title').localeCompare("Cleaning frequency") == 0) && (lyr.get('visible') == true)){
		GetLayerByTitle('Geocure testlayer').setVisible(false);
		GetLayerByTitle('Cleaning current day').setVisible(false);
		layerSwitcher.renderPanel();
	} else if((lyr.get('title').localeCompare("Geocure testlayer") == 0) && (lyr.get('visible') == true)){
		GetLayerByTitle('Cleaning current day').setVisible(false);
		GetLayerByTitle('Cleaning frequency').setVisible(false);
		layerSwitcher.renderPanel();
	}
	
	//update the legend because something changed in some layer visibility
	UpdateLegend();
}