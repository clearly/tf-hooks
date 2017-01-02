'use strict';
const debug     = require('debug')('tfhooks/bin/cli');
const fs        = require('fs');
const _         = require('lodash');
const nconf     = require('nconf');
const getStdin  = require('get-stdin');
const tfparse   = require('tf-parse');
const colors    = require('colors');
const nconfyaml = require('nconf-yaml');

const tfhooks   = require('../lib');

const TFApply = tfparse.Apply;
const TFState = tfparse.State;

function loadConfig() {
  const config = nconf.get('hooks') || {};
  debug( 'Validating config...' );
  const errors = tfhooks.validateConfig( config );
  if( errors ) throw { message : 'Configuration errors', errors };
  module.exports.config = config;
  return config;
}

function *loadApply() {
  let inputApply = null;
  let apply = new TFApply();

  if( nconf.get( 'apply' ) ) {
    inputApply = fs.readFileSync( nconf.get( 'apply' ), 'utf8' );
  } else {
    inputApply = yield getStdin();
  }
  
  debug( inputApply );
  
  inputApply = inputApply || '';
  
  if( inputApply.length == 0) {
    console.log( colors.red( 'ERR!' ), ' terraform apply input must be specified as a file using --apply or come from stdin' );
    process.exit( 1 );
  }

  debug( 'Parsing apply' );
  return apply.parse( inputApply );
}


function loadState() {
  let inputState = null;
  let state = new TFState();

  if( nconf.get( 'state' ) ) {
    inputState = fs.readFileSync( nconf.get( 'state' ), 'utf8' );
  } else {
    inputState = fs.readFileSync( 'terraform.tfstate', 'utf8' );
  }
  
  debug( inputState );
  
  inputState = inputState || '';
  
  if( inputState.length == 0 ) {
    console.log( colors.red( 'ERR!' ), ' terraform state input must be specified as a file using --state or from terraform.tfstate in the local directory' );
    process.exit( 1 );
  }

  debug( 'Parsing state' );
  return state.parse( inputState );
}

module.exports.main = function *main( testParams ) {
  debug( 'Entry %O', testParams );
  
  nconf.argv().env().file( { file: 'terraform.tfhooks', format: nconfyaml } ).overrides( testParams );

  const config  = loadConfig();
  const apply   = yield loadApply();
  const state   = loadState();

  let results = [];
  
  if( nconf.get( 'dryRun' ) != true ) {
    debug( 'Running hooks...' );
    results = yield tfhooks.runHooks( { config, apply, state } );
  }
  return results;
};

module.exports.handleError = function handleError( error ) {
  console.log( error );
  process.exit( 1 );
};

module.exports.handleSuccess = function handleSuccess( value ) {
  let results = _.filter( value, { valid : 'fail' } );
  if( results.length > 0 ) {
    process.exit( 1 );
  } else {
    console.log( colors.green(tfhooks.symbols.ok), `${value.length} hooks ran with no errors` );
    process.exit( 0 );
  }
};



