
var CurrentValue = false, CurrentTimer = false;
var firstday = new Date(2016, 0, 1, 23, 0);
var lastday = new Date();
lastday.setUTCHours(23);
lastday.setUTCMinutes(00);
lastday.setUTCMonth(lastday.getUTCMonth() + 1);

var RefreshLayers = function(){
	GetLayerByTitle('Cleaning current day').getSource().updateParams({
		CQL_FILTER: "f_" + ConvertIntToShortDaystring(GetWeekDayFromTimelines()) + " = 'T'"
	});
	GetLayerByTitle('Pollution per day').getSource().updateParams({
		time: ReturnDateString()
	});

	dwd_vectorSource.forEachFeature(function(feature){
		feature.setStyle(
			new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: 'black',
					width: 3
				}),
				fill: new ol.style.Fill({
					color: 'rgba(0, 0, 0, 0)'
				})
			})
		);
	});

	loadFeatures();
}

function DisplayTimelineLabel(){
	$('#datepicker').val(ReturnDateString());
}

function ReturnDateString(datechanger){
	if(!datechanger) datechanger = 0;
	var month = (timeline_date.getUTCMonth() +1);
	var date = (timeline_date.getUTCDate() + datechanger);
	if(month < 10) {
		month = '0' + month;
	}
	if(date < 10) {
		date = '0' + date;
	}
	return timeline_date.getUTCFullYear() + '-' + month + '-' + date;	
}

function HandleTimelineChange(skip){
	timeline_date = GetDateFromTimeline();
	DisplayTimelineLabel();
	if(CurrentValue != false && CurrentValue.getTime() == timeline_date.getTime()) {
		return;
	}
	if(CurrentTimer != false){
		clearInterval(CurrentTimer);	//deletes old layer
	}
	CurrentValue = new Date(timeline_date);
	CurrentTimer = setTimeout(RefreshLayers, 500);	//updates Layer after 1/2 second
}

function HandleDatePickerChange(){
	var d = $('#datepicker').val();
	d = new Date(d);
	d.setUTCHours(23);
	d.setUTCMinutes(00);
	var pos = GetDaysFromYear(firstday,d);
	$('#Timeline_day').val(pos);
	HandleTimelineChange();
}

function GetDateFromTimeline(){
	var val = parseInt($("#Timeline_day").val());
	var result = new Date(firstday);
	result.setUTCDate(result.getUTCDate() + val);
	return result;
}

function GetDaysFromYear(d_from,d_to){
	if(!d_to) d_to = lastday;
	var result = Math.floor((d_to - d_from) / (1000 * 60 * 60 * 24));
	return result;
}

function GetWeekDayFromTimelines(){
	return timeline_date.getUTCDay();
}

function AddScaleTick(day,color,size){
	if(!color) color = "#000";
	if(!size) size = 1;
	var max_days = parseInt($('#Timeline_day').prop('max'));
	var slider_width = parseInt($('#Timeline_day').width());
	var result = (GetDaysFromYear(firstday, day) / max_days) * slider_width;
	
	if((size/2) > 1){
		//decompensate size in px
		result-= Math.round(size/2);
	}
	
	//decompensate Tumb Width
	if(result / slider_width > 0.80) result-=3;
	if(result / slider_width < 0.20 && result!=0) result+=3;
	
	var text = '';
	if(day.getUTCMonth() == 0 && day.getUTCDate() == 1){
		text = '<div style="font-size: 9px; margin-top: 9px; margin-left: 2px; color: #787878;">' + day.getUTCFullYear() + '</div>';
	}
	$('#Timelinescale').append('<div style="width:' + size + 'px; background:' + color + '; position:absolute; height:30px; top:0px; left: ' + result + 'px;"> ' + text + ' </div>');
}

function PrepareTimeline(){ 	//initcall
	var d = new Date(); //current
	d.setUTCHours(23);
	d.setUTCMinutes(00);
	timeline_date = d;
	
	var days = GetDaysFromYear(firstday);
	
    $("#Timeline_day").attr({
		"min" : 0,
		"max" : days,
		"step": 1
    });	
	$("#Timeline_day").val(GetDaysFromYear(firstday,timeline_date));
	
	var scale_date = new Date(firstday);
	while(scale_date < lastday){
		AddScaleTick(scale_date);
		scale_date.setUTCMonth(scale_date.getUTCMonth() + 1);	//every month
	}
	
	AddScaleTick(timeline_date,'green','7'); //today
	
	$('#Timeline_day').mousemove(function(){
		HandleTimelineChange();
	}).mousedown(function(){
		HandleTimelineChange();
	});
	
	$( "#datepicker" ).datepicker({
		minDate: firstday,
		maxDate: lastday,
		dateFormat: "yy-mm-dd",
	});
	
	$('#datepicker').change(function(){
		HandleDatePickerChange();
	});
}

function SetDay(val){
	val = parseInt(val);
	timeline_date.setUTCDate(timeline_date.getUTCDate() + val);
	if(timeline_date > lastday) timeline_date = new Date(lastday);
	if(timeline_date < firstday) timeline_date = new Date(firstday);
	$("#Timeline_day").val(GetDaysFromYear(firstday,timeline_date));
	HandleTimelineChange();
}

function SetMonth(val){
	val = parseInt(val);
	timeline_date.setUTCMonth(timeline_date.getUTCMonth() + val);
	if(timeline_date > lastday) timeline_date = new Date(lastday);
	if(timeline_date < firstday) timeline_date = new Date(firstday);
	$("#Timeline_day").val(GetDaysFromYear(firstday,timeline_date));
	HandleTimelineChange();
}