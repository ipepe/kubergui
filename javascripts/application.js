window.app = new Vue({
    el: '#app',
    data: {
        DockerImageName: '',
        ContainerCommand: '',
        ContainerArgs: '',
        DeploymentNameOverride: '',
        ContainerNameOverride: '',
        AppLabelOverride: '',
        ServiceNameOverride: '',
        Replicas: '1',
        ServiceType: 'LoadBalancer',
        Ports: []
    },
    computed: {
        DockerImageNameNoTag: function() {
            var imageName = this.DockerImageName;

            if (imageName.lastIndexOf('/') >= 0) {
                imageName = imageName.substr(imageName.lastIndexOf('/')+1, imageName.length-1);
            }

            if (imageName.indexOf(':') >= 0) {
                imageName = imageName.substr(0, imageName.indexOf(':'));
            }

            return imageName;
        },
        DeploymentName: function() {
            if (this.DeploymentNameOverride.length > 0) {
                return this.DeploymentNameOverride;
            }
            return this.DockerImageNameNoTag;
        },
        ContainerName: function() {
            if (this.ContainerNameOverride.length > 0) {
                return this.ContainerNameOverride;
            }
            return this.DockerImageNameNoTag;
        },
        AppLabel: function() {
            if (this.AppLabelOverride.length > 0) {
                return this.AppLabelOverride;
            }
            return this.DockerImageNameNoTag;
        },
        ServiceName: function() {
            if (this.ServiceNameOverride.length > 0) {
                return this.ServiceNameOverride;
            }

            if (this.DeploymentName.length === 0) {
                return "unnamed-service";
            }

            return this.DeploymentName + "-service";
        },
        ServicePorts: function() {
            var portsWithServices = this.Ports.filter(function( port ) {
                return port.ExposeViaService === true;
            });
            return portsWithServices;
        },
        HasOneOrMoreServicePorts: function() {
            return (this.ServicePorts.length > 0);
        },
        DeploymentYaml: function() {
            var containerPorts = [];
            for (var i = 0; i < this.Ports.length; i++) {
                var portString = this.Ports[i].ContainerPort;
                if ((portString%1)===0) {
                    containerPorts.push({
                        'containerPort': parseInt(portString)
                    });
                }
            }
            var deploymentObj = {
                'apiVersion': 'extensions/v1beta1',
                'kind': 'Deployment',
                'metadata': {
                    'name': this.DeploymentName
                },
                'spec': {
                    'replicas': parseInt(this.Replicas),
                    'template': {
                        'metadata': {
                            'labels': {
                                'app': this.AppLabel
                            } // end labels
                        }, // end metadata
                        'spec': {
                            'containers': [{
                                'name': this.ContainerName,
                                'image': this.DockerImageName,
                                'ports': containerPorts
                            }]
                        } // end spec
                    } // end template
                } // end spec
            } // end deploymentObj

            if (this.ContainerCommand.length > 0) {
                deploymentObj.spec.template.spec.containers[0].command = [this.ContainerCommand];
            }

            if (this.ContainerArgs.length > 0) {
                deploymentObj.spec.template.spec.containers[0].args = [this.ContainerArgs];
            }

            return jsyaml.dump(deploymentObj);
        },
        ServiceYaml: function() {
            if (this.ServicePorts.length === 0){
                return '';
            }
            var ports = [];
            for (var i = 0; i < this.ServicePorts.length; i++) {
                var port = this.ServicePorts[i];
                var servicePortObj = {
                    'port': parseInt(port.ServicePort),
                    'targetPort': parseInt(port.ContainerPort),
                    'protocol': port.ServicePortProtocol
                };
                if (port.ServicePortName.length > 0) {
                    servicePortObj.name = port.ServicePortName;
                }
                ports.push(servicePortObj);
            }

            var serviceObj = {
                'apiVersion': 'v1',
                'kind': 'Service',
                'metadata': {
                    'name': this.ServiceName,
                    'labels': {
                        'name': this.ServiceName
                    } // end labels
                },
                'spec': {
                    'ports': ports,
                    'selector': {
                        'app': this.AppLabel
                    },
                    'type': this.ServiceType
                } // end spec
            } // end deploymentObj
            return "\n---\n" + jsyaml.dump(serviceObj);
        }
    },
    methods: {
        addPort: function() {
            var newPort = {
                ContainerPort: '80',
                ExposeViaService: false,
                ServicePortName: '',
                ServicePort: '80',
                ServicePortProtocol: 'TCP'
            };

            this.Ports.push(newPort);
        },
        deletePort: function(port) {
            var portIndex = this.Ports.indexOf(port);
            if (portIndex > -1) {
                this.Ports.splice(portIndex, 1);
            }
        }
    }
});