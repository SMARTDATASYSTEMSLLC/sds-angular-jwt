(function () {
    'use strict';
    function AuthLoginComponent($location, $rootScope, authService, authConfig) {

        var $ctrl = this;

        $ctrl.loc = authConfig.localization;

        $ctrl.user = {
            email: null,
            password: null
        };

        $ctrl.submit = function (form) {
            $ctrl.message = "";
            if (form.$valid) {
                $rootScope.$broadcast("auth:submitStart");
                authService.login($ctrl.user.email, $ctrl.user.password).then(function () {
                    $rootScope.$broadcast("auth:submitEnd");
                    if (authService.authentication.data) {
                        if (typeof $ctrl.onLogin === 'function') {
                            $ctrl.onLogin({auth: authService.authentication.data});
                        } else {
                            $location.path($ctrl.redirectUrl);
                        }
                    } else {
                        $ctrl.message = $ctrl.loc.errorLogin;
                    }
                }, function (err) {
                    $rootScope.$broadcast("auth:submitEnd");
                    if (err.data && err.data.message) {
                        $ctrl.message = err.data.message;
                    } else {
                        $ctrl.message = $ctrl.loc.errorLoginRejected;
                    }
                });
            }
        };
    }

    angular.module('sds-angular-jwt').component('authLogin', {
        templateUrl: 'sds-angular-jwt/directives/auth-login-component.html',
        controller: AuthLoginComponent,
        transclude: true,
        bindings: {
            // after logging in, redirect to specific page
            redirectUrl: "@",
            // or call a function
            onLogin: '&?'
        }
    });

})();

