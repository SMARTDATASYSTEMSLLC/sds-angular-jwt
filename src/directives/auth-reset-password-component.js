(function () {
    'use strict';
    function AuthResetPasswordComponent($q, $location, $timeout, $rootScope, authConfig) {
        var $ctrl = this;

        $ctrl.loc = authConfig.localization;
        $ctrl.loginUrl = $ctrl.loginUrl || authConfig.loginUrl;
        $ctrl.isLoginPage = $location.path() === $ctrl.loginUrl;

        $ctrl.success = false;
        $ctrl.user = {
            password: null,
            confirmPassword: null
        };

        $ctrl.submit = function (form) {
            $ctrl.message = "";
            if (form.$valid) {
                if ($ctrl.user.password !== $ctrl.user.confirmPassword) {
                    $ctrl.message = $ctrl.loc.errorPasswordMatch;
                } else {
                    var user = angular.copy($ctrl.user);
                    delete user.confirmPassword;
                    user.token = $ctrl.token;

                    for (var key in form) {
                        if (form.hasOwnProperty(key) && key[0] !== '$') {
                            user[key] = form[key].$modelValue;
                        }
                    }

                    $rootScope.$broadcast("auth:submitStart");
                    $q.when($ctrl.onSubmit({user: user, form: form})).then(function () {
                        $ctrl.success = true;
                        $rootScope.$broadcast("auth:submitEnd");
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
                            $ctrl.message = $ctrl.loc.errorResetPassword;
                        }
                    });
                }
            }
        };
    }

    angular.module('sds-angular-jwt').component('authResetPassword', {
        templateUrl: 'sds-angular-jwt/directives/auth-reset-password-component.html',
        controller: AuthResetPasswordComponent,
        transclude: true,
        bindings: {
            redirectUrl: "@",
            loginUrl: "@",
            onSubmit: '&',
            token: '<'
        }
    });

})();

