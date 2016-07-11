(function () {
    'use strict';
    function authLoginDirective ($location, authService, authConfig) {
        return {
            restrict: 'EA',
            transclude: true,
            scope: {
                // ater logging in, redirect to specific page
                redirectUrl: "@",
                // or call a function
                onLogin: '&?'
            },
            templateUrl: 'sds-angular-jwt/directives/auth-login-directive.html',
            link: function ($scope, $element, $attrs) {
                var vm = {};

                vm.loc = authConfig.localization;

                vm.user = {
                    email: null,
                    password: null
                };

                vm.submit = function (form){
                    vm.message = "";
                    if (form.$valid) {
                        authService.login(vm.user).then(function () {
                            if (authService.authentication.data) {
                                if (typeof $scope.onLogin === 'function') {
                                    $scope.onLogin()(authService.authentication.data);
                                }else {
                                    $location.path($scope.redirectUrl);
                                }
                            }else{
                                vm.message = vm.loc.errorLogin;
                            }
                        }, function (err) {
                            if(err.data && err.data.message){
                                vm.message = err.data.message;
                            }else {
                                vm.message = vm.loc.errorLoginRejected;
                            }
                        });
                    }
                };


                $scope.vm = vm;
            }
        };
    }

    angular.module('sds-angular-jwt').directive('authLogin', authLoginDirective);

})();

