const errorHandler = (error, req, res, next) => {
  const status = error.statusCode || 500;

  // .toString() to remove unnecessary error stack
  const errorReason = error.reason && error.reason.toString();

  // for stripe
  const stripeErrTypes = {
    invalid_request_error: 'invalid_request_error',
    api_error: 'api_error',
    card_error: 'card_error',
    idempotency_error: 'idempotency_error'
  };

  if (error.reason) {
    console.error('| ==-- Error-Reason --== |:', errorReason);
  } else if (error.isAxiosError) {
    console.log('axios error @errHand');
    console.log(error.response.data);
  }
  // for stripe
  else if (stripeErrTypes[error.rawType]) {
    console.log('stripe error @errHand', {
      ...error
    });
    // internal error. exclude MongoError, ValidationError
  } else if (
    status === 500 &&
    ![
      'MongoError',
      'ValidationError',
      'JsonWebTokenError',
      'UnauthorizedError' // express-jwt
    ].includes(error.name)
  ) {
    console.log(error.stack);
  } else {
    // consistent error logger
    console.log({ ...error });
  }

  // sent to default express errorHandler
  // can trigger if two res. ex. res.render() and res.json()
  if (res.headersSent) {
    console.error('* * * * -Header Sent-');
    return next(error);
  }

  // clientError
  if (req.xhr) {
    console.log('* * * xhr!!!');
    return res.status(500).json({ error: 'Something failed - xhr jquery' });
  }

  // stripe
  if (stripeErrTypes[error.rawType]) {
    return res.status(status).json({
      error: `${status} : ${error.code}`,
      message: error.message
    });
  }

  // axios handler
  if (error.isAxiosError) {
    const { data, status: status2, statusText } = error.response;

    return res.status(status2).json({
      message: `${status2} ${statusText} : ${data.error_description} - ${data.error}`,
      inner: data.error_description
    });
  }

  // jwt-express's authentication error-handling
  // redundant error.name??
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      message: `${error.name} : ${error.message}`,
      inner: error.inner
    });
  }

  // prevent by catching Object id format
  if (error.name === 'CastError') {
    console.log('--CastError--');
  }

  if (error.name === 'ValidatorError') {
    console.log('--ValidatorError--');
  }

  // x.model.js
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      message: `ValidationError: ${error.message}`
    });
  }

  // MongoError?
  if (error.name === 'MongooseError') {
    console.log('--Mongoose Error--');
  }

  if (error.name === 'UrlError') {
    return res.status(404).json({
      message: `cannot do ${req.method} on ${req.url}`
    });
  }

  // bad request
  // if (error.statusCode === 400) {
  //   console.log('--400--');
  //   return res.status(400).json({
  //     message: `${error.name} : ${error.message}`
  //   });
  // }

  // not found
  // if (error.statusCode === 404) {
  //   console.log('--404--');
  //   return res.status(404).json({
  //     message: `${error.name} : ${error.message}`
  //   });
  // }

  // unauthorized
  // if (error.statusCode === 401) {
  //   return res.status(401).json({
  //     error: `${error.name} : ${error.message}`
  //   });
  // }

  if (['TokenExpiredError', 'JsonWebTokenError'].includes(error.name)) {
    return res.status(401).json({
      message: error.message
    });
  }

  // mongoose Error, duplicate 409
  if (error.name === 'MongoError' && [11_000, 11_001].includes(error.code)) {
    const uniqueVal = Object.values(error.keyValue);

    // console.log(getUniqueErrorMessage(error))
    return res.status(409).json({ message: `${uniqueVal} already exist` });
  }

  return res
    .status(status)
    .json({ message: error.toString(), reason: errorReason });
};

module.exports = { errorHandler };
