'use strict';
const debug     = require('debug')('tfhooks/lib');
const _         = require('lodash');
const request   = require('co-request');
const fs        = require('fs');
const Ajv       = require('ajv');
const colors    = require('colors');
const yaml      = require('js-yaml');

const ajv       = new Ajv();
const symbols   = require('./symbols');
const schema    = yaml.safeLoad( fs.readFileSync( `${__dirname}/schema.yml`, 'utf8' ) );

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
  let types = _.keys( params.config );
  for( let type of _.keys( params.apply.add ) ) {
    debug( 'Type %s ', type );
    if( types.indexOf( type ) > -1 ) {
      let config = params.config[ type ];
      let actions = _.get( config, 'actions', [ 'add' ] );
      delete config[ 'actions' ];
      for( let action of actions ) {
        let instances = _.keys( params.apply[ action ][ type ] );
        results = results.concat( yield batchHook( action, type, instances, config ) );
      }
    }
  }
  return results;
};

function *batchHook( action, type, instances, config ) {
  const body = { action, type, instances };
  let response = null;
  let result = null;
  try {
    response = yield request({
      method  : 'POST',
      url     : config.target,
      json    : true,
      body    : body
    });
    if( response.statusCode == 200 ) {
      result = { valid : 'success' };
    } else {
      let errorMessage = _.isString( response.body ) ? response.body : null;
      if( ! errorMessage && _.isObject( response.body ) ) {
        errorMessage = JSON.stringify( response.body );
      }
      result = { valid : 'fail', detail : `${response.statusCode} ${response.statusMessage} ${errorMessage}` };
    }
  } catch( err ) {
    result = { valid : 'fail', exception : true, detail : err };
  }
  return result;
}


