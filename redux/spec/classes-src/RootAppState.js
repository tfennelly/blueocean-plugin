const ReduxDescriptorModule = require('../../dist/ReduxDescriptorModule').default;
const StoreProxy = require('../../dist/StoreProxy').default;

export default class RootAppState extends ReduxDescriptorModule {

    actionSubStateSelector(action) {
        return `/`;
    }

    addReducers() {
        this.addReducer('SET_ROOT_STATE', () => {
            return {
                pipelines: []
            }
        });
    }
}

// Bounded Action Creator for 'SET_ROOT_STATE'
// See http://redux.js.org/docs/basics/Actions.html#action-creators
RootAppState.set = () => {
    StoreProxy.dispatch({
        type: 'SET_ROOT_STATE'
    });
};