(function () {
    'use strict';
    function AuthForgotPasswordComponent($q, $location, $timeout, $rootScope, authConfig) {

        var $ctrl = this;

        $ctrl.loc = authConfig.localization;
        $ctrl.loginUrl = $ctrl.loginUrl || authConfig.loginUrl;
        $ctrl.isLoginPage = $location.path() === $ctrl.loginUrl;

        $ctrl.success = false;
        $ctrl.user = {
            email: null
        };

        $ctrl.submit = function (form) {
            $ctrl.message = "";
            if (form.$valid) {
                $rootScope.$broadcast("auth:submitStart");
                $q.when($ctrl.onSubmit({user: $ctrl.user, form: form})).then(function () {
                    $rootScope.$broadcast("auth:submitEnd");
                    $ctrl.success = true;
                    if ($ctrl.redirectUrl) {
                        $timeout(function () {
                            $location.path($ctrl.redirectUrl);
                        }, 3000);
                    }
                }, function (err) {
                    $rootScope.$broadcast("auth:submitEnd");
                    if (err.data && err.data.message) {
                        $ctrl.message = err.data.message;
                    } else if (err.message) {
                        $ctrl.message = err.message;
                    } else {
                        $ctrl.message = $ctrl.loc.errorForgotPassword;
                    }
                });
            }
        };
    }

    angular.module('sds-angular-jwt').component('authForgotPassword', {
        templateUrl: 'sds-angular-jwt/directives/auth-forgot-password-component.html',
        controller: AuthForgotPasswordComponent,
        transclude: true,
        bindings: {
            redirectUrl: "@",
            loginUrl: "@",
            onSubmit: '&'
        }
    });

})();

