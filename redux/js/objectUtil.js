/**
 * JSON Object navigation
 */

export default class ObjectUtil {

    static get(object, path) {
        if (!path) {
            return undefined;
        }

        const pathTokens = ObjectUtil.pathTokens(path);

        let currentObj = object;
        for (let i = 0; i < pathTokens.length; i++) {
            const pathToken = pathTokens[i];

            if (Array.isArray(currentObj)) {
                if (currentObj.length > 0) {
                    const arrayPathToken = ObjectUtil.extractArrayPathToken(pathToken);
                    if (arrayPathToken) {
                        // If currentObj is an array, the the pathToken
                        // is either selecting an array entry by index,
                        // or by property value.
                        const arrayIndex = parseInt(arrayPathToken);

                        if (!isNaN(arrayIndex)) {
                            // It's a number, lets use it as the index
                            if (arrayIndex >= 0 && arrayIndex < currentObj.length) {
                                currentObj = currentObj[arrayIndex];
                            } else {
                                currentObj = undefined;
                            }
                        } else {
                            // pathToken must be a "property=value" expression
                            // e.g. team/people/name=John%20Doe/age
                            // This doesn't handle multi-dimensional arrays, but I think that's ok
                            // as I'd think we have a bigger problem if state ends up like that.

                            const pathTokenTokens = arrayPathToken.split('=');

                            if (pathTokenTokens.length !== 2) {
                                console.error(`Invalid array entry selector syntax "${arrayPathToken}" in "${path}". Must be formatted "[propName=propValue]", with propValue URL encoded.`);
                                currentObj = undefined;
                            } else {
                                const propertyName = pathTokenTokens[0];
                                const requiredPropertyValue = decodeURIComponent(pathTokenTokens[1]);
                                let elementIndex = undefined;

                                for (let ii = 0; ii < currentObj.length; ii++) {
                                    const arrayElement = currentObj[ii];
                                    if (typeof arrayElement === 'object') {
                                        var arrayElementPropValue = arrayElement[propertyName];
                                        if (arrayElementPropValue && arrayElementPropValue.toString() === requiredPropertyValue) {
                                            elementIndex = ii;
                                            break;
                                        }
                                    }
                                }

                                if (elementIndex !== undefined) {
                                    currentObj = currentObj[elementIndex];
                                } else {
                                    currentObj = undefined;
                                }
                            }
                        }
                    } else {
                        console.error(`Invalid array entry selector syntax "${pathToken}" in "${path}". Must be formatted "[propName=propValue]" (wrapped in square braces), with propValue URL encoded.`);
                        currentObj = undefined;
                    }
                } else {
                    currentObj = undefined;
                }
            } else {
                currentObj = currentObj[pathToken];
            }

            if (currentObj === undefined) {
                break;
            }
        }

        return currentObj;
    }

    static getParent(object, path) {
        if (!path) {
            return undefined;
        }

        // Clone the parsed path because we're going to modify it.
        // We clone in case the input path is already parsed i.e.
        // we want to make sure we do not modify it.
        const parentPathTokens = [...ObjectUtil.pathTokens(path)];
        // pop off the last token to get the parent path
        parentPathTokens.pop();

        return ObjectUtil.get(object, parentPathTokens);
    }

    static pathTokens(path) {
        let returnedTokens;

        if (Array.isArray(path)) {
            returnedTokens = path;
        } else {
            returnedTokens = path.split('/');
        }

        if (returnedTokens.length > 0) {
            if (returnedTokens[0] === '') {
                returnedTokens = returnedTokens.slice(1);
            }
        }
        if (returnedTokens.length > 0) {
            if (returnedTokens[returnedTokens.length - 1] === '') {
                returnedTokens.pop();
            }
        }

        return returnedTokens;
    }

    static isArrayPathToken(pathToken) {
        return (pathToken && pathToken.length > 2 && pathToken.charAt(0) === '[' && pathToken.charAt(pathToken.length - 1) === ']');
    }

    static extractArrayPathToken(pathToken) {
        if (ObjectUtil.isArrayPathToken(pathToken)) {
            return pathToken.substring(1, pathToken.length - 1);
        }
        return undefined;
    }
}
