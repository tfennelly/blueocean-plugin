const ReduxDescriptorModule = require('../../dist/ReduxDescriptorModule').default;
const StoreProxy = require('../../dist/StoreProxy').default;

export default class PipelinesState extends ReduxDescriptorModule {

    actionSubStateSelector(action) {
        return `/pipelines`;
    }

    addReducers() {
        this.addReducer('ADD_PIPELINE', (pipelines, action) => {
            return [...pipelines, Object.assign({}, action.pipeline)];
        });
        this.addReducer('UPDATE_PIPELINE', (pipelines, action) => {
            const clone = [...pipelines];
            for (let i in clone) {
                if (clone[i].name === action.pipeline.name) {
                    clone[i] = Object.assign({}, action.pipeline);
                    break;
                }
            }
            return clone;
        });
    }
}

// Bounded Action Creator for 'ADD_PIPELINE'
// See http://redux.js.org/docs/basics/Actions.html#action-creators
PipelinesState.add = (pipeline) => {
    StoreProxy.dispatch({
        type: 'ADD_PIPELINE',
        pipeline: pipeline
    });
};
PipelinesState.update = (pipeline) => {
    StoreProxy.dispatch({
        type: 'UPDATE_PIPELINE',
        pipeline: pipeline
    });
};
