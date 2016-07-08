import { store, ReduxDescriptorModule } from '../js/index';
import rest from '../js/rest';

const SET_BRANCHES = 'SET_BRANCHES';
const ADD_BRANCH = 'ADD_BRANCH';
const UPDATE_BRANCH = 'UPDATE_BRANCH';

export default class PipelineDescriptorModule extends ReduxDescriptorModule {

    constructor() {
        super();

        // Add reducers. Pure functions etc...
        this.addReducer(SET_BRANCHES, (jobState, action) => {
            // Copy the job data and set the new list of branches on it.
            return Object.assign({}, jobState, {
                branches: action.branches
            });
        });
        this.addReducer(ADD_BRANCH, (jobState, action) => {
            return Object.assign({}, jobState, {
                branches: [...jobState.branches, action.branch],
            });
        });
        this.addReducer(UPDATE_BRANCH, (jobState, action) => {
            // pure function etc ...
            const branches = jobState.branches;
            return jobState;
        });
    }

    actionStateSelector(forAction) {
        // All action reducers in this handler operate on
        // the pipeline state, so return the path to that.
        return `pipelines/${forAction.pipelineName}`;
    }
}

// Pipeline Action Creator helper functions (impure)..

PipelineDescriptorModule.getBranches = (pipelineName) => {
    return store.select(`pipelines/${pipelineName}/branches`);
};

/**
 * Load pipeline branch data into the redux store.
 * @param pipelineName The pipeline name.
 */
PipelineDescriptorModule.loadBranches = (pipelineName) => {
    rest.get(`pipelines/${pipelineName}/branches`)
        .then((branches) => {
            store.dispatch({
                type: SET_BRANCHES,
                pipelineName: pipelineName,
                branches: branches
            });
        });
};