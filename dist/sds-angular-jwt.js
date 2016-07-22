/*! 
 * sds-angular-jwt
 * Angular JWT framework
 * @version 0.6.0 
 * 
 * Copyright (c) 2016 David Benson, Steve Gentile 
 * @link https://github.com/SMARTDATASYSTEMSLLC/sds-angular-jwt 
 * @license  MIT 
 */ 
angular.module('sds-angular-jwt', ['angular-jwt']);
(function () {
    'use strict';

    angular.module('sds-angular-jwt').config(["$httpProvider", function($httpProvider) {
        $httpProvider.interceptors.push('authInterceptorService');

    }])
    .run(["$q", "$location", "$rootScope", "authService", "authConfig", function($q, $location, $rootScope, authService, authConfig) {
        var previousLocation = authConfig.loginUrl,
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
                    if (typeof newRoute.auth === "string" && !authConfig.permissionLookup(newRoute.auth, authService.authentication.data,  params)){
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
    }]);

})();

(function (){
    'use strict';
    function authInterceptorService($timeout, $q, $injector, $location, authConfig) {
        var authInterceptorServiceFactory = {};

        var _request = function (config) {
            if (!config.cache && config.url.slice(-5) !== '.html') {

                var authService = $injector.get('authService');

                config.headers = config.headers || {};

                if (authService.authentication.isAuth) {
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
    authInterceptorService.$inject = ["$timeout", "$q", "$injector", "$location", "authConfig"];

    angular.module('sds-angular-jwt').factory('authInterceptorService',authInterceptorService);

})();

(function (){
    'use strict';

    function AuthConfigProvider (){
        var self = this;

        self.onLoadStart = function (){};
        self.onLoadEnd = function (){};
        self.formatAuthData = function (data){ return data; };
        self.formatLoginParams = function (email, password){ return {email: email, password: password};};

        self.permissionLookup = function(permission, user, params) {
            if (!user || !user.roles){
                return false;
            }
            if(user.su){
                return true;
            }
            var idx = user.roles
                .map(function (r){return r.tenant_id; })
                .indexOf(parseInt(params.tenantId));

            if (idx === -1){
                return false;
            }
            return user.roles[idx] && user.roles[idx].permissions.access[permission];
        };

        self.tokenUrl = '/api/auth';
        self.refreshUrl = '/api/auth/refresh';
        self.loginUrl = '/login';
        self.notFoundUrl = null;
        self.localization = {
            errorTitle: 'There seems to be a problem',
            errorEmail: 'A valid email address is required',
            errorPassword: 'Password is required',
            errorPasswordMatch: 'Passwords must match',
            errorConfirm: 'Confirm Password is required',
            errorForgotPassword: 'Error sending reset request. Please contact support.',
            errorLogin: 'Could not validate your login credentials. Please try again.',
            errorLoginRejected: 'Your email or password is invalid. Please try again.',
            errorRegister: 'Error submitting registration. Please contact support.',
            errorResetPassword: 'Error resetting password. Please contact support.',
            successForgotPasswordTitle: 'Request Received',
            successForgotPassword: 'An email will be sent to you with instructions to reset your password.',
            successRegisterTitle: 'Registration Successful',
            successRegister: 'A confirmation email has been sent to your email address.',
            successResetPasswordTitle: 'Password Change Successful',
            successResetPassword: 'Your password has been reset.',
            forgotPasswordText: 'Enter your email address and we will send you a link to reset your password.',
            loginPage: 'Return to login page',
            submit: 'Submit',
            login: 'Login',
            email: 'Email Address',
            password: 'Password',
            confirm: 'Confirm Password'

        };

        self.$get = function AuthConfig () {
            return {
                onLoadStart: self.onLoadStart,
                onLoadEnd: self.onLoadEnd,
                permissionLookup: self.permissionLookup,
                formatLoginParams: self.formatLoginParams,
                formatAuthData: self.formatAuthData,
                tokenUrl: self.tokenUrl,
                refreshUrl: self.refreshUrl,
                loginUrl: self.loginUrl,
                notFoundUrl: self.notFoundUrl,
                localization: self.localization
            };
        };

        self.setFormatLoginParams = function (obj){
            self.formatLoginParams = obj;
        };

        self.setFormatAuthData = function (obj){
            self.formatAuthData = obj;
        };

        self.setRoutes = function (obj){
            self.tokenUrl = obj.tokenUrl || self.tokenUrl;
            self.refreshUrl = obj.refreshUrl || self.refreshUrl;
            self.loginUrl = obj.loginUrl || self.loginUrl;
            self.notFoundUrl = obj.notFoundUrl || self.notFoundUrl;
        };

        self.setLocalization = function (obj){
            angular.extend(self.localization, obj);
        };


        self.setOnLoadStart = function (fn){
            if(typeof fn === "function"){
                self.onLoadStart = fn;
            }else{
                throw new Error('Parameter must be a function');
            }
        };

        self.setOnLoadEnd = function (fn){
            if(typeof fn === "function"){
                self.onLoadEnd = fn;
            }else{
                throw new Error('Parameter must be a function');
            }
        };
        self.setPermissionLookup = function (fn){
            if(typeof fn === "function"){
                self.permissionLookup = fn;
            }else{
                throw new Error('Parameter must be a function');
            }
        };

        self.setLoginUrl = function (url){
            self.loginUrl = url;
        };

        self.setNotFoundUrl = function (url){
            self.notFoundUrl = url;
        };

        self.setRefreshUrl = function (url){
            self.refreshUrl = url;
        };

        self.setTokenUrl = function (url){
            self.tokenUrl = url;
        };

    }

    angular.module('sds-angular-jwt').provider('authConfig',AuthConfigProvider);

})();

(function (){
    'use strict';
    function authService($injector, $q, $log, $timeout, $rootScope, jwtHelper, $window, authConfig) {
        var self = {};

        var _clearLocalStorage = function(){
            self.authentication = {
                isAuth: false,
                data: {},
                useRefreshToken: null,
                token: null
            };

            $window.localStorage.removeItem('token');
        };

        var _processResponse = function(response){
            return $q(function(resolve, reject) {
                self.authentication.isAuth = true;
                self.authentication.token = response.token || response.access_token;
                self.authentication.useRefreshToken = response.refresh_token || null;
                var responseData = jwtHelper.decodeToken(self.authentication.token);


                try {
                    $window.localStorage.token = self.authentication.token;

                } catch (err) {
                    _clearLocalStorage();
                    return reject({message: 'This application does not support private browsing mode. Please turn off private browsing to log in.'});
                }

                $q
                    .when(authConfig.formatAuthData(responseData.data || responseData))
                    .then(function (data){


                        self.authentication.data = data;
                        $rootScope.$broadcast("auth:userUpdate");

                        return resolve(self.authentication);

                });

            });
        };

        self.authentication = {
            isAuth: false,
            data: {},
            useRefreshToken: null,
            token: null
        };

        self.login = function () {
            return $q
                .when(authConfig.formatLoginParams.apply(this, arguments))
                .then(function (formattedLoginData){
                    return $injector.get('$http').post(authConfig.tokenUrl, $.param(formattedLoginData), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
                })
                .then(function (response) {
                    //decode the token to get the data we need:
                    return _processResponse(response.data);
                });
        };

        //logOffUser optional parameter
        self.logOut = function (logOffUser) {
            var defer = $q.defer();
            $log.info('logging out');
            if(logOffUser === undefined){
                logOffUser = true;
            }
            if(self.authentication.userId) {
                self.deleteToken().then(function(){ //need to send in header
                    _clearLocalStorage();
                    if(logOffUser ) {
                        $rootScope.$broadcast("auth:userLogOff");
                        defer.resolve();
                    }
                });
            }else {
                $timeout(function (){
                    _clearLocalStorage();
                    if (logOffUser) {
                        $rootScope.$broadcast("auth:userLogOff");
                        defer.resolve();
                    }
                });
            }
            return defer.promise;
        };

        self.deleteToken = function(){
            var deleteTokenUri =  authConfig.tokenUrl + '/' + self.authentication.data.id;
            return $injector.get('$http').delete(deleteTokenUri);
        };

        self.allowed = function (permission, params){
            return authConfig.permissionLookup(permission, self.authentication.data, params);
        };

        self.is = self.allowed;

        self.refreshToken = function () {
            return $q(function(resolve, reject) {
                if ($window.localStorage.token) {
                    var authData = jwtHelper.decodeToken($window.localStorage.token);
                    if (authData && authData.useRefreshToken !== false) {
                        $window.localStorage.removeItem('token');

                        return $injector.get('$http').post(authConfig.refreshUrl)
                            .then(function (response) {
                                return _processResponse(response.data).then(function () {
                                    return resolve();
                                });
                            }, function (err) {
                                return self.logOut().then(function () {
                                    reject(err);
                                });
                            });
                    }
                }
                return resolve();
            });
        };

        self.fillAuthData = function () {
            if ($window.localStorage.token) {
                self.authentication.isAuth = true;
                self.authentication.token = $window.localStorage.token;

                var responseData = jwtHelper.decodeToken($window.localStorage.token);
                if(responseData.data){
                    self.authentication.data = responseData.data;
                }else{
                    self.authentication.data = responseData;
                }
            }
        };

        self.fillAuthData();

        return self;

    }
    authService.$inject = ["$injector", "$q", "$log", "$timeout", "$rootScope", "jwtHelper", "$window", "authConfig"];

    angular.module('sds-angular-jwt').factory('authService',authService);

})();

(function () {
    'use strict';
    function authForgotPasswordDirective ($q, $location, $timeout, $rootScope, authConfig) {
        return {
            restrict: 'EA',
            transclude: true,
            scope: {
                redirectUrl: "@",
                loginUrl: "@",
                onSubmit: '&'
            },
            templateUrl: 'sds-angular-jwt/directives/auth-forgot-password-directive.html',
            link: function ($scope, $element, $attrs) {
                var vm = {};

                vm.loc = authConfig.localization;
                vm.loginUrl = $scope.loginUrl || authConfig.loginUrl;
                vm.isLoginPage = $location.path() === vm.loginUrl;

                vm.success = false;
                vm.user = {
                    email: null
                };

                vm.submit = function (form){
                    vm.message = "";
                    if (form.$valid) {
                        $rootScope.$broadcast("auth:submitStart");
                        $q.when($scope.onSubmit()(vm.user)).then(function (){
                            $rootScope.$broadcast("auth:submitEnd");
                            vm.success = true;
                            if($scope.redirectUrl) {
                                $timeout(function (){
                                    $location.path($scope.redirectUrl);
                                },3000);
                            }
                        }, function (err) {
                            $rootScope.$broadcast("auth:submitEnd");
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
    authForgotPasswordDirective.$inject = ["$q", "$location", "$timeout", "$rootScope", "authConfig"];

    angular.module('sds-angular-jwt').directive('authForgotPassword', authForgotPasswordDirective);

})();


(function () {
    'use strict';
    function authLoginDirective ($location, $rootScope, authService, authConfig) {
        return {
            restrict: 'EA',
            transclude: true,
            scope: {
                // after logging in, redirect to specific page
                redirectUrl: "@",
                // or call a function
                onLogin: '&?'
            },
            templateUrl: 'sds-angular-jwt/directives/auth-login-directive.html',
            link: function ($scope, $element, $attrs) {
                var vm = {};

                vm.loc = authConfig.localization;

                vm.user = {
                    email: null,
                    password: null
                };

                vm.submit = function (form){
                    vm.message = "";
                    if (form.$valid) {
                        $rootScope.$broadcast("auth:submitStart");
                        authService.login(vm.user.email, vm.user.password).then(function () {
                            $rootScope.$broadcast("auth:submitEnd");
                            if (authService.authentication.data) {
                                if (typeof $scope.onLogin === 'function') {
                                    $scope.onLogin()(authService.authentication.data);
                                }else {
                                    $location.path($scope.redirectUrl);
                                }
                            }else{
                                vm.message = vm.loc.errorLogin;
                            }
                        }, function (err) {
                            $rootScope.$broadcast("auth:submitEnd");
                            if(err.data && err.data.message){
                                vm.message = err.data.message;
                            }else {
                                vm.message = vm.loc.errorLoginRejected;
                            }
                        });
                    }
                };


                $scope.vm = vm;
            }
        };
    }
    authLoginDirective.$inject = ["$location", "$rootScope", "authService", "authConfig"];

    angular.module('sds-angular-jwt').directive('authLogin', authLoginDirective);

})();


(function () {
    'use strict';
    function authRegisterDirective ($q, $timeout, $location, $rootScope, authService, authConfig) {
        return {
            restrict: 'EA',
            transclude: true,
            scope: {
                redirectUrl: "@",
                loginUrl: "@",
                onSubmit: '&'
            },
            templateUrl: 'sds-angular-jwt/directives/auth-register-directive.html',
            link: function ($scope, $element, $attrs) {
                var vm = {};

                vm.loc = authConfig.localization;
                vm.loginUrl = $scope.loginUrl || authConfig.loginUrl;
                vm.isLoginPage = $location.path() === vm.loginUrl;

                vm.user = {
                    email: null,
                    password: null
                };

                vm.submit = function (form){
                    vm.message = "";
                    if (form.$valid) {

                        for(var key in form) {
                            if(form.hasOwnProperty(key) && key[0] !== '$') {
                                vm.user[key] = form[key].$modelValue;
                            }
                        }

                        $rootScope.$broadcast("auth:submitStart");
                        $q.when($scope.onSubmit()(vm.user)).then(function (){
                            if (!authService.authentication.isAuth){
                                return authService.login(vm.user.email, vm.user.password).then(function () {
                                    vm.success = true;
                                    if($scope.redirectUrl) {
                                        $location.path($scope.redirectUrl);
                                    }
                                });
                            }

                            vm.success = true;
                            if($scope.redirectUrl) {
                                $timeout(function (){
                                    $location.path($scope.redirectUrl);
                                },3000);
                            }
                        }).then(
                            function (){
                                $rootScope.$broadcast("auth:submitStart");
                            },
                            function (err) {
                                $rootScope.$broadcast("auth:submitEnd");
                                if(err.data && err.data.message) {
                                    vm.message = err.data.message;
                                }else if(err.message) {
                                    vm.message = err.message;
                                }else {
                                    vm.message = vm.loc.errorRegister;
                                }
                            }
                        );
                    }
                };


                $scope.vm = vm;
            }
        };
    }
    authRegisterDirective.$inject = ["$q", "$timeout", "$location", "$rootScope", "authService", "authConfig"];

    angular.module('sds-angular-jwt').directive('authRegister', authRegisterDirective);

})();


(function () {
    'use strict';
    function authResetPasswordDirective ($q, $location, $timeout, $rootScope, authConfig) {
        return {
            restrict: 'EA',
            transclude: true,
            scope: {
                redirectUrl: "@",
                loginUrl: "@",
                onSubmit: '&',
                token: '='
            },
            templateUrl: 'sds-angular-jwt/directives/auth-reset-password-directive.html',
            link: function ($scope, $element, $attrs) {
                var vm = {};

                vm.loc = authConfig.localization;
                vm.loginUrl = $scope.loginUrl || authConfig.loginUrl;
                vm.isLoginPage = $location.path() === vm.loginUrl;

                vm.success = false;
                vm.user = {
                    password: null,
                    confirmPassword: null
                };

                vm.submit = function (form){
                    vm.message = "";
                    if (form.$valid) {
                        if (vm.user.password !== vm.user.confirmPassword){
                            vm.message = vm.loc.errorPasswordMatch;
                        }else {
                            var user = angular.copy(vm.user);
                            delete user.confirmPassword;
                            user.token = $scope.token;

                            $rootScope.$broadcast("auth:submitStart");
                            $q.when($scope.onSubmit()(user)).then(function () {
                                vm.success = true;
                                $rootScope.$broadcast("auth:submitEnd");
                                if($scope.redirectUrl) {
                                    $timeout(function (){
                                        $location.path($scope.redirectUrl);
                                    },3000);
                                }
                            }, function (err) {
                                $rootScope.$broadcast("auth:submitEnd");
                                if (err.data && err.data.message) {
                                    vm.message = err.data.message;
                                }else if(err.message) {
                                    vm.message = err.message;
                                } else {
                                    vm.message = vm.loc.errorResetPassword;
                                }
                            });
                        }
                    }
                };

                $scope.vm = vm;
            }
        };
    }
    authResetPasswordDirective.$inject = ["$q", "$location", "$timeout", "$rootScope", "authConfig"];

    angular.module('sds-angular-jwt').directive('authResetPassword', authResetPasswordDirective);

})();


angular.module('sds-angular-jwt').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('sds-angular-jwt/directives/auth-forgot-password-directive.html',
    "<form name=\"authForm\" ng-submit=\"vm.submit(authForm)\" novalidate> <div ng-if=\"!vm.success\"> <div class=\"alert alert-danger\" ng-if=\"vm.message || (authForm.$invalid && authForm.$submitted)\"> <h4><i class=\"icon fa fa-warning\"></i> {{vm.loc.errorTitle}}</h4> {{vm.message}} <div ng-show=\"authForm.email.$error.email || authForm.email.$error.required\" ng-bind=\"vm.loc.errorEmail\"></div> </div> <p ng-bind=\"vm.loc.forgotPasswordText\"></p> <div class=\"form-group\" ng-class=\"{ 'has-error': (authForm.email.$invalid && authForm.$submitted) }\"> <label class=\"control-label\" for=\"email\">{{vm.loc.email}} * </label> <input class=\"form-control\" type=\"email\" name=\"email\" id=\"email\" ng-model=\"vm.user.email\" required> </div> <button type=\"submit\" class=\"btn btn-primary pull-right\" ng-bind=\"vm.loc.submit\"></button> <ng-transclude></ng-transclude> </div> <div class=\"alert alert-success\" ng-if=\"vm.success\"> <h4><i class=\"icon fa fa-check\"></i> {{vm.loc.successForgotPasswordTitle}}</h4> <p ng-bind=\"vm.loc.successForgotPassword\"></p> <a ng-if=\"!vm.isLoginPage\" ng-href=\"{{vm.loginUrl}}\" ng-bind=\"vm.loc.loginPage\"></a> </div> </form>"
  );


  $templateCache.put('sds-angular-jwt/directives/auth-login-directive.html',
    "<form name=\"authForm\" ng-submit=\"vm.submit(authForm)\" novalidate> <div class=\"alert alert-danger\" ng-if=\"vm.message || (authForm.$invalid && authForm.$submitted)\"> <h4><i class=\"icon fa fa-warning\"></i> {{vm.loc.errorTitle}}</h4> {{vm.message}} <div ng-show=\"authForm.email.$error.email || authForm.email.$error.required\" ng-bind=\"vm.loc.errorEmail\"></div> <div ng-show=\"authForm.password.$error.required\" ng-bind=\"vm.loc.errorPassword\"></div> </div> <div class=\"form-group\" ng-class=\"{ 'has-error': (authForm.email.$invalid && authForm.$submitted) }\"> <label class=\"control-label\" for=\"email\">{{vm.loc.email}} * </label> <input class=\"form-control\" type=\"email\" name=\"email\" id=\"email\" ng-model=\"vm.user.email\" required> </div> <div class=\"form-group\" ng-class=\"{ 'has-error': (authForm.password.$invalid && authForm.$submitted) }\"> <label class=\"control-label\" for=\"password\">{{vm.loc.password}} *</label> <input class=\"form-control\" type=\"password\" name=\"password\" id=\"password\" ng-model=\"vm.user.password\" required> </div> <button type=\"submit\" class=\"btn btn-primary pull-right\" ng-bind=\"vm.loc.login\">Login</button> <ng-transclude></ng-transclude> </form>"
  );


  $templateCache.put('sds-angular-jwt/directives/auth-register-directive.html',
    "<form name=\"authForm\" ng-submit=\"vm.submit(authForm)\" novalidate> <div ng-if=\"!vm.success\"> <div class=\"alert alert-danger\" ng-if=\"vm.message || (authForm.$invalid && authForm.$submitted)\"> <h4><i class=\"icon fa fa-warning\"></i> {{vm.loc.errorTitle}}</h4> {{vm.message}} <div ng-show=\"authForm.email.$error.email || authForm.email.$error.required\" ng-bind=\"vm.loc.errorEmail\"></div> <div ng-show=\"authForm.password.$error.required\" ng-bind=\"vm.loc.errorPassword\"></div> </div> <div class=\"form-group\" ng-class=\"{ 'has-error': (authForm.email.$invalid && authForm.$submitted) }\"> <label class=\"control-label\" for=\"email\">{{vm.loc.email}} * </label> <input class=\"form-control\" type=\"email\" name=\"email\" id=\"email\" ng-model=\"vm.user.email\" required> </div> <div class=\"form-group\" ng-class=\"{ 'has-error': (authForm.password.$invalid && authForm.$submitted) }\"> <label class=\"control-label\" for=\"password\">{{vm.loc.password}} *</label> <input class=\"form-control\" type=\"password\" name=\"password\" id=\"password\" ng-model=\"vm.user.password\" required> </div> <ng-transclude></ng-transclude> <button type=\"submit\" class=\"btn btn-primary pull-right\" ng-bind=\"vm.loc.submit\"></button> </div> <div class=\"alert alert-success\" ng-if=\"vm.success\"> <h4><i class=\"icon fa fa-check\"></i> {{vm.loc.successRegisterTitle}}</h4> <p ng-bind=\"vm.loc.successRegister\"></p> <a ng-if=\"!vm.isLoginPage\" ng-href=\"{{vm.loginUrl}}\" ng-bind=\"vm.loc.loginPage\"></a> </div> </form>"
  );


  $templateCache.put('sds-angular-jwt/directives/auth-reset-password-directive.html',
    "<form name=\"authForm\" ng-submit=\"vm.submit(authForm)\" novalidate> <div ng-if=\"!vm.success\"> <div class=\"alert alert-danger\" ng-if=\"vm.message || (authForm.$invalid && authForm.$submitted)\"> <h4><i class=\"icon fa fa-warning\"></i> {{vm.loc.errorTitle}}</h4> {{vm.message}} <div ng-show=\"authForm.password.$error.required\" ng-bind=\"vm.loc.errorPassword\"></div> <div ng-show=\"authForm.confirmPassword.$error.required\" ng-bind=\"vm.loc.errorConfirm\"></div> </div> <div class=\"form-group\" ng-class=\"{ 'has-error': (authForm.password.$invalid && authForm.$submitted) }\"> <label class=\"control-label\" for=\"password\">{{vm.loc.password}} *</label> <input class=\"form-control\" type=\"password\" name=\"password\" id=\"password\" ng-model=\"vm.user.password\" required> </div> <div class=\"form-group\" ng-class=\"{ 'has-error': (authForm.password.$invalid && authForm.$submitted) }\"> <label class=\"control-label\" for=\"confirmPassword\">{{vm.loc.confirm}} *</label> <input class=\"form-control\" type=\"password\" name=\"confirmPassword\" id=\"confirmPassword\" ng-model=\"vm.user.confirmPassword\" required> </div> <button type=\"submit\" class=\"btn btn-primary pull-right\" ng-bind=\"vm.loc.submit\"></button> <ng-transclude></ng-transclude> </div> <div class=\"alert alert-success\" ng-if=\"vm.success\"> <h4><i class=\"icon fa fa-check\"></i> {{vm.loc.successResetPasswordTitle}}</h4> <p ng-bind=\"vm.loc.successResetPassword\"></p> <a ng-if=\"!vm.isLoginPage\" ng-href=\"{{vm.loginUrl}}\" ng-bind=\"vm.loc.loginPage\"></a> </div> </form>"
  );

}]);
