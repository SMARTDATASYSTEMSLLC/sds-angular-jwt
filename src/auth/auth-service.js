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
            self.authentication.isAuth = true;
            self.authentication.token = response.token || response.access_token;
            self.authentication.useRefreshToken = response.refresh_token || null;
            var responseData = jwtHelper.decodeToken(self.authentication.token);


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

        var _fillAuthData = function () {
            if ($window.localStorage.getItem('token')) {
                if ($window.localStorage.getItem('authData')) {
                    // fill in the last know authdata from localstorage for page reload use cases - this will get blown away when the response promise resolves
                    try {
                        self.authentication.data = JSON.parse($window.atob($window.localStorage.getItem('authData')));
                    }catch(err){
                        $window.localStorage.removeItem('authData');
                    }
                }
                _processResponse({token: $window.localStorage.getItem('token'), useRefreshToken: $window.localStorage.getItem('useRefreshToken')});
            }
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

        _fillAuthData();

        return self;

    }

    angular.module('sds-angular-jwt').factory('authService',authService);

})();
