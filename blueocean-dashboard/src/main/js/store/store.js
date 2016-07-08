import Extensions from '@jenkins-cd/js-extensions';
import { createStore } from 'redux';

const reducers = [];
const combinedReducer = (state, action) => {
    reducers.forEach((reducer) => {
        if ((reducer.type === action.type)) {

        }
    });
};
const theStore = createStore(combinedReducer);

export class store {

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

export class ReduxDescriptorModule {

    constructor() {
        this._reducers = [];
    }

    addReducer(actionType, reducerFunc) {
        if (typeof actionType !== 'string') {
            throw new Error(`The "actionType" parameter must be a JavaScript string`);
        }
        if (this._reducers[actionType]) {
            throw new Error(`A reducer function for action type ${actionType} is already defined`);
        }
        if (typeof reducerFunc !== 'function') {
            throw new Error(`The "reducerFunc" parameter for action type ${actionType} must be a JavaScript function`);
        }


        this._reducers.push({
            type: actionType,
            descriptor: this,
            reducerFunc: reducerFunc,
        });
    }

    actionStateSelector(action) {
        throw new Error(`actionStatePath() must be defined on ${Object.getPrototypeOf(this)}. TODO: link to relevant docs.`);
    }

    reducers() {
        return this._reducers;
    }
}

Extensions.store.getExtensions('jenkins.main.stores.modules', (modules) => {
    const reducerAccumulator = [];
    modules.forEach((module) => {
        if (Object.isPrototypeOf(module) === ReduxDescriptorModule) {
            reducerAccumulator.push(module.reducers());
        }
    });
    reducers.push(reducerAccumulator);
});
