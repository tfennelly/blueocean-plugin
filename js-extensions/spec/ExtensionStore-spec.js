var jsTest = require('@jenkins-cd/js-test');
var expect = require('chai').expect;
var ExtensionStore = require('../dist/ExtensionStore').ExtensionStore;
var ClassMetadataStore = require('../dist/ClassMetadataStore').instance;
var componentType = require('../dist/ComponentTypeFilter').componentType;
var javaScriptExtensionInfo = require('./javaScriptExtensionInfo-01.json');

// js modules calling console.debug
console.debug = function(msg) { console.log('DEBUG: ' + msg); };

// Mock the calls to import
var jsModules = require('@jenkins-cd/js-modules');
var theRealImport = jsModules.import;

var makeClassMetadataStore = function(fn) {
    ClassMetadataStore.init(fn);
    return ClassMetadataStore;
};

var mockDataLoad = function(extensionStore, out, componentMap) {
    out.plugins = {};
    out.loadCount = 0;
    
    jsModules.import = function(bundleId) {
        var ModuleSpec = require('@jenkins-cd/js-modules/js/ModuleSpec');
        var bundleModuleSpec = new ModuleSpec(bundleId);
        var pluginId = bundleModuleSpec.namespace;

        // mimic registering of those extensions
        for(var i1 = 0; i1 < javaScriptExtensionInfo.length; i1++) {
            var pluginMetadata = javaScriptExtensionInfo[i1];
            if (pluginMetadata.hpiPluginId === pluginId) {
                var extensions = pluginMetadata.extensions;
                for(var i2 = 0; i2 < extensions.length; i2++) {
                    var component = extensions[i2].component;
                    if (componentMap && component in componentMap) {
                        component = componentMap[component];
                    }
                    extensionStore._registerComponentInstance(extensions[i2].extensionPoint, pluginMetadata.hpiPluginId, extensions[i2].component, component);
                }
            }
        }
        
        if (out.plugins[pluginId] === undefined) {
            out.plugins[pluginId] = true;
            out.loadCount++;
        }

        // fake the export of the bundle
        setTimeout(function() {
         // js modules calling console.debug
            var orig = console.debug;
            try {
                console.debug = function(msg) { };
                jsModules.export(pluginId, 'jenkins-js-extension', {});
            } finally {
                console.debug = orig;
            }
        }, 1);
        return theRealImport.call(theRealImport, bundleId);
    };
};

describe("ExtensionStore.js", function () {

    it("- fails if not initialized", function(done) {
        jsTest.onPage(function() {
            var extensionStore = new ExtensionStore();
            
            var plugins = {};
            mockDataLoad(extensionStore, plugins);
            
            try {
                extenstionStore.getExtensions('ext', function(ext) { });
                expect("Exception should be thrown").to.be.undefined;
            } catch(ex) {
                // expected
            }
            
            extensionStore.init({
                extensionDataProvider: function(cb) { cb(javaScriptExtensionInfo); },
                classMetadataStore: makeClassMetadataStore(function(type, cb) { cb({}); })
            });
            
            extensionStore.getExtensions('ep-1', function(extensions) {
                expect(extensions).to.not.be.undefined;
                done();
            });
        });
    });
    
    it("- test plugins loaded not duplicated", function (done) {
        jsTest.onPage(function() {
            var extensionStore = new ExtensionStore();
            
            var plugins = {};
            mockDataLoad(extensionStore, plugins);

            // Initialise the ExtensionStore with some extension point info. At runtime,
            // this info will be loaded from <jenkins>/blue/js-extensions/
            extensionStore.init({
                extensionDataProvider: function(cb) { cb(javaScriptExtensionInfo); },
                classMetadataStore: makeClassMetadataStore(function(type, cb) { cb({}); })
            });

            // Call load for ExtensionPoint impls 'ep-1'. This should mimic
            // the ExtensionStore checking all plugins and loading the bundles for any
            // plugins that define an impl of 'ep-1' (if not already loaded).
            extensionStore.getExtensions('ep-1', function() {
                if (plugins.loadCount === 2) {
                    expect(plugins.plugins['plugin-1']).to.not.be.undefined;
                    expect(plugins.plugins['plugin-2']).to.not.be.undefined;

                    // if we call load again, nothing should happen as
                    // all plugin bundles have been loaded i.e. loaded
                    // should still be 2 (i.e. unchanged).
                    extensionStore.getExtensions('ep-1', function() {
                        expect(plugins.loadCount).to.equal(2);

                        // Calling it yet again for different extension point, but
                        // where the bundles for that extension point have already.
                        extensionStore.getExtensions('ep-2', function() {
                            expect(plugins.loadCount).to.equal(2);
                            done();
                        });
                    });
                }
            });
        });
    });
    
    //it("- handles types properly", function(done) {
    //    var extensionStore = new ExtensionStore();
    //
    //    var plugins = {};
    //    mockDataLoad(extensionStore, plugins);
    //
    //    var typeData = {};
    //    typeData['type-1'] = {
    //        "_class":"io.jenkins.blueocean.service.embedded.rest.ExtensionClassImpl",
    //        "_links":{
    //            "self":{"_class":"io.jenkins.blueocean.rest.hal.Link",
    //            "href":"/blue/rest/classes/hudson.tasks.junit.TestResultAction/"
    //            }
    //        },
    //        "classes":["supertype-1"]
    //    };
    //    typeData['type-2'] = {
    //        "_class":"io.jenkins.blueocean.service.embedded.rest.ExtensionClassImpl",
    //        "_links":{
    //            "self":{"_class":"io.jenkins.blueocean.rest.hal.Link",
    //            "href":"/blue/rest/classes/hudson.tasks.junit.TestResultAction/"
    //            }
    //        },
    //        "classes":["supertype-2"]
    //    };
    //
    //    extensionStore.init({
    //        extensionDataProvider: function(cb) { cb(javaScriptExtensionInfo); },
    //        classMetadataStore: makeClassMetadataStore(function(type, cb) { cb(typeData[type]); })
    //    });
    //
    //    extensionStore.getExtensions('ept-1', [ClassMetadataStore.dataType('type-1')], function(extensions) {
    //        expect(extensions.length).to.equal(1);
    //
    //        expect(extensions[0]).to.equal('typed-component-1.1');
    //    });
    //
    //    extensionStore.getExtensions('ept-2', [ClassMetadataStore.dataType('type-2')], function(extensions) {
    //        expect(extensions.length).to.equal(1);
    //        expect(extensions).to.include.members(["typed-component-1.2"]);
    //
    //        done();
    //    });
    //});
    
    it("- handles untyped extension points", function(done) {
        var extensionStore = new ExtensionStore();
        
        var plugins = {};
        mockDataLoad(extensionStore, plugins);
        
        var typeData = {};
        typeData['type-1'] = {
            "_class":"io.jenkins.blueocean.service.embedded.rest.ExtensionClassImpl",
            "_links":{
                "self":{"_class":"io.jenkins.blueocean.rest.hal.Link",
                "href":"/blue/rest/classes/hudson.tasks.junit.TestResultAction/"
                }
            },
            "classes":["supertype-1"]
        };
        typeData['type-2'] = {
            "_class":"io.jenkins.blueocean.service.embedded.rest.ExtensionClassImpl",
            "_links":{
                "self":{"_class":"io.jenkins.blueocean.rest.hal.Link",
                "href":"/blue/rest/classes/hudson.tasks.junit.TestResultAction/"
                }
            },
            "classes":["supertype-2"]
        };
        
        extensionStore.init({
            extensionDataProvider: function(cb) { cb(javaScriptExtensionInfo); },
            classMetadataStore: makeClassMetadataStore(function(type, cb) { cb(typeData[type]); })
        });
        
        extensionStore.getExtensions('ep-1', [ClassMetadataStore.untyped()], function(extensions) {
            expect(extensions.length).to.equal(3);
            expect(extensions).to.include.members(["component-1.1","component-1.2","component-2.1"]);
        });
        
        extensionStore.getExtensions('ept-2', [ClassMetadataStore.untyped()], function(extensions) {
            expect(extensions.length).to.equal(0);
            expect(extensions).to.include.members([]);
            
            done();
        });
    });

    it("- handles multi-key requests", function(done) {
        var extensionStore = new ExtensionStore();
        
        var plugins = {};
        mockDataLoad(extensionStore, plugins);
        
        extensionStore.init({
            extensionDataProvider: function(cb) { cb(javaScriptExtensionInfo); },
            classMetadataStore: makeClassMetadataStore(function(type, cb) { cb({}); })
        });
        
        extensionStore.getExtensions(['ep-1','ep-2'], function(ep1,ep2) {
            expect(ep1.length).to.equal(3);
            expect(ep1).to.include.members(["component-1.1","component-1.2","component-2.1"]);

            expect(ep2.length).to.equal(3);
            expect(ep2).to.include.members(["component-1.3","component-2.2","component-2.3"]);
        });
        
        done();
    });

    //it("- handles componentType", function(done) {
    //    var extensionStore = new ExtensionStore();
    //
    //    class PretendReactClass {
    //    }
    //
    //    class PretendComponent1 extends PretendReactClass {
    //    }
    //
    //    class PretendComponent2 extends PretendReactClass {
    //    }
    //
    //    var plugins = {};
    //    mockDataLoad(extensionStore, plugins, {
    //        'component-1.3.1': PretendComponent1,
    //        'component-2.3.1': PretendComponent2,
    //    });
    //
    //    extensionStore.init({
    //        extensionDataProvider: function(cb) { cb(javaScriptExtensionInfo); },
    //        classMetadataStore: makeClassMetadataStore(function(type, cb) { cb({}); })
    //    });
    //
    //    extensionStore.getExtensions('ep-3', [componentType(PretendComponent1)], function(extensions) {
    //        expect(extensions.length).to.equal(1);
    //        expect(extensions).to.include.members([PretendComponent1]);
    //    });
    //
    //    extensionStore.getExtensions('ep-3', [componentType(PretendComponent2)], function(extensions) {
    //        expect(extensions.length).to.equal(1);
    //        expect(extensions).to.include.members([PretendComponent2]);
    //    });
    //
    //    extensionStore.getExtensions('ep-3', [componentType(PretendReactClass)], function(extensions) {
    //        expect(extensions.length).to.equal(2);
    //        expect(extensions).to.include.members([PretendComponent1, PretendComponent2]);
    //    });
    //
    //    extensionStore.getExtensions('ep-3', [componentType(PretendReactClass), componentType(PretendComponent1)], function(extensions) {
    //        expect(extensions.length).to.equal(1);
    //        expect(extensions).to.include.members([PretendComponent1]);
    //    });
    //
    //    done();
    //});
});
