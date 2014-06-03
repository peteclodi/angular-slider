'use strict';

angular.module('angular-slider', [])
    .directive('angularSlider', ['$swipe', function($swipe) {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                min: '=',
                max: '=',
                step: '@',
                tickToFormatted: '&',
                formattedToTick: '&',
                isValidFormattedValue: '&',
                handleValues: "="
            },
            templateUrl: 'views/angular-slider.html',
            link: function(scope, element, attrs){
                scope.showTicks = angular.isDefined(attrs.showTicks);
                scope.showValues = angular.isDefined(attrs.showValues);

                var inputSections = scope.handleValues.length < 3 ? 4 : Math.max(scope.handleValues.length, 3);
                var inputSectionOffset = scope.handleValues.length >= 3 ? 2.25 : 0;
                scope.inputWidths = Math.round(((1 / inputSections) * 100) - inputSectionOffset) + '%';

                var sliderRangeElement = undefined;
                angular.forEach(element.children(),
                    function(child){
                        if(angular.isDefined(sliderRangeElement)){ return; }
                        var angularChild = angular.element(child);
                        if(angularChild.hasClass('angular-slider-range')){
                            sliderRangeElement = angularChild;
                        }
                    });

                if(scope.showTicks){
                    generateTickMarks();
                }

                var sliderHandles = [];
                var sliderInnerRangeIndex = 0;
                scope.handleValues.forEach(function(handleValue, index){
                    var sliderHandleClass = "angular-slider-handle";
                    var sliderHandle =
                        angular.element("<div></div>")
                            .addClass(sliderHandleClass)
                            .addClass(sliderHandleClass + "-" + index);
                    sliderHandle.handleIndex = index;
                    sliderRangeElement.append(sliderHandle);
                    sliderHandles.push(sliderHandle);
                    handleValue.sliderHandle = sliderHandle;

                    if(index < (scope.handleValues.length -1)){
                        var sliderInnerRangeClass = "angular-slider-inner-range";
                        var sliderInnerRangeElement =
                            angular.element("<div></div>")
                                .addClass(sliderInnerRangeClass)
                                .addClass(sliderInnerRangeClass + "-" + sliderInnerRangeIndex++)
                                .css({
                                    position: "absolute"
                                });
                        sliderRangeElement.append(sliderInnerRangeElement);
                        sliderHandle.innerRangeElement = sliderInnerRangeElement;
                    }

                    if(angular.isUndefined(handleValue.step) ||
                        ((scope.max - scope.min) % handleValue.step !== 0) ||
                        (handleValue.value % handleValue.step !== 0)) {
                        if((scope.max - scope.min) % handleValue.step !== 0) {
                            console.log("The handle's step value (" + handleValue.step +
                                        ") must be a rational divisor of the slider's range (" +
                                        (scope.max - scope.min) + ")");
                        }
                        else if((handleValue.value - scope.min) % handleValue.step !== 0) {
                            console.log("The handle's step value (" + handleValue.step +
                                        ") must be a rational divisor of the handle's value, relative to the slider's " +
                                        "minimum value (" + (handleValue.value - scope.min) + ")");
                        }
                        console.log("The handle's step value is being reset to 1");
                        handleValue.step = 1;
                    }

                    handleValue.displayValue = formatTickValue(handleValue.value);

                    sliderHandle.prevPageX = 0;
                    sliderHandle.ready(function(){
                        updateSliderHandleElement(sliderHandle, handleValue.value);
                    });

                    $swipe.bind(sliderHandle, {
                        start: function(coords){
                            console.log("$swipe.start: (" + coords.x + "," + coords.y + ")");
                        },
                        move: function(coords){
                            console.log("$swipe.move: (" + coords.x + "," + coords.y + ")");
                            swipeMove(coords.x);
                        },
                        end: function(){
                            console.log("$swipe.end");
                        },
                        cancel: function(){
                        }
                    });

                    function swipeMove(pageX) {
                        if(pageX === sliderHandle.prevPageX){
                            return;
                        }
                        var movingLeft = pageX < sliderHandle.prevPageX;
                        if((movingLeft && (sliderRangeElement.prop('offsetLeft') > pageX)) ||
                            (sliderRangeElement.prop('offsetLeft') + sliderRangeElement.prop('clientWidth')) < pageX){
                            return;
                        }

                        var prevSlider = sliderHandle.handleIndex > 0 ? sliderHandles[sliderHandle.handleIndex - 1] : undefined;
                        var nextSlider = sliderHandle.handleIndex < (sliderHandles.length - 1) ? sliderHandles[sliderHandle.handleIndex + 1] : undefined;

                        if((movingLeft && (angular.isDefined(prevSlider) && prevSlider.prevPageX >= pageX)) ||
                            (angular.isDefined(nextSlider) && nextSlider.prevPageX <= pageX)){
                            return;
                        }

                        var newValue = Math.round(getValueByPosition(pageX - sliderRangeElement.prop('offsetLeft')));
                        if((newValue % handleValue.step) !== 0) {
                            return;
                        }
                        sliderHandle.x = Math.round(pageX - (sliderHandle.prop('clientWidth') / 2));
                        sliderHandle.css({
                            left:  sliderHandle.x + 'px'
                        });
                        sliderHandle.prevPageX = pageX;
                        handleValue.value = newValue;
                        handleValue.displayValue = formatTickValue(handleValue.value);

                        // force the application of the scope.handleValues[].value update
                        scope.$apply('handleValue.value');
                    }
                });

                function calculateXForValue(value){
                    return Math.round((sliderRangeElement.prop('clientWidth') * ((value - scope.min) / (scope.max - scope.min))) + sliderRangeElement.prop('offsetLeft'));
                }

                function calculateHandleXAtValue(handle, value){
                    return calculateXForValue(value) - (handle.prop('clientWidth') / 2);
                }

                function updateSliderHandleElement(sliderHandle, value){
                    sliderHandle.prevPageX = calculateXForValue(value);
                    setHandlePositionByValue(sliderHandle, value);
                }

                function setHandlePositionByValue(handle, value){
                    handle.x = calculateHandleXAtValue(handle, value);
                    handle.css({
                        left:  handle.x + 'px'
                    });
                    return handle.x;
                }

                function getValueByPosition(position){
                    var positionRatio = position / sliderRangeElement.prop('clientWidth');
                    var pointOffset = (scope.max - scope.min) * positionRatio;
                    return pointOffset + scope.min;
                }

                function generateTickMarks() {
                    var range = scope.max - scope.min;
                    var rangePerTick = range / 4;
                    for(var tick = 0; tick < 5; ++tick){
                        var tickValue = scope.min + (rangePerTick * tick);
                        var tickElement = angular.element("<span></span>")
                            .addClass("angular-slider-tick")
                            .css({top: (sliderRangeElement.prop('offsetTop') + sliderRangeElement.prop('offsetHeight')) + 'px'});
                        tickElement.text(formatTickValue(tickValue));
                        tickElement.prop('tickValue', tickValue);
                        (function(tickElement){
                            tickElement.ready(function(){
                                tickElement.css({left: calculateXForValue(tickElement.prop('tickValue')) - (tickElement.prop('clientWidth') / 2) + 'px'});
                            });
                        }(tickElement));
                        sliderRangeElement.append(tickElement);
                    }
                }

                function formatTickValue(tickValue) {
                    // pass the value in as an object so that it will be properly marshaled to the parent controller
                    return scope.tickToFormatted({value: tickValue});
                }

                scope.handleValueChanged = function(handleValue) {
                    // pass the value in as an object so that it will be properly marshaled to the parent controller
                    if(scope.isValid(handleValue.displayValue)) {
                        handleValue.value = scope.formattedToTick({value: handleValue.displayValue});
                        updateSliderHandleElement(handleValue.sliderHandle, handleValue.value);
                    }
                };

                scope.isValid = function(displayValue) {
                    if(scope.isValidFormattedValue({value: displayValue})){
                        var value = scope.formattedToTick({value: displayValue})
                        return (value >= scope.min && value <= scope.max);
                    }
                    return false;
                }
            }
        };
    }]);
