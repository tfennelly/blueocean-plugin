
let storeInstance;

export default class Store {

    static set(store) {
        storeInstance = store;
    }

    static get() {
        return storeInstance;
    }
}

const assertStoreSetOnHandler = (handler) => {
    if (!handler._store) {
        throw new Error('Invalid state. Store not set on StoreDataHandler instance.');
    }
};

const getStoreValue = (valuePathTokens) => {

    // Navigate the object graph and return the value.
    for (let i = 0; i < valuePathTokens.length; i++) {
        value = value[valuePathTokens[i]];
        if (value === undefined) {
            return undefined;
        }
    }

    return value;
};