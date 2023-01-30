'use strict';

const konnectTcp = require('..');
const assert = require('assert').strict;

assert.strictEqual(konnectTcp(), 'Hello from konnectTcp');
console.info("konnectTcp tests passed");
