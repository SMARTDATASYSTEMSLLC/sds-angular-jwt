(function () {
    'use strict';
    function authRegisterDirective ($q, $timeout, $location, $rootScope, authService, authConfig) {
        return {
            restrict: 'EA',
            transclude: true,
            scope: {
                redirectUrl: "@",
                loginUrl: "@",
                onSubmit: '&'
            },
            templateUrl: 'sds-angular-jwt/directives/auth-register-directive.html',
            link: function ($scope, $element, $attrs) {
                var vm = {};

                vm.loc = authConfig.localization;
                vm.loginUrl = $scope.loginUrl || authConfig.loginUrl;
                vm.isLoginPage = $location.path() === vm.loginUrl;

                vm.user = {
                    email: null,
                    password: null
                };

                vm.submit = function (form){
                    vm.message = "";
                    if (form.$valid) {

                        for(var key in form) {
                            if(form.hasOwnProperty(key) && key[0] !== '$') {
                                vm.user[key] = form[key].$modelValue;
                            }
                        }

                        $rootScope.$broadcast("auth:submitStart");
                        $q.when($scope.onSubmit()(vm.user)).then(function (){
                            if (!authService.authentication.isAuth){
                                return authService.login(vm.user.email, vm.user.password).then(function () {
                                    vm.success = true;
                                    if($scope.redirectUrl) {
                                        $location.path($scope.redirectUrl);
                                    }
                                });
                            }

                            vm.success = true;
                            if($scope.redirectUrl) {
                                $timeout(function (){
                                    $location.path($scope.redirectUrl);
                                },3000);
                            }
                        }).then(
                            function (){
                                $rootScope.$broadcast("auth:submitStart");
                            },
                            function (err) {
                                $rootScope.$broadcast("auth:submitEnd");
                                if(err.data && err.data.message) {
                                    vm.message = err.data.message;
                                }else if(err.message) {
                                    vm.message = err.message;
                                }else {
                                    vm.message = vm.loc.errorRegister;
                                }
                            }
                        );
                    }
                };


                $scope.vm = vm;
            }
        };
    }

    angular.module('sds-angular-jwt').directive('authRegister', authRegisterDirective);

})();

