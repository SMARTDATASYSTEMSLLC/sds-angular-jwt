(function (){
    'use strict';
    function authInterceptorService($timeout, $q, $injector, $location, authConfig) {
        var authInterceptorServiceFactory = {};

        var _request = function (config) {
            if (!config.cache && config.url.slice(-5) !== '.html') {

                var authService = $injector.get('authService');

                config.headers = config.headers || {};

                if (!authService.isExpired()) {
                    config.headers.Authorization = 'Bearer ' + authService.authentication.token;
                }

                authConfig.onLoadStart({config: config});

            }
            return config;
        };

        var _response = function(response) {
            if (!response.config.cache && response.config.url.slice(-5) !== '.html') {
                authConfig.onLoadEnd({success: true, config: response.config});
            }
            return response;
        };

        var _requestError = function(request){
            console.log(request);
        };

        var _isLoginOrRegistrationPath = function(){
            return $location.path().indexOf('login') > -1 || $location.path().indexOf('registration') > -1;
        };

        var _responseError = function (rejection) {
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

            if (!rejection.config.cache && rejection.config.url.slice(-5) !== '.html') {
                authConfig.onLoadEnd({
                    success: false,
                    config: rejection.config,
                    status: rejection.status,
                    message: rejection.data && rejection.data.message,
                    error: rejection.data && rejection.data.error
                });
            }
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
