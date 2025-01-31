'use strict'
const express = require('express')
const httpErrors = require('http-errors')
const pino = require('pino')
const pinoHttp = require('pino-http')

module.exports = function main (options, cb) {
  const ready = cb || function () {}
  const opts = Object.assign({}, options)
  const logger = pino()
  const app = express()

  // Error handling setup
  const handleError = (err) => {
    logger.error(err)
    process.exit(1)
  }
  process.on('uncaughtException', handleError)
  process.on('unhandledRejection', handleError)

  // Middleware
  app.use(pinoHttp({ logger }))
  require('./routes')(app, opts)

  // Error handlers
  app.use((req, res, next) => {
    next(httpErrors(404, `Route not found: ${req.url}`))
  })

  app.use((err, req, res, next) => {
    if (err.status >= 500) logger.error(err)
    res.status(err.status || 500).json({
      messages: [{
        code: err.code || 'InternalServerError',
        message: err.message
      }]
    })
  })

  // Start server
  return app.listen(opts.port, opts.host, (err) => {
    if (err) {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${opts.port} is already in use. Please try a different port or stop the other service using this port.`)
      } else {
        logger.error('Failed to start server:', err)
      }
      return ready(err, app)
    }
    const addr = app.address()
    logger.info(`Started at ${opts.host || addr.host || 'localhost'}:${addr.port}`)
    ready(null, app)
  })
}

