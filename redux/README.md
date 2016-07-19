# Overview

This NPM package contains utilities that help put patterns around how Blue Ocean client-side
code can manipulate data in the Blue Ocean [Redux] store.

> __Note__: Also see MobX as an alternative to using [Redux]. Looks very promising - unobtrusive, little/no boilerplate.

<hr/>

<p>
<ul>
    <a href="#redux-in-blue-ocean">Redux in Blue Ocean</a><br/>
    <a href="#jenkins-cdredux-npm-package">@jenkins-cd/redux NPM package</a><br/>
    <ul>
        <a href="#reduxdescriptormodule-implementations">ReduxDescriptorModule "implementations"</a><br/>
        <ul>
            <a href="#reduxdescriptormoduleactionsubstateselectoraction">ReduxDescriptorModule.actionSubStateSelector(action)</a><br/>
            <a href="#reduxdescriptormoduleaddreducers">ReduxDescriptorModule.addReducers()</a><br/>
        </ul>    
        <a href="#accessing-state-state-accessor-functions">Accessing state ("State Accessor" functions)</a><br/>
        <a href="#updatingchanging-state-bounded-action-creator-functions">Updating/changing state ("Bounded Action Creator" functions)</a><br/>
        <a href="#example">Example</a><br/>
    </ul>    
</ul>    
</p>

<hr/>

# Redux in Blue Ocean

Lets frame this discussion by giving a brief history of [Redux] usage in Blue Ocean, as well as what might be next. 

## Redux "Phase 1" in Blue Ocean (current)

Up to now, Blue Ocean has been using the low level [Redux] APIs directly. There's some code in `blueocean-web`
and then even more in `blueocean-dashboard`, with [redux/actions.js] containing a mixture of [Redux] reducers
and more. In reality, there's no clear/discernible pattern for developers to follow when they need to get or
change state in the Blue Ocean [Redux] store. Typically it involves adding boilerplate code in a number of
files. It's not very easy to follow, with core developers already having difficulty understanding how things
work there.

## Redux "Phase 2" in Blue Ocean (next?)

> We're using the term "Phase 1"/"Phase 2" in acknowledgment of the fact that we expect things to evolve more i.e. we're not trying to claim that we're going to hit the jackpot first time. We expect this to be a process and for this code to go through a number of "phases".

[Redux] is a quite low level API. Any application using it really needs to develop a layer on top of it,
putting some patterns in place that make it "easier" to use in the context of that application. "Phase 2" is
about starting that process.

We need to reach a situation where new and existing developers can work with state in the Blue Ocean [Redux] store
by following a more clear set of instructions and patterns and doing things in a more modular way Vs having to figure
out what snippets of boilerplate code need to be added to what files (and where in those files).

# @jenkins-cd/redux NPM package

This package defines ES6 classes that we hope will put some structure around how we use [Redux] in Blue Ocean,
allowing us to develop more modular state handling code on top of [Redux].

> __NOTE__: Everything here is just a "first stab" i.e. something that we think would be an improvement over the current usage patterns ("Phase 1"), but confident in the fact that we can make it better - better class names, better usage patterns etc.

## ReduxDescriptorModule "implementations"

Blue Ocean application state is composed of state objects nested within other state objects i.e. "sub-states" e.g:

```json
{
    pipelines: [
        {
            name: 'pipeline-1',
            branches: [
                {
                    name: 'master'
                }
            ]
        }
    ],
    users: []
    agents: []
}
```

Our current thinking is that we should manage Blue Ocean state by defining a set of "modules" (modular) that are
each __dedicated to handling a specific "sub-state" of the overall application state__. This makes things more modular
and gets us away from the current situation where we have everything in a small number of files.

Each of these modules would define all the [Redux] "bits" needed managing a specific sub-state ([Action]s, [Reducer]s, [Action Creator] functions etc) e.g.

* A module dedicated to handling a top level sub-state for adding, updating, getting, deleting etc of "Pipelines".
* A module dedicated to handling a lower level sub-state at the level of an individual "Pipeline" e.g. updating the list of branches on a pipeline.
* A module dedicated to handling a even lower level sub-state at the level of a "Branch".
* etc etc

To help with this part, we came up with an ES6 class that we currently call `ReduxDescriptorModule`. It defines a few "abstract"
functions that the developer must override (or Errors are thrown) on classes that extend it.

### ReduxDescriptorModule.actionSubStateSelector(action)

The "implementation" of this function must return the sub-state "path" that the supplied action will operate on.
We expect that, most of the time, the function will return the same path for all actions i.e. all actions will operate
on the same piece of application sub-state. That said, the function can (in theory) return different paths for different
action types.

```javascript
import { ReduxDescriptorModule } from '@jenkins-cd/redux';

export default class PipelinesState extends ReduxDescriptorModule {
    actionSubStateSelector(action) {
        return `/pipelines`;
    }

    /// etc
}
```

Selectors for selecting inside an array sub-state are a little more funky at the moment. The array entry must be an object
and the selector must be enclosed in square braces, with a value equaling an array index OR following a `name=value` format,
where the `name` is the name of a property on the array entry object and `value` is the value that that property needs to
have in order to be selected e.g. the following selector selects the `pipeline` entry in the `pipelines` array sub-state, where
the `pipeline` entry `name` property is equal to the `pipelineName` property on the `action` supplied to the function.

```javascript
actionSubStateSelector(action) {
    return `/pipelines/[name=${action.pipelineName}]`;
}
```

### ReduxDescriptorModule.addReducers()

The "implementation" of this function adds [Reducer] functions for each of the [Action]s processed by the `ReduxDescriptorModule`
implementation. It adds these by calling `this.addReducer(actionTypeId, reducerFunction`.

```javascript
import { ReduxDescriptorModule } from '@jenkins-cd/redux';

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
```

Note that it is critically important that the [Reducer] functions be implemented as [Pure Function]s. This is
one of the [three fundamental principals of Redux](http://redux.js.org/docs/introduction/ThreePrinciples.html).

## Accessing state ("State Accessor" functions)

The [Redux] docs suggest different mechanisms for passing around state objects, from using component `props`, to using
the react `context`. The arguments in favour of these approaches seems to be based around decoupling and dependency
injection. In theory these are solid arguments, but the actual result of this in React is an ugly mess as the component
code ends up being littered with `PropTypes` declarations, which are also an extra headache for the component author.

Alternatively, one can use `react-redux` [Container Components] etc (`Provider` etc), but this approach fixes the
verbose manual option through a 180<sup>o</sup> u-turn that's terse enough and decoupled enough such that it's more-or-less
impossible for anyone but the [Redux] gurus to wrap their heads around.

> In particular, Tom F did not like the [Container Components] approach, being much more comfortable with paying the price of a bit extra code for the benefit of having code that newcomers (and old hands) can make sense of without having to take drugs beforehand. Cliff also mentioned he found the [Container Components] approach a bit too abstract/cryptic. 

For this reason, the preference here would be to access store state directly via `static` functions defined in the
`ReduxDescriptorModule` JavaScript modules i.e. straight after the `ReduxDescriptorModule` implementation e.g.

```javascript
import { ReduxDescriptorModule, StoreProxy } from '@jenkins-cd/redux';

export default class PipelinesState extends ReduxDescriptorModule {

    actionSubStateSelector(action) {
        return `/pipelines`;
    }

    addReducers() {
        // etc (see above) ...
    }
}

// static state accessor functions
PipelinesState.get = (pipelineName) => {
    return StoreProxy.getState(`/pipelines/[name=${pipelineName}]`);
};
```

> Note how `StoreProxy.getState` supports the same kind of selector syntax as shown earlier with respect to `ReduxDescriptorModule.actionSubStateSelector`. You can use this, or you access the root state directly (by calling `StoreProxy.getState` without a selector string) and navigate the state object yourself.

Then, of course, React components etc can access this state via the static functions (vs expecting the data to be
passed in) e.g.

```javascript
import PipelinesState from `../state/PipelinesState`;
// other imports ...

export default class XXXX extends Component {
    render() {
        var pipeline = PipelinesState.get(this.props.pipelineName);

        // etc ....
    }
}

```

## Updating/changing state ("Bounded Action Creator" functions)

Similarly to the "State Accessor" functions, we suggest encapsulating updates to the store via `static` functions
defined on the `ReduxDescriptorModule` JavaScript modules. This hides all the [Redux] details from the other
application code.

We call these function Bounded [Action Creator] functions (in line with the same concept in [Redux]) because that's what
they do i.e. they create [Action] instances and "dispatch" them (the fact that they dispatch the [Action] is what
makes them "bounded") to the [Redux] store.
 
> In [Redux}, state updates are always performed by dispatching an [Action].
 
Again, we add these functions straight after the `ReduxDescriptorModule` implementation e.g.

```javascript
import { ReduxDescriptorModule, StoreProxy } from '@jenkins-cd/redux';

export default class PipelinesState extends ReduxDescriptorModule {

    actionSubStateSelector(action) {
        return `/pipelines`;
    }

    addReducers() {
        // etc (see above) ...
    }
}

// Bounded action creator functions
// See http://redux.js.org/docs/basics/Actions.html#action-creators
PipelinesState.add = (pipeline) => {
    StoreProxy.dispatch({
        type: 'ADD_PIPELINE',
        pipeline: pipeline
    });
};
```

And as with the State Accessor functions, other components can use these functions to update the state without
ever really being aware of the fact that a [Redux] store is in place underneath.

```javascript
import PipelinesState from `../state/PipelinesState`;
// other imports ...

export default class XXXX extends Component {
        
    someAction() {
        var pipeline = {...}; // construct the pipeline object

        PipelinesState.add(pipeline);

        // etc ....
    }

    render() {
        // etc ... trigger the above action
    }
}

```

## Example

See `StoreProxy-spec.js` in [./spec](./spec), as well as the ES6 classes in [./spec/classes-src](./spec/classes-src).

[Redux]: http://redux.js.org/
[MobX]: https://mobxjs.github.io/mobx/index.html
[redux/actions.js]: ../blueocean-dashboard/src/main/js/redux/actions.js
[Reducer]: http://redux.js.org/docs/basics/Reducers.html
[Action]: http://redux.js.org/docs/basics/Actions.html
[Action Creator]: http://redux.js.org/docs/basics/Actions.html#action-creators
[Pure Function]: http://redux.js.org/docs/introduction/ThreePrinciples.html#changes-are-made-with-pure-functions
[Container Components]: http://redux.js.org/docs/basics/UsageWithReact.html#container-components