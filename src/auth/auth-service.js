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
                self.authentication.data = jwtHelper.decodeToken(self.authentication.token);

                $rootScope.$broadcast("auth:userUpdate");
                try {
                    $window.localStorage.token = self.authentication.token;
                    return resolve(self.authentication);
                } catch (err) {
                    _clearLocalStorage();
                    return reject({message: 'This application does not support private browsing mode. Please turn off private browsing to log in.'});
                }
            });
        };

        self.authentication = {
            isAuth: false,
            data: {},
            useRefreshToken: null,
            token: null
        };

        self.login = function (loginData) {
            return $injector.get('$http').post(authConfig.tokenUrl, $.param(authConfig.formatLoginParams(loginData)), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
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
                self.authentication.data = jwtHelper.decodeToken($window.localStorage.token);
            }
        };

        self.fillAuthData();

        return self;

    }

    angular.module('sds-angular-jwt').factory('authService',authService);

})();
