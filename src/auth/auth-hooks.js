(function () {
    'use strict';

    angular.module('sds-angular-jwt').config(function($httpProvider) {
        $httpProvider.interceptors.push('authInterceptorService');

    })
    .run(function($q, $location, $rootScope, authService, authProvider) {
        var previousLocation = authProvider.loginUrl,
            postLogInRoute;


        function redirectNoAccess(newRoute, event){
            //send back to wherever they came from
            event.preventDefault();
            if (previousLocation) {
                $location.path(previousLocation);
            }
        }

        function securityCheck(newRoute, event){
            if(!authService.authentication.isAuth) {
                if (newRoute && newRoute.$$route && newRoute.$$route.auth !== false) {
                    postLogInRoute = $location.url();
                    $location.path(authProvider.loginUrl).replace();
                }
                else {
                    $location.path($location.path());
                }
            }else if (postLogInRoute){
                $location.url(postLogInRoute);
                postLogInRoute = null;
            } else {
                if(newRoute && newRoute.$$route) {
                    var hasAccess = true;
                    if (typeof newRoute.$$route.auth === "string" && !authProvider.permissionLookup(newRoute.$$route.auth, authService.authentication.data,  newRoute.params)){
                        hasAccess = false;
                        previousLocation = previousLocation || "/";
                    }
                    if (!hasAccess) {
                        redirectNoAccess(newRoute, event);
                    }else if (newRoute.$$route && newRoute.$$route.templateUrl) { //don't store a previous if not a view
                        previousLocation = $location.url();
                    }
                }
            }
        }

        $rootScope.$on('$routeChangeStart', function (event, currRoute) {
            securityCheck(currRoute, event);
        });

        securityCheck(null, null);
    });

})();
