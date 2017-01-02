'use strict';
const debug     = require('debug')('tfhooks/lib');
const _         = require('lodash');
const fs        = require('fs');
const Ajv       = require('ajv');
const colors    = require('colors');
// const jp        = require('jmespath');
const yaml      = require('js-yaml');

const symbols   = require('./symbols');

const schema = yaml.safeLoad( fs.readFileSync( `${__dirname}/schema.yml`, 'utf8' ) );

const ajv = new Ajv();
function getKey( ob ) {
  if( ! _.isObject( ob ) ) {
    throw { severity : 'error', message : 'An individual rule configuration must be an object' };
  }
  const keys = _.keys( ob );
  if( keys.length != 1 ) {
    throw { severity : 'error', message : 'An individual rule configuration must have a single key that is the name of the rule' };
  }
  return keys[ 0 ];
}

module.exports.symbols = symbols;

module.exports.validateConfig = function validateConfig( config ) {
  let errors = null;
  if ( ! ajv.validate( schema, config ) ) {
    errors = ajv.errors;
  }
  return errors;
};

function report( result, instanceName, rule ) {
  if( result ) {
    if( result.valid == 'success' ) {
      console.log( colors.green( symbols.ok ), colors.green( ' OK' ), colors.gray( rule.docs.description ), colors.gray( ':' ), instanceName );
    } else if( result.valid == 'fail' ) {
      if ( _.isArray(result.message)) {
        for ( let error of result.message ){
          console.log( colors.red( symbols.err ), colors.red( 'ERR' ), colors.gray( error || rule.docs.description ), colors.gray( ':' ), instanceName );
        }
      } else {
        console.log( colors.red( symbols.err ), colors.red( 'ERR' ), colors.gray( result.message || rule.docs.description ), colors.gray( ':' ), instanceName );  
      }
    }
  }
}

module.exports.runHooks = function *runHooks( params ) {
  debug( 'runHooks: %O', params );
  let results = [];
  return results;
};


