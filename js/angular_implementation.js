angular.module('myapp', [])
    .controller('mycontroller', function ($scope) {
	
		$scope.selection=[];
	
		$scope.resetselect = function() {
			$scope.selection = [];
			$scope.$apply();
		};	
	
		$scope.displayGeneralInformaton = function(data) {
			if(data.lyr == "frequency"){
				//new selection
				$scope.selection.push({
					cleaning: data,
					pollution: null,
					weather: null
				});
			}
			
			if(data.lyr == "pollution"){
				var index = $scope.selection.length - 1;
				$scope.selection[index][pollution] = data;
			}
			$scope.$apply();
		};
});
