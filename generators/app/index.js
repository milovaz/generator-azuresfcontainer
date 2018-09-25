'use strict';

var path      = require('path')
  , generators    = require('yeoman-generator')
  , yosay     = require('yosay');
var GuestGenerator = generators.Base.extend({
  constructor: function () {
    generators.Base.apply(this, arguments);

    this.desc('Generate Service Fabric container application template');
  },

  prompting: function () {
    var done = this.async();

    this.log(yosay(
        'Welcome to Service Fabric Container application generator'
    ));
    

    var prompts = [{
      type: 'input', 
      name: 'projName',
      message: 'Name your microservice',
      default: this.config.get('projName'),
      validate: function (input) {
        return input ? true : false;
      }
    }];

    this.prompt(prompts, function (props) {
      this.props = props;
      this.props.projName = this.props.projName.trim();
      this.props.baseInfraPath = 'infra';
      this.config.set(props);

      done();
    }.bind(this));
  },

  writing: function() {
    var isAddNewService = false;
    var includeScripts = false;
    this.composeWith('sfmicroservice:guestcontainer', {
            options: { isAddNewService: isAddNewService, 
                       serviceName: this.props.projName + 'Service',
                       includeScripts: includeScripts }
    });
  },
  
  end: function () {
    this.config.save();
    //this is for Add Service
    var nodeFs = require('fs');
    if (nodeFs.statSync(path.join(this.destinationRoot(), '.yo-rc.json')).isFile()) {
        nodeFs.createReadStream(path.join(this.destinationRoot(), '.yo-rc.json')).pipe(nodeFs.createWriteStream(path.join(this.destinationRoot(), this.props.baseInfraPath, '.yo-rc.json')));
    }

  }
});

module.exports = GuestGenerator;

