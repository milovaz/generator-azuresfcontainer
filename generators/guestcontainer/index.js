'use strict';

var generators = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var path   = require('path');

module.exports = generators.Base.extend({

    constructor: function () {

        generators.Base.apply(this, arguments);

        this.option('serviceName', { type: String, required: false });    
        this.option('imageName', { type: String, required: false });
        this.option('commands', { type: String, required: false });
        this.option('instanceCount', { type: Number, required: false }); 
        this.option('isAddNewService', { type: Boolean, required: true });
        this.isAddNewService = this.options.isAddNewService;
        this.includeScripts = this.options.includeScripts;

        this.generatorConfig = {};

    }, // constructor()

    _isOptionSet: function(name) {
        return this.options[name] !== undefined;
    },

    /**
    * Prompt users for options
    */
    prompting: {

        askForService: function(){

            var done = this.async();
            var prompts = [

                {
                    name: 'serviceName',
                    message: 'Name of the application service:',
                    default: 'MyService',
                    when: !this._isOptionSet('serviceName')
                },

                {
                    name: 'imageName',
                    message: 'Input the Image Name:',
                    when: !this._isOptionSet('imageName')
                },

                {
                    name: 'commands',
                    message: 'Commands:',
                    when: !this._isOptionSet('commands')
                },

                {
                    name: 'instanceCount',
                    message: 'Number of instances of guest container application:',
                    default: '1',
                    when: !this._isOptionSet('instanceCount')
                },

                {
                    name: 'portMap',
                    message: 'Enter the container host mapping in the following format, container_port:host_port or press enter if not needed:',
                    when: !this._isOptionSet('portMap')
                }
            ];

            this.prompt(prompts, function(props) {
                this.props = props;
                this.props.serviceName = this.options.serviceName;
                done();
            }.bind(this)
            );

        } // askForService()

    }, // prompting()

    /**
    * Save configurations and configure the project
    */
    configuring: {


    }, // configuring()

    initializing: function () {
        this.props = this.config.getAll();
        this.projName = this.props.projName;
        this.baseInfraPath = this.props.baseInfraPath;
    }, // initializing()
    /**
    * Write the generator specific files
    */
   _assert: function(condition, message) {
        if(!condition){
            console.log(message)
            throw new Error();
        }
    },

    writing: {
        application: function() {

            var appPackagePath = path.join(this.baseInfraPath, this.projName);
            var servicePkgName = this.props.serviceName + 'Pkg';
            var serviceTypeName = this.props.serviceName + 'Type';
            var serviceName = this.props.serviceName;
            var appTypeName = this.projName + 'Type';
            var instanceCount = this.props.instanceCount;
            if (this.props.portMap != ""){
                var portMap = this.props.portMap.split(":");
                this._assert(portMap.length == 2, "Entered format is incorrect")
                var portMapContainer = portMap[0];
                var portMapHost = portMap[1];
                this._assert(!isNaN(portMapContainer), "The container port is not a number")
                this._assert(!isNaN(portMapHost), "The host port is not a number")
            }
            else {
                var portMapContainer = "";
                var portMapHost = "";
            }
            var serviceEndPointName = this.props.serviceName + 'Endpoint';

            if (this.isAddNewService) {
                var fs = require('fs');
                var xml2js = require('xml2js');
                var parser = new xml2js.Parser();

                fs.readFile(path.join(appPackagePath, 'ApplicationManifest.xml'), function(err, data) {
                    parser.parseString(data, function (err, result) {
                        if (err) {
                            return console.log(err);
                        }
                        if (portMapHost != "" && portMapContainer != ""){
                            result['ApplicationManifest']['ServiceManifestImport'][result['ApplicationManifest']['ServiceManifestImport'].length] =
                            {
                                "ServiceManifestRef":[{"$":{"ServiceManifestName":servicePkgName, "ServiceManifestVersion":"1.0.0"}}],
                                "Policies":[{"ContainerHostPolicies":[{"$":{"CodePackageRef":"Code"},"PortBinding":[{"$":{"ContainerPort": portMapContainer, "EndpointRef": serviceEndPointName}}]}]}]
                            }
                        result['ApplicationManifest']['DefaultServices'][0]['Service'][result['ApplicationManifest']['DefaultServices'][0]['Service'].length] =
                            {"$":{"Name":serviceName},"StatelessService":[{"$":{"ServiceTypeName":serviceTypeName,"InstanceCount":instanceCount},"SingletonPartition":[""]}]};
                        }
                        else{
                            result['ApplicationManifest']['ServiceManifestImport'][result['ApplicationManifest']['ServiceManifestImport'].length] =
                            {"ServiceManifestRef":[{"$":{"ServiceManifestName":servicePkgName, "ServiceManifestVersion":"1.0.0"}}]}
                        result['ApplicationManifest']['DefaultServices'][0]['Service'][result['ApplicationManifest']['DefaultServices'][0]['Service'].length] =
                            {"$":{"Name":serviceName},"StatelessService":[{"$":{"ServiceTypeName":serviceTypeName,"InstanceCount":instanceCount},"SingletonPartition":[""]}]};
                        }
                        var builder = new xml2js.Builder();
                        var xml = builder.buildObject(result);
                        fs.writeFile(path.join(appPackagePath, 'ApplicationManifest.xml'), xml, function(err) {
                            if(err) {
                                return console.log(err);
                            }
                        });
                    });
                });

            } else { 
                if (portMapHost != "" && portMapContainer != "" ){
                    this.fs.copyTpl(this.templatePath('ApplicationManifestWithPorts.xml'),
                    this.destinationPath(path.join(appPackagePath, '/ApplicationManifest.xml')),
                    {
                        appTypeName: appTypeName,
                        serviceName: serviceName,
                        serviceTypeName: serviceTypeName,
                        servicePkgName: servicePkgName,
                        instanceCount: instanceCount,
                        portMapContainer: portMapContainer,
                        serviceEndPointName: serviceEndPointName
                    }
                );
                }
                else {
                    this.fs.copyTpl(this.templatePath('ApplicationManifest.xml'),
                        this.destinationPath(path.join(appPackagePath, '/ApplicationManifest.xml')),
                        {
                            appTypeName: appTypeName,
                            serviceName: serviceName,
                            serviceTypeName: serviceTypeName,
                            servicePkgName: servicePkgName,
                            instanceCount: instanceCount
                        }
                    );       
                }
            }
        }, 

        service: function() {
            var servicePkg = this.props.serviceName + 'Pkg';
            var serviceTypeName = this.props.serviceName + 'Type';
            var appTypeName = this.projName + 'Type';
            var pkgDir = path.join(this.baseInfraPath, this.projName);
          
            var is_Windows = (process.platform == 'win32');

            var sdkScriptExtension;
    
            if (is_Windows)
            {
                sdkScriptExtension = '.ps1';
            }
            else {
                sdkScriptExtension = '.sh';
            }

            var portMapContainer = "";
            var portMapHost = "";
            if (this.props.portMap != ""){
                var portMap = this.props.portMap.split(":");
                this._assert(portMap.length == 2, "Entered format is incorrect")
                var portMapContainer = portMap[0];
                var portMapHost = portMap[1];
                this._assert(!isNaN(portMapContainer), "The container port is not a number")
                this._assert(!isNaN(portMapHost), "The host port is not a number")
            }
            var serviceEndPointName = this.props.serviceName + 'Endpoint';

            if (portMapHost != "" && portMapContainer != "" ){
                this.fs.copyTpl(  this.templatePath('Service/ServiceManifestWithPorts.xml'),
                this.destinationPath(path.join(pkgDir, servicePkg, '/ServiceManifest.xml')),
                {
                    serviceTypeName: serviceTypeName,
                    servicePkgName: servicePkg,
                    imageName: this.props.imageName,
                    commands: this.props.commands,
                    portMapHost: portMapHost,
                    serviceEndPointName: serviceEndPointName
                }
            ); 
            }
            else{
                this.fs.copyTpl(  this.templatePath('Service/ServiceManifest.xml'),
                this.destinationPath(path.join(pkgDir, servicePkg, '/ServiceManifest.xml')),
                {
                    serviceTypeName: serviceTypeName,
                    servicePkgName: servicePkg,
                    imageName: this.props.imageName,
                    commands: this.props.commands
                }
            ); 
            }
            this.fs.copyTpl(  this.templatePath('Service/Settings.xml'),
            this.destinationPath(path.join(pkgDir, servicePkg , '/config/Settings.xml')));
            if (!this.isAddNewService && this.includeScripts) {
                this.fs.copyTpl(
                    this.templatePath('deploy/install'+sdkScriptExtension),
                    this.destinationPath(path.join(this.baseInfraPath, 'install'+sdkScriptExtension)),
                    {
                        appPackage: this.projName,
                        appName: this.projName,
                        appTypeName: appTypeName
                    } 
                );

                this.fs.copyTpl(
                    this.templatePath('deploy/uninstall'+sdkScriptExtension),
                    this.destinationPath(path.join(this.baseInfraPath, 'uninstall'+sdkScriptExtension)),
                    {
                        appPackage: this.projName,
                        appName: this.projName,
                        appTypeName: appTypeName
                    }
                );
            }

        },

        jenkins: function() {
            var appPackagePath = path.join(this.baseInfraPath, this.projName);
            var applicationManifestPath = path.join(appPackagePath, '/ApplicationManifest.xml');
            var servicePkg = this.props.serviceName + 'Pkg';
            var pkgDir = path.join(this.baseInfraPath, this.projName);
            var serviceManifestPath = path.join(pkgDir, servicePkg, '/ServiceManifest.xml');
            /*this.fs.copyTpl(this.templatePath('Jenkinsfile'),
                            this.destinationPath(path.join('.', '/Jenkinsfile')),
                            {
                                serviceManifestPath: serviceManifestPath,
                                applicationManifestPath: applicationManifestPath
                            }
                           );
            */
            this.fs.copyTpl(this.templatePath('JenkinsfileCI'),
                            this.destinationPath(path.join(this.baseInfraPath, '/JenkinsfileCI')), {});
            this.fs.copyTpl(this.templatePath('JenkinsfileCD'),
                            this.destinationPath(path.join(this.baseInfraPath, '/JenkinsfileCD')), {});
        }

    } // writing()

});