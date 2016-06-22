(function (){
    'use strict';
    function authInterceptorService($timeout, $q, $injector, $location, authConfig) {
        var authInterceptorServiceFactory = {};

        var _request = function (config) {
            var authService = $injector.get('authService');

            config.headers = config.headers || {};

            if (authService.authentication.isAuth) {
                config.headers.Authorization = 'Bearer ' + authService.authentication.token;
            }

            authConfig.onLoadStart();

            return config;
        };

        var _response = function(response) {
            authConfig.onLoadEnd({success: true});
            return response;
        };

        var _requestError = function(request){
            console.log(request);
        };

        var _isLoginOrRegistrationPath = function(){
            return $location.path().indexOf('login') > -1 || $location.path().indexOf('registration') > -1;
        };

        var _responseError = function (rejection) {
            var title = "", message ="";

            if (rejection.status === 401 && !_isLoginOrRegistrationPath()) {
                var authService = $injector.get('authService');

                if (authService.authentication && authService.authentication.useRefreshTokens) {
                    authService.refreshToken().then(function (){
                        $location.reload();
                    }, function (){
                        $location.path(authConfig.loginUrl);
                    });
                }else{
                    authService.logOut();
                    $location.path(authConfig.loginUrl);
                }
            }
            if(rejection.status === 404 && authConfig.notFoundUrl){
                $timeout(function(){
                    $location.path(authConfig.notFoundUrl);
                }, 1000);
            }
            authConfig.onLoadEnd({success: false, status: rejection.status, message: rejection.data && rejection.data.message, error: rejection.data && rejection.data.error});
            return $q.reject(rejection);
        };

        authInterceptorServiceFactory.request = _request;
        authInterceptorServiceFactory.response = _response;
        authInterceptorServiceFactory.requestError = _requestError;
        authInterceptorServiceFactory.responseError = _responseError;

        return authInterceptorServiceFactory;
    }

    angular.module('sds-angular-jwt').factory('authInterceptorService',authInterceptorService);

})();
