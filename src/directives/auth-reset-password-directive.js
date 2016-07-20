(function () {
    'use strict';
    function authResetPasswordDirective ($q, $location, $timeout, $rootScope, authConfig) {
        return {
            restrict: 'EA',
            transclude: true,
            scope: {
                redirectUrl: "@",
                loginUrl: "@",
                onSubmit: '&',
                token: '='
            },
            templateUrl: 'sds-angular-jwt/directives/auth-reset-password-directive.html',
            link: function ($scope, $element, $attrs) {
                var vm = {};

                vm.loc = authConfig.localization;
                vm.loginUrl = $scope.loginUrl || authConfig.loginUrl;
                vm.isLoginPage = $location.path() === vm.loginUrl;

                vm.success = false;
                vm.user = {
                    password: null,
                    confirmPassword: null
                };

                vm.submit = function (form){
                    vm.message = "";
                    if (form.$valid) {
                        if (vm.user.password !== vm.user.confirmPassword){
                            vm.message = vm.loc.errorPasswordMatch;
                        }else {
                            var user = angular.copy(vm.user);
                            delete user.confirmPassword;
                            user.token = $scope.token;

                            $rootScope.$broadcast("auth:submitStart");
                            $q.when($scope.onSubmit()(user)).then(function () {
                                vm.success = true;
                                $rootScope.$broadcast("auth:submitEnd");
                                if($scope.redirectUrl) {
                                    $timeout(function (){
                                        $location.path($scope.redirectUrl);
                                    },3000);
                                }
                            }, function (err) {
                                $rootScope.$broadcast("auth:submitEnd");
                                if (err.data && err.data.message) {
                                    vm.message = err.data.message;
                                }else if(err.message) {
                                    vm.message = err.message;
                                } else {
                                    vm.message = vm.loc.errorResetPassword;
                                }
                            });
                        }
                    }
                };

                $scope.vm = vm;
            }
        };
    }

    angular.module('sds-angular-jwt').directive('authResetPassword', authResetPasswordDirective);

})();

