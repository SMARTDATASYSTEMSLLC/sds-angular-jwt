/*! 
 * sds-angular-jwt
 * Angular JWT framework
 * @version 0.6.7 
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
    }]);

})();

(function (){
    'use strict';
    authInterceptorService.$inject = ["$timeout", "$q", "$injector", "$location", "authConfig"];
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
            newPassword: 'New Password',
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
    authService.$inject = ["$injector", "$q", "$log", "$timeout", "$rootScope", "jwtHelper", "$window", "authConfig"];
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
            $window.localStorage.removeItem('authData');
        };

        var _processResponse = function(response){
            self.authentication.isAuth = true;
            self.authentication.token = response.token || response.access_token;
            self.authentication.useRefreshToken = response.refresh_token || null;
            var responseData = jwtHelper.decodeToken(self.authentication.token);
            self.authentication.expiration = responseData.exp;

            if (self.isExpired()){
                _clearLocalStorage();
                return $q.reject({message: 'The token is expired'});
            }

            try {
                $window.localStorage.setItem('token', self.authentication.token);
                $window.localStorage.setItem('useRefreshToken', self.authentication.useRefreshToken);

            } catch (err) {
                _clearLocalStorage();
                return $q.reject({message: 'This application does not support private browsing mode. Please turn off private browsing to log in.'});
            }

            return $q.when(authConfig.formatAuthData(responseData.data || responseData)).then(function (data){
                self.authentication.data = data;

                $window.localStorage.setItem('authData', $window.btoa(JSON.stringify(self.authentication.data)));
                $rootScope.$broadcast("auth:userUpdate");

                return self.authentication;
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
                    }
                    defer.resolve();
                });
            }else {
                $timeout(function (){
                    _clearLocalStorage();
                    if (logOffUser) {
                        $rootScope.$broadcast("auth:userLogOff");
                    }
                    defer.resolve();
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

        self.isExpired = function (){
            if (self.authentication.isAuth && (!self.authentication.expiration || self.authentication.expiration > Date.now())){
                return false;
            }else{
                return true;
            }
        };

        self.refreshToken = function () {
            return $q(function(resolve, reject) {
                if ($window.localStorage.getItem('token')) {
                    var authData = jwtHelper.decodeToken($window.localStorage.getItem('token'));
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
            if ($window.localStorage.getItem('token')) {
                if ($window.localStorage.getItem('authData')) {
                    // fill in the last know authdata from localstorage for page reload use cases - this will get blown away when the response promise resolves
                    try {
                        self.authentication.data = JSON.parse($window.atob($window.localStorage.getItem('authData')));
                    }catch(err){
                        $window.localStorage.removeItem('authData');
                    }
                }
                return _processResponse({token: $window.localStorage.getItem('token'), useRefreshToken: $window.localStorage.getItem('useRefreshToken')});
            }

            return $q.when(self.authentication);
        };

        self.fillAuthData();

        return self;

    }

    angular.module('sds-angular-jwt').factory('authService',authService);

})();

(function () {
    'use strict';
    AuthForgotPasswordComponent.$inject = ["$q", "$location", "$timeout", "$rootScope", "authConfig"];
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


(function () {
    'use strict';
    AuthLoginComponent.$inject = ["$location", "$rootScope", "authService", "authConfig"];
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


(function () {
    'use strict';
    AuthRegisterComponent.$inject = ["$q", "$timeout", "$location", "$rootScope", "authService", "authConfig"];
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


(function () {
    'use strict';
    AuthResetPasswordComponent.$inject = ["$q", "$location", "$timeout", "$rootScope", "authConfig"];
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


angular.module('sds-angular-jwt').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('sds-angular-jwt/directives/auth-forgot-password-component.html',
    "<form name=\"authForm\" ng-submit=\"$ctrl.submit(authForm)\" novalidate> <div ng-if=\"!$ctrl.success\"> <div class=\"alert alert-danger\" ng-if=\"$ctrl.message || (authForm.$invalid && authForm.$submitted)\"> <h4><i class=\"icon fa fa-warning\"></i> {{$ctrl.loc.errorTitle}}</h4> {{$ctrl.message}} <div ng-show=\"authForm.email.$error.email || authForm.email.$error.required\" ng-bind=\"$ctrl.loc.errorEmail\"></div> </div> <p ng-bind=\"$ctrl.loc.forgotPasswordText\"></p> <div class=\"form-group\" ng-class=\"{ 'has-error': (authForm.email.$invalid && authForm.$submitted) }\"> <label class=\"control-label\" for=\"email\">{{$ctrl.loc.email}} * </label> <input class=\"form-control\" type=\"email\" name=\"email\" id=\"email\" ng-model=\"$ctrl.user.email\" required> </div> <button type=\"submit\" class=\"btn btn-primary pull-right\" ng-bind=\"$ctrl.loc.submit\"></button> <ng-transclude></ng-transclude> </div> <div class=\"alert alert-success\" ng-if=\"$ctrl.success\"> <h4><i class=\"icon fa fa-check\"></i> {{$ctrl.loc.successForgotPasswordTitle}}</h4> <p ng-bind=\"$ctrl.loc.successForgotPassword\"></p> <a ng-if=\"!$ctrl.isLoginPage\" ng-href=\"{{$ctrl.loginUrl}}\" ng-bind=\"$ctrl.loc.loginPage\"></a> </div> </form> "
  );


  $templateCache.put('sds-angular-jwt/directives/auth-login-component.html',
    "<form name=\"authForm\" ng-submit=\"$ctrl.submit(authForm)\" novalidate> <div class=\"alert alert-danger\" ng-if=\"$ctrl.message || (authForm.$invalid && authForm.$submitted)\"> <h4><i class=\"icon fa fa-warning\"></i> {{$ctrl.loc.errorTitle}}</h4> {{$ctrl.message}} <div ng-show=\"authForm.email.$error.email || authForm.email.$error.required\" ng-bind=\"$ctrl.loc.errorEmail\"></div> <div ng-show=\"authForm.password.$error.required\" ng-bind=\"$ctrl.loc.errorPassword\"></div> </div> <div class=\"form-group\" ng-class=\"{ 'has-error': (authForm.email.$invalid && authForm.$submitted) }\"> <label class=\"control-label\" for=\"email\">{{$ctrl.loc.email}} * </label> <input class=\"form-control\" type=\"email\" name=\"email\" id=\"email\" ng-model=\"$ctrl.user.email\" required> </div> <div class=\"form-group\" ng-class=\"{ 'has-error': (authForm.password.$invalid && authForm.$submitted) }\"> <label class=\"control-label\" for=\"password\">{{$ctrl.loc.password}} *</label> <input class=\"form-control\" type=\"password\" name=\"password\" id=\"password\" ng-model=\"$ctrl.user.password\" required> </div> <button type=\"submit\" class=\"btn btn-primary pull-right\" ng-bind=\"$ctrl.loc.login\">Login</button> <ng-transclude></ng-transclude> </form> "
  );


  $templateCache.put('sds-angular-jwt/directives/auth-register-component.html',
    "<form name=\"authForm\" ng-submit=\"$ctrl.submit(authForm)\" novalidate> <div ng-if=\"!$ctrl.success\"> <div class=\"alert alert-danger\" ng-if=\"$ctrl.message || (authForm.$invalid && authForm.$submitted)\"> <h4><i class=\"icon fa fa-warning\"></i> {{$ctrl.loc.errorTitle}}</h4> {{$ctrl.message}} <div ng-show=\"authForm.email.$error.email || authForm.email.$error.required\" ng-bind=\"$ctrl.loc.errorEmail\"></div> <div ng-show=\"authForm.password.$error.required\" ng-bind=\"$ctrl.loc.errorPassword\"></div> </div> <div class=\"form-group\" ng-class=\"{ 'has-error': (authForm.email.$invalid && authForm.$submitted) }\"> <label class=\"control-label\" for=\"email\">{{$ctrl.loc.email}} * </label> <input class=\"form-control\" type=\"email\" name=\"email\" id=\"email\" ng-model=\"$ctrl.user.email\" required> </div> <div class=\"form-group\" ng-class=\"{ 'has-error': (authForm.password.$invalid && authForm.$submitted) }\"> <label class=\"control-label\" for=\"password\">{{$ctrl.loc.password}} *</label> <input class=\"form-control\" type=\"password\" name=\"password\" id=\"password\" ng-model=\"$ctrl.user.password\" required> </div> <ng-transclude></ng-transclude> <button type=\"submit\" class=\"btn btn-primary pull-right\" ng-bind=\"$ctrl.loc.submit\"></button> </div> <div class=\"alert alert-success\" ng-if=\"$ctrl.success\"> <h4><i class=\"icon fa fa-check\"></i> {{$ctrl.loc.successRegisterTitle}}</h4> <p ng-bind=\"$ctrl.loc.successRegister\"></p> <a ng-if=\"!$ctrl.isLoginPage\" ng-href=\"{{$ctrl.loginUrl}}\" ng-bind=\"$ctrl.loc.loginPage\"></a> </div> </form> "
  );


  $templateCache.put('sds-angular-jwt/directives/auth-reset-password-component.html',
    "<form name=\"authForm\" ng-submit=\"$ctrl.submit(authForm)\" novalidate> <div ng-if=\"!$ctrl.success\"> <div class=\"alert alert-danger\" ng-if=\"$ctrl.message || (authForm.$invalid && authForm.$submitted)\"> <h4><i class=\"icon fa fa-warning\"></i> {{$ctrl.loc.errorTitle}}</h4> {{$ctrl.message}} <div ng-show=\"authForm.password.$error.required\" ng-bind=\"$ctrl.loc.errorPassword\"></div> <div ng-show=\"authForm.confirmPassword.$error.required\" ng-bind=\"$ctrl.loc.errorConfirm\"></div> </div> <ng-transclude></ng-transclude> <div class=\"form-group\" ng-class=\"{ 'has-error': (authForm.password.$invalid && authForm.$submitted) }\"> <label class=\"control-label\" for=\"password\">{{$ctrl.loc.newPassword}} *</label> <input class=\"form-control\" type=\"password\" name=\"password\" id=\"password\" ng-model=\"$ctrl.user.password\" required> </div> <div class=\"form-group\" ng-class=\"{ 'has-error': (authForm.password.$invalid && authForm.$submitted) }\"> <label class=\"control-label\" for=\"confirmPassword\">{{$ctrl.loc.confirm}} *</label> <input class=\"form-control\" type=\"password\" name=\"confirmPassword\" id=\"confirmPassword\" ng-model=\"$ctrl.user.confirmPassword\" required> </div> <button type=\"submit\" class=\"btn btn-primary pull-right\" ng-bind=\"$ctrl.loc.submit\"></button> </div> <div class=\"alert alert-success\" ng-if=\"$ctrl.success\"> <h4><i class=\"icon fa fa-check\"></i> {{$ctrl.loc.successResetPasswordTitle}}</h4> <p ng-bind=\"$ctrl.loc.successResetPassword\"></p> <a ng-if=\"!$ctrl.isLoginPage\" ng-href=\"{{$ctrl.loginUrl}}\" ng-bind=\"$ctrl.loc.loginPage\"></a> </div> </form> "
  );

}]);
