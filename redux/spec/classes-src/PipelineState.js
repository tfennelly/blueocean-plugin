const ReduxDescriptorModule = require('../../dist/ReduxDescriptorModule').default;
const StoreProxy = require('../../dist/StoreProxy').default;

export default class PipelinesState extends ReduxDescriptorModule {

    actionSubStateSelector(action) {
        return `/pipelines/[name=${action.pipelineName}]`;
    }

    addReducers() {
        this.addReducer('INC_PIPELINE_PROPX', (pipeline, action) => {
            if (pipeline) {
                return Object.assign({}, pipeline, {
                    propX: (pipeline.propX + 1)
                });
            }
        });
    }
}

// Bounded Action Creator for 'INC_PIPELINE_PROPX'
// See http://redux.js.org/docs/basics/Actions.html#action-creators
PipelinesState.incPropX = (pipelineName) => {
    StoreProxy.dispatch({
        type: 'INC_PIPELINE_PROPX',
        pipelineName: pipelineName
    });
};

// State accessor methods.
PipelinesState.getPropX = (pipelineName) => {
    var pipeline = StoreProxy.getState(`/pipelines/[name=${pipelineName}]`);
    return (pipeline ? pipeline.propX : undefined);
};
