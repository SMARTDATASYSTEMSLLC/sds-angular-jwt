(function () {
    'use strict';
    function AuthRegisterComponent($q, $timeout, $location, $rootScope, authService, authConfig) {
        var $ctrl = this;

        $ctrl.loc = authConfig.localization;
        $ctrl.loginUrl = $ctrl.loginUrl || authConfig.loginUrl;
        $ctrl.isLoginPage = $location.path() === $ctrl.loginUrl;

        $ctrl.user = {
            email: null,
            password: null
        };

        $ctrl.submit = function (form) {
            $ctrl.message = "";
            if (form.$valid) {

                for (var key in form) {
                    if (form.hasOwnProperty(key) && key[0] !== '$') {
                        $ctrl.user[key] = form[key].$modelValue;
                    }
                }

                $rootScope.$broadcast("auth:submitStart");
                $q.when($ctrl.onSubmit({user: $ctrl.user, form: form})).then(function () {
                    if (!authService.authentication.isAuth) {
                        return authService.login($ctrl.user.email, $ctrl.user.password).then(function () {
                            $ctrl.success = true;
                            if ($ctrl.redirectUrl) {
                                $location.path($ctrl.redirectUrl);
                            }
                        });
                    }

                    $ctrl.success = true;
                    if ($ctrl.redirectUrl) {
                        $timeout(function () {
                            $location.path($ctrl.redirectUrl);
                        }, 3000);
                    }
                }).then(
                    function () {
                        $rootScope.$broadcast("auth:submitStart");
                    },
                    function (err) {
                        $rootScope.$broadcast("auth:submitEnd");
                        if (err.data && err.data.message) {
                            $ctrl.message = err.data.message;
                        } else if (err.message) {
                            $ctrl.message = err.message;
                        } else {
                            $ctrl.message = $ctrl.loc.errorRegister;
                        }
                    }
                );
            }
        };
    }


    angular.module('sds-angular-jwt').component('authRegister', {
        templateUrl: 'sds-angular-jwt/directives/auth-register-component.html',
        controller: AuthRegisterComponent,
        transclude: true,
        bindings: {
            redirectUrl: "@",
            loginUrl: "@",
            onSubmit: '&'
        }
    });

})();

