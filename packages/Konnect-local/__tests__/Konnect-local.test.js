'use strict';

const konnectLocal = require('..');
const assert = require('assert').strict;

assert.strictEqual(konnectLocal(), 'Hello from konnectLocal');
console.info("konnectLocal tests passed");
