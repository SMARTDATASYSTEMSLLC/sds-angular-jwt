(function () {
    'use strict';
    function authForgotPasswordDirective ($q, $location, $timeout, authProvider) {
        return {
            restrict: 'EA',
            scope: {
                redirectUrl: "=",
                loginUrl: "=",
                onSubmit: '&'
            },
            templateUrl: 'sds-angular-jwt/directives/auth-forgot-password-directive.html',
            link: function ($scope, $element, $attrs) {
                var vm = {};

                vm.loc = authProvider.localization;
                vm.loginUrl = $scope.loginUrl || authProvider.loginUrl;

                vm.success = false;
                vm.user = {
                    email: null
                };

                vm.submit = function (form){
                    vm.message = "";
                    if (form.$valid) {
                        $q.when($scope.onSubmit(vm.user)).then(function (){
                            vm.success = true;
                            if($scope.redirectUrl) {
                                $timeout(function (){
                                    $location.path($scope.redirectUrl);
                                },3000);
                            }
                        }, function (err) {
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

