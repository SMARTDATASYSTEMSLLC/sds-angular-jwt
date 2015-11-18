(function (){
    'use strict';
    function authInterceptorService($timeout, $q, $injector, $location, authProvider) {
        var authInterceptorServiceFactory = {};

        var _request = function (config) {
            var authService = $injector.get('authService');

            config.headers = config.headers || {};

            if (authService.authentication.isAuth) {
                config.headers.Authorization = 'Bearer ' + authService.authentication.token;
            }

            authProvider.onLoadStart();

            return config;
        };

        var _response = function(response) {
            authProvider.onLoadEnd({success: true});
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
                        $location.path(authProvider.loginUrl);
                    });
                }else{
                    authService.logOut();
                    $location.path(authProvider.loginUrl);
                }
            }
            if(rejection.status === 404 && authProvider.notFoundUrl){
                $timeout(function(){
                    $location.path(authProvider.notFoundUrl);
                }, 1000);
            }
            authProvider.onLoadEnd({success: false, status: rejection.status, message: rejection.data && rejection.data.message, error: rejection.data && rejection.data.error});
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
