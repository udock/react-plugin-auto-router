"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var path = require("path");
var generator_1 = __importDefault(require("@udock/react-plugin-auto-router/lib/generator"));
var FRAMEWORK_NAMESPACE = 'udock';
module.exports = function udockBootstrapLoader(content, map) {
    var configPath = path.resolve("./src/" + FRAMEWORK_NAMESPACE + ".config.js");
    delete require.cache[configPath];
    this.addDependency(configPath);
    var autoRouterConfig = {
        debug: false,
        ignore: 'ar.ignore',
        path: 'src',
        'chunk-name': [
            '2'
        ]
    };
    try {
        var config = require(configPath);
        autoRouterConfig = config.plugins['auto-router'];
    }
    catch (e) {
        console.log('\nframework config error:');
        this.callback(e);
        return;
    }
    return generator_1.default(this, autoRouterConfig).then(function (result) {
        if (autoRouterConfig.debug) {
            setTimeout(function () {
                console.log('======== auto-router =========');
                console.log(result.define);
                console.log('======== =========== =========');
            }, 1000);
        }
        return result.define;
    });
};
