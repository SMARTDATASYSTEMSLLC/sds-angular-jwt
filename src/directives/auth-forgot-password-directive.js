(function () {
    'use strict';
    function authForgotPasswordDirective ($q, $location, $timeout, $rootScope, authConfig) {
        return {
            restrict: 'EA',
            transclude: true,
            scope: {
                redirectUrl: "@",
                loginUrl: "@",
                onSubmit: '&'
            },
            templateUrl: 'sds-angular-jwt/directives/auth-forgot-password-directive.html',
            link: function ($scope, $element, $attrs) {
                var vm = {};

                vm.loc = authConfig.localization;
                vm.loginUrl = $scope.loginUrl || authConfig.loginUrl;
                vm.isLoginPage = $location.path() === vm.loginUrl;

                vm.success = false;
                vm.user = {
                    email: null
                };

                vm.submit = function (form){
                    vm.message = "";
                    if (form.$valid) {
                        $rootScope.$broadcast("auth:submitStart");
                        $q.when($scope.onSubmit()(vm.user)).then(function (){
                            $rootScope.$broadcast("auth:submitEnd");
                            vm.success = true;
                            if($scope.redirectUrl) {
                                $timeout(function (){
                                    $location.path($scope.redirectUrl);
                                },3000);
                            }
                        }, function (err) {
                            $rootScope.$broadcast("auth:submitEnd");
                            if(err.data && err.data.message) {
                                vm.message = err.data.message;
                            }else if(err.message) {
                                vm.message = err.message;
                            }else {
                                vm.message = vm.loc.errorForgotPassword;
                            }
                        });
                    }
                };

                $scope.vm = vm;
            }
        };
    }

    angular.module('sds-angular-jwt').directive('authForgotPassword', authForgotPasswordDirective);

})();

