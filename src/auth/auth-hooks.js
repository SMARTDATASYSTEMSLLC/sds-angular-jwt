(function () {
    'use strict';

    angular.module('sds-angular-jwt').config(function($httpProvider) {
        $httpProvider.interceptors.push('authInterceptorService');

    })
    .run(function($q, $location, $rootScope, authService, authConfig) {
        var previousLocation = "/",
            postLogInRoute;


        function redirectNoAccess(event){
            //send back to wherever they came from
            event.preventDefault();
            if (previousLocation) {
                $location.path(previousLocation);
            }
        }

        function securityCheck(newRoute, params, event){
            if(!authService.authentication.isAuth) {
                if (newRoute && newRoute.auth !== false) {
                    if (!newRoute.redirectTo) {
                        postLogInRoute = $location.url();
                    }
                    $location.path(authConfig.loginUrl).replace();
                }
                else {
                    $location.path($location.path());
                }
            }else if (postLogInRoute){
                $location.url(postLogInRoute);
                postLogInRoute = null;
            } else {
                if(newRoute) {
                    var hasAccess = true;
                    if (newRoute.auth && typeof newRoute.auth !== "boolean" && !authConfig.permissionLookup(newRoute.auth, authService.authentication.data,  params)){
                        hasAccess = false;
                        previousLocation = previousLocation || "/";
                    }
                    if (!hasAccess) {
                        redirectNoAccess(event);
                    }else if (newRoute && newRoute.templateUrl) { //don't store a previous if not a view
                        previousLocation = $location.url();
                    }
                }
            }
        }

        $rootScope.$on('$routeChangeStart', function (event, currRoute) {
            if (currRoute) {
                securityCheck(currRoute.$$route, currRoute.params, event);
            }
        });

        $rootScope.$on('$stateChangeStart', function (event, toState, toParams) {
            securityCheck(toState, toParams, event);
        });

        securityCheck(null, null);
    });

})();
