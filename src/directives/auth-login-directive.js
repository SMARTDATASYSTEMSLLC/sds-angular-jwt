(function () {
    'use strict';
    function authLoginDirective ($location, $rootScope, authService, authConfig) {
        return {
            restrict: 'EA',
            transclude: true,
            scope: {
                // after logging in, redirect to specific page
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
                        $rootScope.$broadcast("auth:submitStart");
                        authService.login(vm.user.email, vm.user.password).then(function () {
                            $rootScope.$broadcast("auth:submitEnd");
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
                            $rootScope.$broadcast("auth:submitEnd");
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

