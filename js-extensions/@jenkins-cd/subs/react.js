/**
 * React and, most especially, packages that depend on react (dependants) require special treatment.
 * There can only be one instance of react in use in the "system" i.e. across all core and
 * plugin bundles. If any of the bundles end up bundling their own instance of react then
 * we are in trouble. We need to create dependency bundles for each of these packages
 * (e.g. react, react-dom etc) and make sure they all import and use the same base react
 * bundle (and hence, the same react instance).
 */

var fs = require('fs');
var cwd = process.cwd();
var path = require('path');
var node_modules = path.resolve(cwd, 'node_modules');

exports.processReactAndReactDependeants = function(builder) {
    // Create importable bundles for anything that depends on
    // react. But ... make these bundle definitions overwritable just
    // in case of some unforeseen (call bundle.doAllowOverwrite). This
    // allows subsequent bundle definitions for these packages to overwrite
    // the definitions registered from here. Remember that those subsequent
    // bundle definitions (in plugin builds etc) would also need to call
    // bundle.doOverwrite before the overwrite is allowed. Iow ... there's a
    // two-way lock on the bundle def overwrite processes in that the bundle def
    // being overwritten needs to have called "doAllowOverwrite" (declaring that
    // it's ok with being overwritten), while the bundle that is going to
    // perform the overwrite needs to call "doOverwrite" (declaring that it's ok
    // with being used to overwrite another definition). This prevents most/all
    // inadvertent overwrites.

    // If this package has a dependency on react, then lets
    // make sure there's an importable bundle for it.
    var reactDependants = builder.dependencies.getDefinedDependantsOf('react');
    // Note: reactDependants is an array of @jenkins-cd/js-modules/js/ModuleSpec instances
    reactDependants.forEach(function (reactDependant) {
        // Create an importable bundle for each of these react dependants.
        // Importantly though, we need to make sure that bundle imports
        // react, ensuring that it is using the same react as all other
        // react dependants. We are guaranteed that react has already been
        // loaded by Blue Ocean web (main bootstrap bundle), in which case we
        // can spec an import version of "any".
        try {
            builder.bundle(reactDependant.moduleName)
                .import('react@any')
                .doAllowOverwrite();
            // And lets add a global import for that package so that
            // all generated bundles having a dependency on it will import the
            // above generated bundle (or use the same if already loaded by
            // another bundle). That guarantees that the instance of that
            // react dependant that it is using will have the "one true"
            // react instance.
            // builder.import(reactDependant.moduleName);
        } catch (e) {
            builder.logger.logWarn('Skipping importable bundle creation for "' + reactDependant.moduleName + '". ' + e);
        }
    });
};
