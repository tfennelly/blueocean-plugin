import { createStore } from 'redux';
import ReduxDescriptorModule from './ReduxDescriptorModule';
import ObjectUtil from './objectUtil';

let reducers = [];

// Create the redux store from the top level "combined"
// reducer function, which "combines" all the registered
// reducers
const theStore = createStore((state = {}, action) => {
    let stateChangeCount = 0;

    for (let i = 0; i < reducers.length; i++) {
        const reducer = reducers[i];

        if ((reducer.type === action.type)) {
            const descriptor = reducer.descriptor;
            try {
                const stateSelector = descriptor.actionStateSelector(action);
                let stateSelectorTokens;

                if (Array.isArray(stateSelector)) {
                    stateSelectorTokens = stateSelector;
                } else {
                    stateSelectorTokens = stateSelector.split('/');
                }

                const currentSubState = ObjectUtil.get(state, stateSelectorTokens);
                const newSubState = reducer.reducerFunc(currentSubState, action);

                if (newSubState !== currentSubState) {
                    // The reducer has changed it's sub-state.
                    stateChangeCount++;

                }
            } catch(e) {
                console.error('Unexpected error while applying ReduxDescriptorModule instance for action: ', action, e);
            }

            // Only one reducer function per action type,
            // so break out here.
            break;
        }
    }

    if (stateChangeCount === 0) {
        // None of the applied reducers have changed the
        // application, so return original input state.
        return state;
    }

    // One or more of the applied reducers have changed the
    // application, so do a shallow clone on the top level
    // state object.
    return Object.assign(state);
});

export default class Store {

    static init(reduxDescriptorModules) {
        if (!reduxDescriptorModules) {
            return;
        }

        if (!Array.isArray(reduxDescriptorModules)) {
            throw new Error('Invalid "reduxDescriptorModules" argument to store.init(). This must be an array of ReduxDescriptorModule instances.');
        }

        const reducerAccumulator = [];
        reduxDescriptorModules.forEach((module) => {
            if (Object.isPrototypeOf(module) === ReduxDescriptorModule) {
                reducerAccumulator.push(module.reducers());
            } else {
                console.error('store.init() called with a "reduxDescriptorModules" array entry containing an object that is not a ReduxDescriptorModule instance.');
            }
        });

        reducers = reducerAccumulator;
    }

    static getState() {
        return theStore.getState();
    }

    static dispatch(action) {
        return theStore.dispatch(action);
    }

    static select(dataPath) {
        const state = theStore.getState();
        // TODO
    }
}