const ObjectUtil = require('../dist/ObjectUtil').default;
const chai = require('chai');

describe("ObjectUtil.js", function () {
    const testObject = {
        a: {
            b: {
                c: {
                    cval1: 1,
                    cval2: '2'
                }
            }
        },
        d: {
            e: {
                eval1: 1,
                eval2: '2'
            }
        },
        team: {
            people: [
                {
                    name: 'Jack Murphy',
                    age: 40
                },
                {
                    name: 'Bart Simpson',
                    age: 39
                },
                {
                    name: 'John Doe',
                    age: 38
                },
            ]
        }
    };

    it("- get root", function () {
        const a = ObjectUtil.get(testObject, 'a');
        chai.assert(a !== undefined);
        chai.expect(a.b.c.cval1).to.equal(1);
    });

    it("- get undefined", function () {
        const y = ObjectUtil.get(testObject, 'x/y');
        chai.assert(y === undefined);
    });

    it("- get non-root", function () {
        const c = ObjectUtil.get(testObject, 'a/b/c');
        chai.assert(c !== undefined);
        chai.expect(c.cval1).to.equal(1);
    });

    it("- get array entry by index", function () {
        const jack = ObjectUtil.get(testObject, 'team/people/[0]');
        const john = ObjectUtil.get(testObject, 'team/people/[2]/name');
        const unknownNegative = ObjectUtil.get(testObject, 'team/people/[-1]');
        const unknownAOOB = ObjectUtil.get(testObject, 'team/people/[100]/age');

        chai.assert(jack !== undefined);
        chai.expect(jack.name).to.equal('Jack Murphy');
        chai.assert(john !== undefined);
        chai.expect(john).to.equal('John Doe');

        chai.assert(unknownNegative === undefined);
        chai.assert(unknownAOOB === undefined);
    });

    it("- get array entry by property value", function () {
        const jack = ObjectUtil.get(testObject, 'team/people/[name=Jack%20Murphy]');
        const john = ObjectUtil.get(testObject, 'team/people/[name=John%20Doe]/name');
        const unknownNegative = ObjectUtil.get(testObject, 'team/people/[name=xxxx]');
        const unknownAOOB = ObjectUtil.get(testObject, 'team/people/[name=xxxx]/age');

        chai.assert(jack !== undefined);
        chai.expect(jack.name).to.equal('Jack Murphy');
        chai.assert(john !== undefined);
        chai.expect(john).to.equal('John Doe');

        chai.assert(unknownNegative === undefined);
        chai.assert(unknownAOOB === undefined);
    });

    it("- getParent", function () {
        const people = ObjectUtil.getParent(testObject, 'team/people/[name=Jack%20Murphy]');

        chai.assert(people !== undefined);
        chai.expect(people[0].name).to.equal('Jack Murphy');
    });
});