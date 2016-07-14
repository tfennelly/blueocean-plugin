const storeProxy = require('../dist/StoreProxy').default;
const chai = require('chai');

const RootAppState = require('./classes-bin/RootAppState').default;
const PipelinesState = require('./classes-bin/PipelinesState').default;
const PipelineState = require('./classes-bin/PipelineState').default;

describe("Store.js", function () {

    it("- PipelinesState/PipelineState", function (done) {
        storeProxy.init([
            new RootAppState(),
            new PipelinesState(),
            new PipelineState()
        ]);

        // before we fire the "Bounded Action Creators", lets make sure
        // there's no root state.
        chai.assert(storeProxy.getState('pipelines') === undefined);

        var stateAssertFunc;

        // Use a store listener to listen for the action events and
        // check the state.
        storeProxy.subscribe(function() {
            if (stateAssertFunc) {
                stateAssertFunc();
            }
        });

        // fire the root state "Bounded Action Creator" function.
        stateAssertFunc = function () {
            chai.assert(storeProxy.getState('pipelines') !== undefined);
            chai.assert(storeProxy.getState('pipelines/[name=pipeline_1]') === undefined);

            // fire the "Bounded Action Creator" function for adding a pipeline.
            stateAssertFunc = function () {
                chai.assert(storeProxy.getState('pipelines/[name=pipeline_1]') !== undefined);
                chai.assert(storeProxy.getState('pipelines/[name=pipeline_1]/propX') === 1);

                // fire the "Bounded Action Creator" function for incrementing propX.
                stateAssertFunc = function () {
                    chai.assert(storeProxy.getState('pipelines/[name=pipeline_1]/propX') === 2);

                    // fire the "Bounded Action Creator" function for incrementing propX
                    // for an unknown pipeline.
                    stateAssertFunc = function () {
                        chai.assert(storeProxy.getState('pipelines').length === 1);
                        done();
                    };
                    PipelineState.incPropX('pipeline_unknown');
                };
                PipelineState.incPropX('pipeline_1');
            };
            PipelinesState.add({
                name: 'pipeline_1',
                branches: [],
                propX: 1
            });
        };
        RootAppState.set();
    });

});