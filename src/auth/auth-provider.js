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
