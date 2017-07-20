function AdjustCSS(){
	var window_x = $(window).width();
	var window_y = $(window).height();
	var resolution = window_y / window_x;
	
	$('#map').width(window_x - 300).height(window_y);
	$('#sidebar').width(300).height(window_y - 50);
	$('#footer').width(window_x).height(50);
}

$(window).resize(function() {
	AdjustCSS();
	$('#Timelinescale').html('');
	
	var scale_date = new Date(firstday);
	while(scale_date < lastday){
		AddScaleTick(scale_date);
		scale_date.setUTCMonth(scale_date.getUTCMonth() + 1);	//every month
	}
	
	var d = new Date(); //current
	d.setUTCHours(23);
	d.setUTCMinutes(00);
	
	AddScaleTick(d,'green','7'); //today
});