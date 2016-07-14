import { createStore } from 'redux';
import ReduxDescriptorModule from './ReduxDescriptorModule';
import ObjectUtil from './objectUtil';

let reducers = [];

// Create the redux store from the top level "combined"
// reducer function, which "combines" all the registered
// reducers
const reduxStore = createStore((state = {}, action) => {
    let actionCausedStateChange = false;

    for (let i = 0; i < reducers.length; i++) {
        const reducer = reducers[i];

        if (reducer.type === action.type) {
            const descriptor = reducer.descriptor;
            try {
                const stateSelector = descriptor.actionSubStateSelector(action);

                if (stateSelector === '/') {
                    // This means the action wants to operate on the global state
                    // i.e. not on a sub-state.
                    return reducer.reducerFunc(state, action);
                }

                const parsedStateSelector = ObjectUtil.pathTokens(stateSelector);
                const parsedParentStateSelector = [...parsedStateSelector];

                // pop to get the parent selector
                parsedParentStateSelector.pop();

                let currentSubStateParent;

                // If the parent selector is an empty array, that means the parent
                // state object is the global state object.
                if (parsedParentStateSelector.length === 0) {
                    currentSubStateParent = state;
                } else {
                    currentSubStateParent = ObjectUtil.get(state, parsedParentStateSelector);
                }

                if (!currentSubStateParent) {
                    //
                    // A bit unsure what's best to do here !! ...
                    //
                    // The action wants to operate on state at a location in the
                    // current state tree/graph that does not yet exist. Should
                    // we construct the object graph, or should we fail,
                    // requesting that another action should construct the
                    // "parent state" needed by this action i.e. make it not
                    // legal for this action to have been fired before another
                    // action that would have created the parent state? That
                    // could complicate things in one way (sequencing things),
                    // but auto-constructing the parent state could get real
                    // weird.
                    //
                    // Logging a error for now and dropping the action, lets
                    // see how things work out in a real use case.
                    //

                    console.error(`Unable to process action. This action wants to manipulate state at ${stateSelector} in the state graph, but this location cannot be added/updated because the parent/container object/array does not exist in the graph. Probably a preceding action is required to create the parent state.`);
                } else {
                    const currentSubState = ObjectUtil.get(state, parsedStateSelector);
                    const newSubState = reducer.reducerFunc(currentSubState, action);

                    //if (LOGGER.mode === 'debug') {
                    //    var serializedBefore = JSON.stringify(currentSubState);
                    //}

                    if (newSubState !== currentSubState) {
                        // The reducer has changed it's sub-state data.
                        actionCausedStateChange = true;

                        if (Array.isArray(currentSubStateParent)) {
                            if (!currentSubState) {
                                currentSubStateParent.push(newSubState);
                            } else {
                                const currentSubStateIdx = currentSubStateParent.indexOf(currentSubState);
                                currentSubStateParent[currentSubStateIdx] = newSubState;
                            }
                        } else {
                            const subStateParentPropertyName = parsedStateSelector[parsedStateSelector.length - 1];
                            currentSubStateParent[subStateParentPropertyName] = newSubState;
                        }
                    }

                    //
                    //
                    //
                    //if (LOGGER.mode === 'debug') {
                    //    let serializedAfter = JSON.stringify(currentSubState);
                    //    if (serializedAfter !== serializedBefore) {
                    //        LOGGER.error(`Bad reducer implementation. Reducer for action ${reducer.type} has manipulated the current sub-state at ${stateSelector} in the state graph.`);
                    //    }
                    //}
                }
            } catch (e) {
                console.error('Unexpected error while applying ReduxDescriptorModule instance for action: ', action, e);
            }

            // Only one reducer function per action type,
            // so break out here.
            break;
        }
    }

    if (!actionCausedStateChange) {
        // None of the applied reducers have changed the
        // application state, so return original input state.
        return state;
    }

    // One of the reducers changed the application state,
    // so do a shallow clone on the top level state object.
    return Object.assign({}, state);
});

export default class StoreProxy {

    static init(reduxDescriptorModules) {
        if (!reduxDescriptorModules) {
            return;
        }

        if (!Array.isArray(reduxDescriptorModules)) {
            throw new Error('Invalid "reduxDescriptorModules" argument to store.init(). This must be an array of ReduxDescriptorModule instances.');
        }

        let reducerAccumulator = [];
        reduxDescriptorModules.forEach((module) => {
            if (module instanceof ReduxDescriptorModule) {
                module.reset();
                module.addReducers();
                reducerAccumulator = reducerAccumulator.concat(module.reducers());
            } else {
                console.error('store.init() called with a "reduxDescriptorModules" array entry containing an object that is not a ReduxDescriptorModule instance.');
            }
        });

        reducers = reducerAccumulator;
    }

    static getState() {
        const state = reduxStore.getState();
        if (arguments.length === 1 && typeof arguments[0] === 'string') {
            return ObjectUtil.get(state, arguments[0]);
        }
        return state;
    }

    // Maybe add a getStore function to return the underlying reduxStore object.
    // However, we might not want to expose that.

    static dispatch(action) {
        return reduxStore.dispatch(action);
    }

    static subscribe(listener) {
        return reduxStore.subscribe(listener);
    }
}