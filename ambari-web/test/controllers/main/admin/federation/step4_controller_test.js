/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var App = require('app');

describe('App.NameNodeFederationWizardStep4Controller', function () {
  var controller;
  var mocks = [
    {component: 'NAMENODE', isInstalled: false, hostName: 'test1'},
    {component: 'NAMENODE', isInstalled: false, hostName: 'test2'},
    {component: 'NAMENODE', isInstalled: true, hostName: 'test3'},
    {component: 'TEST', isInstalled: false, hostName: 'test4'}
  ];
  beforeEach(function () {
    controller = App.NameNodeFederationWizardStep4Controller.create();
  });

  after(function () {
    controller.destroy();
  });

  describe('#newNameNodeHosts', function () {
    it('Should filter in NAMENODE and not installed hosts and map them to their names', function () {
      controller.set('content.masterComponentHosts', mocks);
      expect(controller.get('newNameNodeHosts')).to.be.eql(['test1', 'test2']);
    });
  });

  describe('#reconfigureServices', function () {
    var defautBody, aditionalBody;
    beforeEach(function () {
      controller.set('content.serviceConfigProperties', {items: []});
      defaultBody = {
        Clusters: {
          desired_config: controller.reconfigureSites(['hdfs-site'], {items: []}, Em.I18n.t('admin.nameNodeFederation.wizard,step4.save.configuration.note'))
        }
      };
      aditionalBody = {
        Clusters: {
          desired_config: controller.reconfigureSites(['ranger-tagsync-site'], {items: []}, Em.I18n.t('admin.nameNodeFederation.wizard,step4.save.configuration.note'))
        }
      };
    });

    afterEach(function () {
      App.Service.find.restore();
    });

    it('should send request with default data when RANGER is not installed', function () {
      sinon.stub(App.Service, 'find').returns([{serviceName: 'HIVE'}]);
      controller.reconfigureServices();
      expect(App.ajax.send.calledWith({
        name: 'common.service.multiConfigurations',
        sender: controller,
        data: {
          configs: [defaultBody]
        },
        error: 'onTaskError',
        success: 'installHDFSClients'
      }));
    });

    it('should send request with default and custom data when RANGER is installed', function () {
      sinon.stub(App.Service, 'find').returns([{serviceName: 'HIVE'}]);
      controller.reconfigureServices();
      expect(App.ajax.send.calledWith({
        name: 'common.service.multiConfigurations',
        sender: controller,
        data: {
          configs: [defaultBody, aditionalBody]
        },
        error: 'onTaskError',
        success: 'installHDFSClients'
      }));
    });
  });

  describe('#installHDFSClients', function () {
    it('should call createInstallComponentTask with proper params', function () {
      sinon.stub(controller, 'createInstallComponentTask');
      sinon.stub(App.HostComponent, 'find').returns([
        {componentName: 'JOURNALNODE', hostName: 'test5'},
        {componentName: 'TEST', hostName: 'test6'},
      ]);
      controller.set('content.masterComponentHosts', mocks);
      controller.installHDFSClients();
      expect(controller.createInstallComponentTask.calledWith(
        'HDFS_CLIENT',
        ['test1', 'test2', 'test3', 'test5'],
        'HDFS'
      )).to.be.true;
      controller.createInstallComponentTask.restore();
      App.HostComponent.find.restore();
    });
  });

  describe('#formatNameNode', function () {
    it('should send ajax request with first of newNameNodeHosts', function () {
      controller.set('content.masterComponentHosts', mocks);
      controller.formatNameNode();
      expect(App.ajax.send.calledWith({
        name: 'nameNode.federation.formatNameNode',
        sender: controller,
        data: {
          host: 'test1'
        },
        success: 'startPolling',
        error: 'onTaskError'
      })).to.be.true;
    });
  });

  describe('#formatZKFC', function () {
    it('should send ajax request with first of newNameNodeHosts', function () {
      controller.set('content.masterComponentHosts', mocks);
      controller.formatZKFC();
      expect(App.ajax.send.calledWith({
        name: 'nameNode.federation.formatZKFC',
        sender: controller,
        data: {
          host: 'test1'
        },
        success: 'startPolling',
        error: 'onTaskError'
      })).to.be.true;
    });
  });

  describe('#bootstrapNameNode', function () {
    it('should send ajax request with second of newNameNodeHosts', function () {
      controller.set('content.masterComponentHosts', mocks);
      controller.bootstrapNameNode();
      expect(App.ajax.send.calledWith({
        name: 'nameNode.federation.bootstrapNameNode',
        sender: controller,
        data: {
          host: 'test2'
        },
        success: 'startPolling',
        error: 'onTaskError'
      })).to.be.true;
    });
  });

  describe('#refreshDataNodes', function () {
    it('should send ajax request to refresh all DataNodes', function () {
      sinon.stub(App.HostComponent, 'find').returns([
        {componentName: 'DATANODE', hostName: 'test5'},
        {componentName: 'DATANODE', hostName: 'test6'},
        {componentName: 'TEST', hostName: 'test7'},
      ]);
      controller.refreshDataNodes();
      expect(App.ajax.send.calledWith({
        name: 'nameNode.federation.refreshDataNodes',
        sender: controller,
        data: {
          hosts: 'test5,test6'
        },
        success: 'startPolling',
        error: 'onTaskError'
      })).to.be.true;
      App.HostComponent.find.restore();
    });
  });
});
